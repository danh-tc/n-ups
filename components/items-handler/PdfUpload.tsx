"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import "./pdf-upload.scss";
import { listPdfIds, loadPdf, removePdf, savePdf } from "@/lib/uploadDb";
import { useImpositionStore } from "@/store/useImpositionStore";

/* ---------- Types only (no runtime import) ---------- */
type PDFDocumentProxy =
  import("pdfjs-dist/types/src/display/api").PDFDocumentProxy;

/* ---------- Guarded loader (client-only) ---------- */
let pdfjsModPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (pdfjsModPromise) return pdfjsModPromise;
  pdfjsModPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error("PDF.js can only load in the browser");
    }
    const mod = await import("pdfjs-dist");
    // Worker import has no type defs by default; keep it guarded + one-line expect.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error no declaration file for worker mjs
    await import("pdfjs-dist/build/pdf.worker.mjs");
    return mod;
  })();
  return pdfjsModPromise;
}

/** Page thumbnail with provenance (for per-file clear / mapping) */
export interface PdfPageImage {
  pageNumber: number; // 1-based
  width: string | number; // string is ok for CSS sizing
  height: string | number;
  dataUrl: string; // PNG data URL
  sourceFileId: string;
  sourcePageNumber: number;
}

export interface PdfUploadProps {
  onSelect: (file: File | null) => void;
  onApplyFront?: (page: PdfPageImage | null) => void;
  onApplyBack?: (page: PdfPageImage | null) => void;
  onAfterConvert?: (pages: PdfPageImage[], fileId: string) => void;
  onClearFile?: (fileId: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  initialFile?: File | null;
  renderScale?: number; // 1..4 (default 2)
  previewMaxPages?: number;
  duplex?: boolean;
}

/* ===== Helpers ===== */

const isPdf = (f: File): boolean =>
  f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

const toMB = (n: number): number => Number((n / (1024 * 1024)).toFixed(2));

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(Math.max(n, lo), hi);

const genId = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Render a PDF into PNG pages (returns all pages; caller enforces global cap). */
async function renderPdfToImages(
  file: File,
  scale = 2,
  previewMaxPages?: number
): Promise<{
  pages: {
    pageNumber: number;
    width: number;
    height: number;
    dataUrl: string;
  }[];
  numPages: number;
}> {
  const clamped = clamp(scale, 1, 4);

  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf: PDFDocumentProxy = await pdfjs.getDocument({ data }).promise;

  const numPages = pdf.numPages;
  const cap = previewMaxPages ? Math.min(previewMaxPages, numPages) : numPages;

  const out: {
    pageNumber: number;
    width: number;
    height: number;
    dataUrl: string;
  }[] = [];

  for (let i = 1; i <= cap; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await pdf.getPage(i);

    const cssViewport = page.getViewport({ scale: clamped });
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const renderViewport = page.getViewport({ scale: clamped * dpr });

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    canvas.style.width = `${Math.floor(cssViewport.width)}px`;
    canvas.style.height = `${Math.floor(cssViewport.height)}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    // eslint-disable-next-line no-await-in-loop
    await page.render({
      canvas, // required by TS RenderParameters (dom typings)
      canvasContext: ctx,
      viewport: renderViewport,
      background: "transparent",
    }).promise;

    out.push({
      pageNumber: i,
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL("image/png"),
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  return { pages: out, numPages };
}

/* ===== Component ===== */

type UploadedPdf = {
  fileId: string;
  fileName: string;
  pages: PdfPageImage[];
  pageCount: number;
};

const GLOBAL_PAGE_CAP = 2;

const PdfUpload: React.FC<PdfUploadProps> = ({
  onSelect,
  onApplyFront,
  onApplyBack,
  onAfterConvert,
  onClearFile,
  maxSizeMB = 50,
  disabled = false,
  className,
  initialFile = null,
  renderScale = 2,
  previewMaxPages,
  duplex = false,
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const [uploaded, setUploaded] = useState<UploadedPdf[]>([]);
  const [selected, setSelected] = useState<{
    fileId: string | null;
    pageIdx: number;
  }>({
    fileId: null,
    pageIdx: 0,
  });

  const totalPages = useMemo(
    () => uploaded.reduce((acc, f) => acc + f.pageCount, 0),
    [uploaded]
  );

  const selectedPage: PdfPageImage | null = useMemo(() => {
    if (!selected.fileId) return null;
    const f = uploaded.find((u) => u.fileId === selected.fileId);
    if (!f) return null;
    return f.pages[selected.pageIdx] ?? null;
  }, [selected.fileId, selected.pageIdx, uploaded]);

  // Guard: if slots already exist in store, don't auto-populate on hydrate
  const slotsExist = useMemo(() => {
    const s = useImpositionStore.getState();
    return s.frontSlots.some(Boolean) || s.backSlots.some(Boolean);
  }, []);

  const importFromDb = useCallback(
    async (fileId: string) => {
      const rec = await loadPdf(fileId); // { name, buf }
      if (!rec) return;

      const file = new File([rec.buf], rec.name ?? "source.pdf", {
        type: "application/pdf",
      });

      const { pages, numPages } = await renderPdfToImages(
        file,
        renderScale,
        previewMaxPages
      );

      const enriched: PdfPageImage[] = pages.map((p) => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        dataUrl: p.dataUrl,
        sourceFileId: fileId, // keep original id
        sourcePageNumber: p.pageNumber,
      }));

      const entry: UploadedPdf = {
        fileId,
        fileName: rec.name ?? "source.pdf",
        pages: enriched,
        pageCount: numPages,
      };

      setUploaded((prev) => [
        ...prev.filter((u) => u.fileId !== fileId),
        entry,
      ]);

      onAfterConvert?.(enriched, fileId);
    },
    [onAfterConvert, previewMaxPages, renderScale]
  );

  const validateMany = useCallback(
    (picked: FileList | null): File[] => {
      setError(null);
      if (!picked || picked.length === 0) return [];
      const files: File[] = [];
      for (let i = 0; i < picked.length; i += 1) {
        const f = picked[i]!;
        if (!isPdf(f)) {
          setError(`Please choose PDF files only. "${f.name}" is not a PDF.`);
          continue;
        }
        if (toMB(f.size) > maxSizeMB) {
          setError(`"${f.name}" exceeds ${maxSizeMB} MB.`);
          continue;
        }
        files.push(f);
      }
      return files;
    },
    [maxSizeMB]
  );

  const importOneFile = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const { pages, numPages } = await renderPdfToImages(
          file,
          renderScale,
          previewMaxPages
        );

        const newTotal = totalPages + numPages;
        if (newTotal > GLOBAL_PAGE_CAP) {
          throw new Error(
            `You can upload up to ${GLOBAL_PAGE_CAP} total pages across all PDFs. "${file.name}" has ${numPages} page(s), which would exceed the limit (current total: ${totalPages}).`
          );
        }

        const fileId = genId();
        await savePdf(fileId, file);
        const enriched: PdfPageImage[] = pages.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          dataUrl: p.dataUrl,
          sourceFileId: fileId,
          sourcePageNumber: p.pageNumber,
        }));

        const entry: UploadedPdf = {
          fileId,
          fileName: file.name,
          pages: enriched,
          pageCount: numPages,
        };

        setUploaded((prev) => [...prev, entry]);
        setSelected({ fileId, pageIdx: 0 });

        onSelect(file);
        onAfterConvert?.(enriched, fileId);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to read the PDF.";
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [onAfterConvert, onSelect, previewMaxPages, renderScale, totalPages]
  );

  const clearOneFile = useCallback(
    async (fileId: string) => {
      setBusy(true);
      try {
        await removePdf(fileId);
      } finally {
        setUploaded((prev) => prev.filter((f) => f.fileId !== fileId));
        onClearFile?.(fileId);
        setSelected((sel) =>
          sel.fileId === fileId ? { fileId: null, pageIdx: 0 } : sel
        );
        if (uploaded.length <= 1) onSelect(null);
        setBusy(false);
      }
    },
    [onClearFile, onSelect, uploaded.length]
  );

  const clearAllFiles = useCallback(async () => {
    setBusy(true);
    const ids = uploaded.map((u) => u.fileId);
    try {
      await Promise.allSettled(ids.map((id) => removePdf(id)));
    } finally {
      setUploaded([]);
      setSelected({ fileId: null, pageIdx: 0 });
      ids.forEach((id) => onClearFile?.(id));
      onSelect(null);
      setBusy(false);
    }
  }, [uploaded, onClearFile, onSelect]);

  const onInputChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    async (e) => {
      if (disabled) return;
      const files = validateMany(e.target.files);
      if (files.length === 0) return;

      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        await importOneFile(f);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [disabled, importOneFile, validateMany]
  );

  const onDrop = useCallback<React.DragEventHandler<HTMLLabelElement>>(
    async (e) => {
      e.preventDefault();
      if (disabled) return;
      setIsOver(false);
      const files = validateMany(e.dataTransfer.files);
      if (files.length === 0) return;
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        await importOneFile(f);
      }
    },
    [disabled, importOneFile, validateMany]
  );

  const onDragOver = useCallback<React.DragEventHandler<HTMLLabelElement>>(
    (e) => {
      e.preventDefault();
      if (disabled) return;
      setIsOver(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback<React.DragEventHandler<HTMLLabelElement>>(
    (e) => {
      e.preventDefault();
      setIsOver(false);
    },
    []
  );

  // Hydrate from IndexedDB on mount (skip if slots already exist)
  // Hydrate from IndexedDB on mount (always re-apply → full sheet gets filled)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const ids = await listPdfIds();
        for (const id of ids) {
          if (cancelled) break;
          // eslint-disable-next-line no-await-in-loop
          await importFromDb(id); // calls onAfterConvert → ItemsHandler replicates whole sheet
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importFromDb, setBusy]);

  return (
    <div className={["rethink-upload", className ?? ""].join(" ").trim()}>
      {/* Dropzone */}
      <label
        htmlFor={inputId}
        className={[
          "rethink-upload__drop",
          disabled ? "rethink-upload__drop--disabled" : "",
          isOver ? "rethink-upload__drop--over" : "",
        ]
          .join(" ")
          .trim()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        aria-disabled={disabled || busy}
      >
        <div className="rethink-upload__content">
          <strong className="rethink-upload__title">
            {busy ? "Processing…" : "Upload PDF(s)"}
          </strong>
          <span className="rethink-upload__hint">
            PDF only · total pages across all uploads ≤ {GLOBAL_PAGE_CAP}
          </span>
          <span className="rethink-upload__sub">Max {maxSizeMB} MB each</span>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          className="rethink-upload__input"
          type="file"
          accept="application/pdf"
          multiple
          disabled={disabled || busy}
          onChange={onInputChange}
        />
      </label>

      {/* Error */}
      {error && (
        <p className="rethink-upload__error" role="alert">
          {error}
        </p>
      )}

      {/* Uploaded files list */}
      {uploaded.length > 0 && (
        <div className="rethink-upload__files">
          <div className="rethink-upload__files-head">
            <span className="rethink-upload__files-count">
              Total pages: {totalPages} / {GLOBAL_PAGE_CAP}
            </span>
            <button
              type="button"
              className="rethink-btn rethink-btn--outline rethink-btn--sm"
              onClick={clearAllFiles}
              aria-label="Clear all uploaded PDFs"
              title="Remove all PDFs and clear all slots"
            >
              Clear All PDFs
            </button>
          </div>

          {uploaded.map((f) => (
            <div key={f.fileId} className="rethink-upload__file">
              <div className="rethink-upload__file-head">
                <div className="rethink-upload__file-meta">
                  <span className="rethink-upload__filename" title={f.fileName}>
                    {f.fileName}
                  </span>
                  <span className="rethink-upload__filepages">
                    {f.pageCount} page{f.pageCount > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="rethink-upload__file-actions">
                  <button
                    type="button"
                    className="rethink-btn rethink-btn--outline rethink-btn--sm"
                    onClick={() => clearOneFile(f.fileId)}
                    aria-label={`Clear ${f.fileName}`}
                    title="Remove this PDF and its slots"
                  >
                    Clear PDF
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              {f.pages.length > 0 && (
                <div className="rethink-upload__preview" aria-live="polite">
                  {f.pages.map((p, idx) => {
                    const isActive =
                      selected.fileId === f.fileId && selected.pageIdx === idx;
                    return (
                      <button
                        key={`${f.fileId}-${p.pageNumber}`}
                        type="button"
                        className={[
                          "rethink-upload__thumb",
                          isActive ? "rethink-upload__thumb--active" : "",
                        ]
                          .join(" ")
                          .trim()}
                        onClick={() =>
                          setSelected({ fileId: f.fileId, pageIdx: idx })
                        }
                        title={`Page ${p.pageNumber}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.dataUrl} alt={`Page ${p.pageNumber}`} />
                        <span className="rethink-upload__thumb-label">
                          P{p.pageNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Apply actions for selected page */}
      {selectedPage && (
        <div className="rethink-upload__actions">
          <button
            type="button"
            className="rethink-btn rethink-btn--primary rethink-btn--md"
            onClick={() => onApplyFront?.(selectedPage)}
          >
            Apply to front side
          </button>
          <button
            type="button"
            className="rethink-btn rethink-btn--md"
            onClick={() => onApplyBack?.(selectedPage)}
            disabled={!duplex}
            title={
              duplex ? "Apply to back side" : "Enable duplex to apply back"
            }
          >
            Apply to back side
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfUpload;
