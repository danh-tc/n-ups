"use client";

import "./items-handler.scss";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type JSX,
} from "react";
import { PaperPreview } from "../layout/PaperPreview";
import { computeLayout } from "@/lib/imposition";
import { useImpositionStore } from "@/store/useImpositionStore";
import { useHydrated } from "@/hooks/useImpositionHydrated";
import type { UploadedImage } from "@/types/types";
import { exportImpositionPdf } from "@/lib/exportImpositionPdf";
import ExportQueueDrawer from "./ExportQueueDrawer";
import { useExportQueueStore } from "@/store/useExportQueueStore";
import FullScreenBrandedLoader from "../layout/FullScreenLoader";
import { useLoadingTask } from "@/hooks/useLoadingTask";
import PdfUpload, { type PdfPageImage } from "./PdfUpload";

/** Rotate a dataURL 90deg clockwise (pre-encode to avoid seams) */
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
  // Config from store
  const paper = useImpositionStore((s) => s.paper);
  const image = useImpositionStore((s) => s.image);
  const meta = useImpositionStore((s) => s.meta);
  const displayMeta = useImpositionStore((s) => s.displayMeta);
  const duplex = useImpositionStore((s) => s.paper.duplex ?? false);

  // Slots from store
  const frontSlots = useImpositionStore((s) => s.frontSlots);
  const backSlots = useImpositionStore((s) => s.backSlots);
  const setFrontSlots = useImpositionStore((s) => s.setFrontSlots);
  const setBackSlots = useImpositionStore((s) => s.setBackSlots);
  const ensureCapacityStore = useImpositionStore((s) => s.ensureCapacity);
  const clearByFileId = useImpositionStore((s) => s.clearByFileId);

  const { isLoading, runWithLoading } = useLoadingTask();

  // Layout
  const layout = useMemo(() => computeLayout(paper, image), [paper, image]);
  const slotsPerSheet = layout.rows * layout.cols;

  // Keep slot arrays sized to layout
  useEffect(() => {
    ensureCapacityStore(slotsPerSheet);
  }, [ensureCapacityStore, slotsPerSheet]);

  const hasAnyFront = useMemo(() => frontSlots.some(Boolean), [frontSlots]);
  const hasAnyBack = useMemo(() => backSlots.some(Boolean), [backSlots]);
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

  // ===== Create UploadedImage from a PdfPageImage =====
  // Auto-rotate once if slot orientation differs (portrait vs landscape).
  const makeUploadedFromPage = useCallback(
    async (p: PdfPageImage): Promise<UploadedImage> => {
      const slotLandscape = image.width >= image.height;
      const pageLandscape = p.width >= p.height;

      let dataUrl = p.dataUrl;
      let rotationDeg = 0;

      if (slotLandscape !== pageLandscape) {
        dataUrl = await rotateDataUrl90(p.dataUrl); // pre-encode, avoids seams
        rotationDeg = 90;
      }

      return {
        originalSrc: dataUrl,
        src: dataUrl,
        name: `PDF page ${p.pageNumber}.png`,
        file: undefined,
        sourceFileId: p.sourceFileId,
        sourcePageNumber: p.sourcePageNumber,
        rotationDeg,
      };
    },
    [image.width, image.height]
  );

  const replicatePageToSide = useCallback(
    async (side: "front" | "back", page: PdfPageImage) => {
      const ui = await makeUploadedFromPage(page);
      const filled = Array<UploadedImage | undefined>(slotsPerSheet)
        .fill(undefined)
        .map(() => ({ ...ui }));
      if (side === "front") setFrontSlots(filled);
      else setBackSlots(filled);
    },
    [makeUploadedFromPage, setFrontSlots, setBackSlots, slotsPerSheet]
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
      clearByFileId(fileId);
    },
    [clearByFileId]
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

  // ===== Rotate sheet (pre-encode + store rotationDeg) =====
  const rotateSheet = useCallback(
    async (side: "front" | "back") => {
      const srcArr = side === "front" ? frontSlots : backSlots;
      const rotated = await Promise.all(
        srcArr.map(async (it) => {
          if (!it) return undefined;
          const r = await rotateDataUrl90(it.src);
          return {
            ...it,
            originalSrc: r,
            src: r,
            rotationDeg: ((it.rotationDeg ?? 0) + 90) % 360,
          };
        })
      );
      if (side === "front") setFrontSlots(rotated);
      else setBackSlots(rotated);
    },
    [frontSlots, backSlots, setFrontSlots, setBackSlots]
  );

  // ===== Clear controls =====
  const clearFront = useCallback(() => {
    setFrontSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
  }, [setFrontSlots, slotsPerSheet]);

  const clearBack = useCallback(() => {
    setBackSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
  }, [setBackSlots, slotsPerSheet]);

  const clearBoth = useCallback(() => {
    setFrontSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
    setBackSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
  }, [setFrontSlots, setBackSlots, slotsPerSheet]);

  // ===== Export =====
  const buildCurrentPdfBytes = async () => {
    const sheets: (UploadedImage | undefined)[][] = [];
    sheets.push(frontSlots);
    if (duplex && hasAnyBack) sheets.push(backSlots);

    const pdfBytes = await exportImpositionPdf({
      paper,
      image,
      sheets,
      layout: { rows: layout.rows, cols: layout.cols },
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
          images={frontSlots}
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
            images={backSlots}
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
