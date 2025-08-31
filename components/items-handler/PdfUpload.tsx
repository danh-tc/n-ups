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
import {
  listPdfIds,
  loadPdf,
  removePdf,
  savePdf,
  upsertPreviews,
  loadPreviews,
  removePreviews,
  type PreviewPage,
} from "@/lib/uploadDb";
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
  width: string | number;
  height: string | number;
  dataUrl: string;
  sourceFileId: string;
  sourcePageNumber: number;
  rotationDeg?: number;
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
  renderScale?: number;
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

/** Render a PDF into PNG pages */
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

  for (let i = 1; i <= cap; i++) {
    // eslint-disable-next-line no-await-in-loop
    const page = await pdf.getPage(i);
    const cssViewport = page.getViewport({ scale: clamped });
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const renderViewport = page.getViewport({ scale: clamped * dpr });

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
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

  // === new: bring in selection setters
  const setFrontSelection = useImpositionStore((s) => s.setFrontSelection);
  const setBackSelection = useImpositionStore((s) => s.setBackSelection);

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

  const slotsExist = useMemo(() => {
    const s = useImpositionStore.getState();
    return s.frontSlots.some(Boolean) || s.backSlots.some(Boolean);
  }, []);

  const importFromDb = useCallback(
    async (fileId: string) => {
      const cached = await loadPreviews(fileId);
      if (cached.length > 0) {
        const enrichedFromCache: PdfPageImage[] = cached.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          dataUrl: p.dataUrl,
          sourceFileId: fileId,
          sourcePageNumber: p.pageNumber,
          rotationDeg: p.rotationDeg ?? 0,
        }));
        const entryFromCache: UploadedPdf = {
          fileId,
          fileName: (await loadPdf(fileId))?.name ?? "source.pdf",
          pages: enrichedFromCache,
          pageCount: cached.length,
        };
        setUploaded((prev) => [
          ...prev.filter((u) => u.fileId !== fileId),
          entryFromCache,
        ]);

        if (!slotsExist) {
          onAfterConvert?.(enrichedFromCache, fileId);
          if (enrichedFromCache.length >= 1)
            setFrontSelection({ fileId, pageNumber: 1 });
          if (duplex && enrichedFromCache.length >= 2)
            setBackSelection({ fileId, pageNumber: 2 });
        }
        return;
      }

      const rec = await loadPdf(fileId);
      if (!rec) return;
      const file = new File([rec.buf], rec.name ?? "source.pdf", {
        type: "application/pdf",
      });
      const { pages, numPages } = await renderPdfToImages(
        file,
        renderScale,
        previewMaxPages
      );

      const toPersist: PreviewPage[] = pages.map((p) => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        dataUrl: p.dataUrl,
        rotationDeg: 0,
      }));
      await upsertPreviews(fileId, toPersist);

      const enriched: PdfPageImage[] = toPersist.map((p) => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        dataUrl: p.dataUrl,
        sourceFileId: fileId,
        sourcePageNumber: p.pageNumber,
        rotationDeg: 0,
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

      if (!slotsExist) {
        onAfterConvert?.(enriched, fileId);
        if (enriched.length >= 1) setFrontSelection({ fileId, pageNumber: 1 });
        if (duplex && enriched.length >= 2)
          setBackSelection({ fileId, pageNumber: 2 });
      }
    },
    [
      onAfterConvert,
      previewMaxPages,
      renderScale,
      slotsExist,
      setFrontSelection,
      setBackSelection,
      duplex,
    ]
  );

  const validateMany = useCallback(
    (picked: FileList | null): File[] => {
      setError(null);
      if (!picked || picked.length === 0) return [];
      const files: File[] = [];
      for (let i = 0; i < picked.length; i++) {
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
        if (newTotal > GLOBAL_PAGE_CAP)
          throw new Error(
            `You can upload up to ${GLOBAL_PAGE_CAP} total pages.`
          );

        const fileId = genId();
        await savePdf(fileId, file);

        const toPersist: PreviewPage[] = pages.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          dataUrl: p.dataUrl,
          rotationDeg: 0,
        }));
        await upsertPreviews(fileId, toPersist);

        const enriched: PdfPageImage[] = toPersist.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          dataUrl: p.dataUrl,
          sourceFileId: fileId,
          sourcePageNumber: p.pageNumber,
          rotationDeg: 0,
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
        if (enriched.length >= 1) setFrontSelection({ fileId, pageNumber: 1 });
        if (duplex && enriched.length >= 2)
          setBackSelection({ fileId, pageNumber: 2 });
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to read the PDF.");
      } finally {
        setBusy(false);
      }
    },
    [
      onAfterConvert,
      onSelect,
      previewMaxPages,
      renderScale,
      totalPages,
      setFrontSelection,
      setBackSelection,
      duplex,
    ]
  );

  const clearOneFile = useCallback(
    async (fileId: string) => {
      setBusy(true);
      try {
        await Promise.allSettled([removePdf(fileId), removePreviews(fileId)]);
      } finally {
        setUploaded((prev) => prev.filter((f) => f.fileId !== fileId));
        onClearFile?.(fileId);
        setSelected((sel) =>
          sel.fileId === fileId ? { fileId: null, pageIdx: 0 } : sel
        );
        if (uploaded.length <= 1) onSelect(null);
        setFrontSelection(null);
        setBackSelection(null);
        setBusy(false);
      }
    },
    [
      onClearFile,
      onSelect,
      uploaded.length,
      setFrontSelection,
      setBackSelection,
    ]
  );

  const clearAllFiles = useCallback(async () => {
    setBusy(true);
    const ids = uploaded.map((u) => u.fileId);
    try {
      await Promise.allSettled([
        ...ids.map((id) => removePdf(id)),
        ...ids.map((id) => removePreviews(id)),
      ]);
    } finally {
      setUploaded([]);
      setSelected({ fileId: null, pageIdx: 0 });
      ids.forEach((id) => onClearFile?.(id));
      onSelect(null);
      setFrontSelection(null);
      setBackSelection(null);
      setBusy(false);
    }
  }, [uploaded, onClearFile, onSelect, setFrontSelection, setBackSelection]);

  // Hydrate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const ids = await listPdfIds();
        for (const id of ids) {
          if (cancelled) break;
          await importFromDb(id);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importFromDb]);

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
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) {
            setIsOver(false);
            const files = validateMany(e.dataTransfer.files);
            files.forEach((f) => importOneFile(f));
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsOver(false);
        }}
        aria-disabled={disabled || busy}
      >
        <div className="rethink-upload__content">
          <strong className="rethink-upload__title">
            {busy ? "Processing…" : "Upload PDF(s)"}
          </strong>
          <span className="rethink-upload__hint">
            PDF only · total pages ≤ {GLOBAL_PAGE_CAP}
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
          onChange={(e) => {
            const files = validateMany(e.target.files);
            files.forEach((f) => importOneFile(f));
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </label>

      {error && (
        <p className="rethink-upload__error" role="alert">
          {error}
        </p>
      )}

      {/* Uploaded files list */}
      {uploaded.length > 0 && (
        <div className="rethink-upload__files">
          <div className="rethink-upload__files-head">
            <span>
              Total pages: {totalPages} / {GLOBAL_PAGE_CAP}
            </span>
            <button
              type="button"
              className="rethink-btn rethink-btn--outline rethink-btn--sm"
              onClick={clearAllFiles}
              title="Remove all PDFs"
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
                  <span>
                    {f.pageCount} page{f.pageCount > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="rethink-upload__file-actions">
                  <button
                    type="button"
                    className="rethink-btn rethink-btn--outline rethink-btn--sm"
                    onClick={() => clearOneFile(f.fileId)}
                  >
                    Clear PDF
                  </button>
                </div>
              </div>
              {f.pages.length > 0 && (
                <div className="rethink-upload__preview">
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
                        <img src={p.dataUrl} alt={`Page ${p.pageNumber}`} />
                        <span>P{p.pageNumber}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPage && (
        <div className="rethink-upload__actions">
          <button
            type="button"
            className="rethink-btn rethink-btn--primary rethink-btn--md"
            onClick={() => {
              onApplyFront?.(selectedPage);
              setFrontSelection({
                fileId: selectedPage.sourceFileId,
                pageNumber: selectedPage.pageNumber,
              });
            }}
          >
            Apply to front side
          </button>
          <button
            type="button"
            className="rethink-btn rethink-btn--md"
            onClick={() => {
              onApplyBack?.(selectedPage);
              setBackSelection({
                fileId: selectedPage.sourceFileId,
                pageNumber: selectedPage.pageNumber,
              });
            }}
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
