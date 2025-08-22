"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import "./pdf-upload.scss";

/* pdf.js */
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
/* Let bundlers pick the worker automatically */
import "pdfjs-dist/build/pdf.worker.mjs";

export interface PdfPageImage {
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string; // PNG data URL
}

export interface PdfUploadProps {
  onSelect: (file: File | null) => void; // single PDF or null
  onApplyFront?: (page: PdfPageImage | null) => void;
  onApplyBack?: (page: PdfPageImage | null) => void;
  maxSizeMB?: number; // default 50
  disabled?: boolean;
  className?: string;
  initialFile?: File | null;
  renderScale?: number;
  previewMaxPages?: number;
}

const isPdf = (f: File): boolean =>
  f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

const toMB = (n: number): number => Number((n / (1024 * 1024)).toFixed(2));

async function pdfFileToImages(
  file: File,
  scale = 2,
  maxPages?: number
): Promise<PdfPageImage[]> {
  const clamped: number = Math.min(Math.max(scale, 1), 4);
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf: PDFDocumentProxy = await getDocument({ data }).promise;

  const count: number = Math.min(pdf.numPages, maxPages ?? pdf.numPages);
  const pages: PdfPageImage[] = [];

  for (let i = 1; i <= count; i += 1) {
    const page = await pdf.getPage(i);

    // Logical viewport for CSS sizing
    const viewport = page.getViewport({ scale: clamped });

    // DPR-aware render for sharp thumbnails
    const dpr: number = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const renderViewport = page.getViewport({ scale: clamped * dpr });

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    // Provide BOTH fields to satisfy RenderParameters typings variant
    await page.render({
      canvas: canvas,
      canvasContext: ctx,
      viewport: renderViewport,
      background: "transparent",
    }).promise;

    pages.push({
      pageNumber: i,
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL("image/png"),
    });

    // cleanup
    canvas.width = 0;
    canvas.height = 0;
  }
  return pages;
}

const PdfUpload: React.FC<PdfUploadProps> = ({
  onSelect,
  onApplyFront,
  onApplyBack,
  maxSizeMB = 50,
  disabled = false,
  className,
  initialFile = null,
  renderScale = 2,
  previewMaxPages,
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(initialFile);
  const [error, setError] = useState<string | null>(null);
  const [isOver, setIsOver] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const selectedPage: PdfPageImage | null = pages[selectedIdx] ?? null;

  const setOne = useCallback(
    (f: File | null): void => {
      setFile(f);
      setPages([]);
      setSelectedIdx(0);
      setError(null);
      onSelect(f);
    },
    [onSelect]
  );

  const validateOne = useCallback(
    (picked: FileList | null): File | null => {
      setError(null);
      if (!picked || picked.length === 0) return null;
      const f = picked[0];
      if (!isPdf(f)) {
        setError("Please choose a PDF file.");
        return null;
      }
      if (toMB(f.size) > maxSizeMB) {
        setError(`"${f.name}" exceeds ${maxSizeMB} MB.`);
        return null;
      }
      return f;
    },
    [maxSizeMB]
  );

  const convert = useCallback(
    async (f: File): Promise<void> => {
      setBusy(true);
      try {
        const imgs = await pdfFileToImages(f, renderScale, previewMaxPages);
        setPages(imgs);
        setSelectedIdx(0);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError("Failed to convert PDF.");
        setPages([]);
      } finally {
        setBusy(false);
      }
    },
    [previewMaxPages, renderScale]
  );

  const onInputChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    async (e) => {
      if (disabled) return;
      const f = validateOne(e.target.files);
      if (!f) return;
      setOne(f);
      await convert(f);
    },
    [convert, disabled, setOne, validateOne]
  );

  const onDrop = useCallback<React.DragEventHandler<HTMLLabelElement>>(
    async (e) => {
      e.preventDefault();
      if (disabled) return;
      setIsOver(false);
      const f = validateOne(e.dataTransfer.files);
      if (!f) return;
      setOne(f);
      await convert(f);
    },
    [convert, disabled, setOne, validateOne]
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

  const clear = useCallback((): void => {
    setFile(null);
    setPages([]);
    setSelectedIdx(0);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onSelect(null);
  }, [onSelect]);

  return (
    <div className={["rethink-upload", className ?? ""].join(" ").trim()}>
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
            {busy ? "Processing…" : file ? "Change PDF" : "Upload PDF"}
          </strong>
          <span className="rethink-upload__hint">Select a single PDF</span>
          <span className="rethink-upload__sub">Max {maxSizeMB} MB</span>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          className="rethink-upload__input"
          type="file"
          accept="application/pdf"
          multiple={false}
          disabled={disabled || busy}
          onChange={onInputChange}
        />
      </label>

      {error && (
        <p className="rethink-upload__error" role="alert">
          {error}
        </p>
      )}

      {/* Thumbnails */}
      {pages.length > 0 && (
        <div className="rethink-upload__preview" aria-live="polite">
          {pages.map((p, i) => (
            <button
              key={p.pageNumber}
              type="button"
              className={[
                "rethink-upload__thumb",
                i === selectedIdx ? "rethink-upload__thumb--active" : "",
              ]
                .join(" ")
                .trim()}
              onClick={(): void => setSelectedIdx(i)}
              title={`Page ${p.pageNumber}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt={`Page ${p.pageNumber}`} />
              <span className="rethink-upload__thumb-label">
                P{p.pageNumber}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* File info + clear */}
      {file && (
        <div className="rethink-upload__info" aria-live="polite">
          <span className="rethink-upload__filename" title={file.name}>
            {file.name}
          </span>
          <span className="rethink-upload__filesize">{toMB(file.size)} MB</span>
          <button
            type="button"
            className="rethink-btn rethink-btn--outline rethink-btn--sm"
            onClick={clear}
            aria-label="Clear selected PDF"
          >
            Clear
          </button>
        </div>
      )}

      {/* Apply actions */}
      {selectedPage && (
        <div className="rethink-upload__actions">
          <button
            type="button"
            className="rethink-btn rethink-btn--primary rethink-btn--md"
            onClick={(): void => onApplyFront?.(selectedPage)}
          >
            Apply to front side
          </button>
          <button
            type="button"
            className="rethink-btn rethink-btn--md"
            onClick={(): void => onApplyBack?.(selectedPage)}
          >
            Apply to back side
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfUpload;
