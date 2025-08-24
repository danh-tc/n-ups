"use client";

import "./items-handler.scss";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PaperPreview } from "../layout/PaperPreview";
import { computeLayout } from "@/lib/imposition";
import { useImpositionStore } from "@/store/useImpositionStore";
import { useHydrated } from "@/hooks/useImpositionHydrated";
import { UploadedImage } from "@/types/types";
import { exportImpositionPdf } from "@/lib/exportImpositionPdf";
import { autoCoverCrop } from "@/lib/autoCoverCrop";
import { rotateIfNeeded } from "@/lib/rotateIfNeeded";
import ExportQueueDrawer from "./ExportQueueDrawer";
import { useExportQueueStore } from "@/store/useExportQueueStore";
import FullScreenBrandedLoader from "../layout/FullScreenLoader";
import { useLoadingTask } from "@/hooks/useLoadingTask";
import PdfUpload, { type PdfPageImage } from "./PdfUpload";
import type { JSX } from "react";

/** Rotate a dataURL 90deg clockwise */
async function rotateDataUrl90(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = (e) => rej(e);
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.height;
  canvas.height = img.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return canvas.toDataURL("image/png");
}

export default function ItemsHandler(): JSX.Element | null {
  // Front / Back sheets
  const [images, setImages] = useState<(UploadedImage | undefined)[]>([]);
  const [backImages, setBackImages] = useState<(UploadedImage | undefined)[]>(
    []
  );

  const image = useImpositionStore((s) => s.image);
  const paper = useImpositionStore((s) => s.paper);
  const meta = useImpositionStore((s) => s.meta);
  const displayMeta = useImpositionStore((s) => s.displayMeta);
  const duplex = useImpositionStore((s) => s.paper.duplex ?? false);

  const { isLoading, runWithLoading } = useLoadingTask();

  // Single source of truth for layout (accounts for margins + cut marks)
  const layout = useMemo(() => computeLayout(paper, image), [paper, image]);
  const slotsPerSheet = layout.rows * layout.cols;

  const ensureCapacity = useCallback(
    (arr: (UploadedImage | undefined)[]): (UploadedImage | undefined)[] => {
      if (arr.length === slotsPerSheet) return arr;
      if (arr.length > slotsPerSheet) return arr.slice(0, slotsPerSheet);
      return [...arr, ...Array(slotsPerSheet - arr.length).fill(undefined)];
    },
    [slotsPerSheet]
  );

  useEffect(() => {
    setImages((prev) => ensureCapacity(prev));
    setBackImages((prev) => ensureCapacity(prev));
  }, [ensureCapacity]);

  const hasAnyFront = useMemo(() => images.some(Boolean), [images]);
  const hasAnyBack = useMemo(() => backImages.some(Boolean), [backImages]);
  const hasAnyImage = hasAnyFront || hasAnyBack;

  // ===== Export Queue =====
  const queueItems = useExportQueueStore((s) => s.items);
  const hydrateQueue = useExportQueueStore((s) => s.hydrate);
  const addToQueue = useExportQueueStore((s) => s.add);
  const removeFromQueue = useExportQueueStore((s) => s.remove);
  const clearQueue = useExportQueueStore((s) => s.clear);
  const moveQueue = useExportQueueStore((s) => s.move);
  const exportAllQueued = useExportQueueStore((s) => s.exportAll);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  useEffect(() => {
    hydrateQueue();
  }, [hydrateQueue]);

  // ===== Build UploadedImage from PdfPageImage (auto-rotate + cover-crop) =====
  const makeUploadedFromPage = useCallback(
    async (page: PdfPageImage): Promise<UploadedImage> => {
      const slotW = image.width;
      const slotH = image.height;

      const orientedSrc = await rotateIfNeeded(page.dataUrl, slotW, slotH, 300);
      const { dataUrl: autoUrl } = await autoCoverCrop(
        orientedSrc,
        { width: slotW, height: slotH },
        300,
        { type: "image/png" },
        image.margin
      );

      return {
        originalSrc: orientedSrc,
        src: autoUrl,
        name: `PDF page ${page.pageNumber}.png`,
        file: undefined,
        sourceFileId: page.sourceFileId,
        sourcePageNumber: page.sourcePageNumber,
      };
    },
    [image.height, image.margin, image.width]
  );

  const replicatePageToSide = useCallback(
    async (side: "front" | "back", page: PdfPageImage) => {
      const ui = await makeUploadedFromPage(page);
      const filled: (UploadedImage | undefined)[] = Array(slotsPerSheet)
        .fill(null)
        .map(() => ({ ...ui }));
      if (side === "front") setImages(filled);
      else setBackImages(filled);
    },
    [makeUploadedFromPage, slotsPerSheet]
  );

  // ===== Uploader hooks =====
  const handleAfterConvert = useCallback(
    async (pages: PdfPageImage[], _fileId: string) => {
      if (pages.length >= 1) await replicatePageToSide("front", pages[0]);
      if (duplex && pages.length >= 2)
        await replicatePageToSide("back", pages[1]);
    },
    [duplex, replicatePageToSide]
  );

  // Per-file clear: wipe only slots from that fileId
  const handleClearFile = useCallback(
    (fileId: string) => {
      setImages((prev) =>
        ensureCapacity(prev).map((itm) =>
          itm && itm.sourceFileId === fileId ? undefined : itm
        )
      );
      setBackImages((prev) =>
        ensureCapacity(prev).map((itm) =>
          itm && itm.sourceFileId === fileId ? undefined : itm
        )
      );
    },
    [ensureCapacity]
  );

  // Manual Apply buttons
  const handleApplyFront = useCallback(
    async (page: PdfPageImage | null) => {
      if (!page) return;
      await replicatePageToSide("front", page);
    },
    [replicatePageToSide]
  );

  const handleApplyBack = useCallback(
    async (page: PdfPageImage | null) => {
      if (!page) return;
      await replicatePageToSide("back", page);
    },
    [replicatePageToSide]
  );

  // ===== Rotate per sheet (90°) with cover-crop =====
  const rotateSheet = useCallback(
    async (side: "front" | "back") => {
      const srcArr = side === "front" ? images : backImages;
      const rotated = await Promise.all(
        ensureCapacity(srcArr).map(async (itm) => {
          if (!itm) return undefined;
          const rotatedSrc = await rotateDataUrl90(itm.originalSrc);
          const { dataUrl: autoUrl, crop } = await autoCoverCrop(
            rotatedSrc,
            { width: image.width, height: image.height },
            300,
            { type: "image/png" },
            image.margin
          );
          return { ...itm, originalSrc: rotatedSrc, src: autoUrl, crop };
        })
      );
      if (side === "front") setImages(rotated);
      else setBackImages(rotated);
    },
    [
      backImages,
      ensureCapacity,
      image.height,
      image.margin,
      image.width,
      images,
    ]
  );

  // ===== Clear controls =====
  const clearFront = useCallback(() => {
    setImages(Array(slotsPerSheet).fill(undefined));
  }, [slotsPerSheet]);

  const clearBack = useCallback(() => {
    setBackImages(Array(slotsPerSheet).fill(undefined));
  }, [slotsPerSheet]);

  const clearBoth = useCallback(() => {
    setImages(Array(slotsPerSheet).fill(undefined));
    setBackImages(Array(slotsPerSheet).fill(undefined));
  }, [slotsPerSheet]);

  // ===== Export (front only for now) =====
  const buildCurrentPdfBytes = async () => {
    const sheets = [ensureCapacity(images)];
    const pdfBytes = await exportImpositionPdf({
      paper,
      image,
      sheets,
      layout: { rows: layout.rows, cols: layout.cols }, // narrow type
      customerName: meta.customerName,
      description: meta.description,
      displayMeta,
      date: meta.date,
      cutMarkLengthMm: 6,
      cutMarkThicknessPt: 0.7,
      cutMarkColor: { r: 0, g: 0, b: 0 },
    });
    return pdfBytes;
  };

  const handleExportPdf = () => {
    if (!hasAnyImage) return;
    return runWithLoading(async () => {
      const pdfBytes = await buildCurrentPdfBytes();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });
  };

  const handleAddToExportList = () =>
    runWithLoading(async () => {
      if (!hasAnyFront) return;
      const pdfBytes = await buildCurrentPdfBytes();
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfBytes);
      const pageCount = doc.getPageCount();
      const name = meta.customerName?.trim() || `Job ${queueItems.length + 1}`;
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      await addToQueue(name, pageCount, blob);
      setIsQueueOpen(true);
    });

  const handleExportAll = () =>
    runWithLoading(async () => {
      const merged = await exportAllQueued();
      if (!merged) return;
      const blob = new Blob([merged], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });

  const hydrated = useHydrated();
  if (!hydrated) return null;

  const queueView = queueItems.map((i) => ({
    id: i.id,
    name: i.name,
    pageCount: i.pageCount,
    createdAt: i.createdAt,
  }));

  return (
    <div className="rethink-items rethink-container">
      {/* PDF uploader (multi-file, per-file clear, auto-apply) */}
      <PdfUpload
        maxSizeMB={50}
        renderScale={2}
        previewMaxPages={12}
        duplex={duplex}
        onSelect={() => {}}
        onAfterConvert={handleAfterConvert}
        onClearFile={handleClearFile}
        onApplyFront={handleApplyFront}
        onApplyBack={handleApplyBack}
      />

      {/* Toolbar */}
      <div className="rethink-toolbar">
        <div className="rethink-toolbar__left">
          <div className="rethink-status-line">
            Slots: {slotsPerSheet} · {paper.width}×{paper.height}mm · Gap{" "}
            {paper.gap.horizontal}/{paper.gap.vertical}mm · Margin{" "}
            {paper.margin.top}/{paper.margin.right}/{paper.margin.bottom}/
            {paper.margin.left}mm {duplex ? "· Duplex" : ""}
          </div>
        </div>
        <div className="rethink-toolbar__right">
          <button
            className="rethink-btn rethink-btn--sm"
            onClick={clearBoth}
            title="Clear both sheets"
          >
            Clear Both
          </button>
          <button
            className="rethink-btn rethink-btn--outline rethink-btn--sm"
            onClick={() => setIsQueueOpen((v) => !v)}
            aria-pressed={isQueueOpen}
            title="Open Export List"
          >
            Queue ({queueItems.length})
          </button>
          <button
            className="rethink-btn rethink-btn--outline rethink-btn--md"
            onClick={handleAddToExportList}
            disabled={!hasAnyFront}
            title={
              hasAnyFront
                ? "Generate current PDF and add to export list"
                : "Add at least one front image to enable"
            }
          >
            Add to Export List
          </button>
          <button
            className="rethink-btn rethink-btn--primary rethink-btn--md"
            onClick={handleExportPdf}
            disabled={!hasAnyImage}
            title={
              hasAnyImage
                ? "Export current job"
                : "Add at least one image to enable"
            }
          >
            Export Current
          </button>
          <button
            className="rethink-btn rethink-btn--outline rethink-btn--md"
            onClick={handleExportAll}
            disabled={!queueItems.length}
            title="Merge all queued PDFs into one file"
          >
            Export All
          </button>
        </div>
      </div>

      {/* FRONT */}
      <div className="rethink-paper">
        <div className="rethink-paper__head">
          <div className="rethink-paper__chip">Front side</div>
          <div className="rethink-paper__actions">
            <button
              className="rethink-btn rethink-btn--sm"
              onClick={() => rotateSheet("front")}
              disabled={!hasAnyFront}
              title="Rotate front sheet 90°"
            >
              Rotate Front
            </button>
            <button
              className="rethink-btn rethink-btn--sm"
              onClick={clearFront}
              title="Clear front sheet"
            >
              Clear Front
            </button>
          </div>
        </div>

        <PaperPreview
          paper={paper}
          image={image}
          customerName={meta.customerName}
          description={meta.description}
          images={ensureCapacity(images)}
          date={meta.date}
        />
      </div>

      {/* BACK */}
      {duplex && (
        <div className="rethink-paper">
          <div className="rethink-paper__head">
            <div className="rethink-paper__chip">Back side</div>
            <div className="rethink-paper__actions">
              <button
                className="rethink-btn rethink-btn--sm"
                onClick={() => rotateSheet("back")}
                disabled={!hasAnyBack}
                title="Rotate back sheet 90°"
              >
                Rotate Back
              </button>
              <button
                className="rethink-btn rethink-btn--sm"
                onClick={clearBack}
                title="Clear back sheet"
              >
                Clear Back
              </button>
            </div>
          </div>

          <PaperPreview
            paper={paper}
            image={image}
            customerName={meta.customerName}
            description={meta.description}
            images={ensureCapacity(backImages)}
            date={meta.date}
          />
        </div>
      )}

      <ExportQueueDrawer
        open={isQueueOpen}
        items={queueView}
        onClose={() => setIsQueueOpen(false)}
        onExportAll={handleExportAll}
        onClear={clearQueue}
        onMove={moveQueue}
        onRemove={removeFromQueue}
      />

      <FullScreenBrandedLoader
        open={isLoading}
        text="Please wait a moment. We are currently processing your request."
        backdropColor="#fff"
        textColor="#3a3a3a"
        dotColor="#b8864d"
      />
    </div>
  );
}
