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
import ExportQueueDrawer from "./ExportQueueDrawer";
import { useExportQueueStore } from "@/store/useExportQueueStore";
import FullScreenBrandedLoader from "../layout/FullScreenLoader";
import { useLoadingTask } from "@/hooks/useLoadingTask";
import PdfUpload, { type PdfPageImage } from "./PdfUpload";
import { loadPreviews, upsertPreviews, type PreviewPage } from "@/lib/uploadDb";
import { mapStoreToNUpPlan } from "@/lib/mapStoreToNUpPlan";
import { exportNUp } from "@/lib/exportNUp";

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
  const duplex = useImpositionStore((s) => s.paper.duplex ?? false);

  // Slots from store
  const frontSlots = useImpositionStore((s) => s.frontSlots);
  const backSlots = useImpositionStore((s) => s.backSlots);
  const setFrontSlots = useImpositionStore((s) => s.setFrontSlots);
  const setBackSlots = useImpositionStore((s) => s.setBackSlots);
  const ensureCapacityStore = useImpositionStore((s) => s.ensureCapacity);
  const clearByFileId = useImpositionStore((s) => s.clearByFileId);

  // === newly added: setters for selections
  const setFrontSelection = useImpositionStore((s) => s.setFrontSelection);
  const setBackSelection = useImpositionStore((s) => s.setBackSelection);

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
    void hydrateQueue();
  }, [hydrateQueue]);

  // ===== Create UploadedImage from a PdfPageImage =====
  const makeUploadedFromPage = useCallback(
    async (p: PdfPageImage): Promise<UploadedImage> => {
      const slotLandscape = image.width >= image.height;

      const baseRot = (((p.rotationDeg ?? 0) % 360) + 360) % 360;
      const pageLandscapeBeforeAuto =
        baseRot === 90 || baseRot === 270
          ? (Number(p.height) as number) >= (Number(p.width) as number)
          : (Number(p.width) as number) >= (Number(p.height) as number);

      let dataUrl = p.dataUrl;
      let rotationDeg = baseRot;

      if (slotLandscape !== pageLandscapeBeforeAuto) {
        dataUrl = await rotateDataUrl90(dataUrl);
        rotationDeg = (rotationDeg + 90) % 360;
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

  // Replicate a single page to an entire side
  const replicatePageToSide = useCallback(
    async (side: "front" | "back", page: PdfPageImage) => {
      const ui = await makeUploadedFromPage(page);
      const filled = Array<UploadedImage | undefined>(slotsPerSheet)
        .fill(undefined)
        .map(() => ({ ...ui }));
      if (side === "front") {
        setFrontSlots(filled);
        setFrontSelection({
          fileId: page.sourceFileId,
          pageNumber: page.pageNumber,
        });
      } else {
        setBackSlots(filled);
        setBackSelection({
          fileId: page.sourceFileId,
          pageNumber: page.pageNumber,
        });
      }
    },
    [
      makeUploadedFromPage,
      setFrontSlots,
      setBackSlots,
      slotsPerSheet,
      setFrontSelection,
      setBackSelection,
    ]
  );

  // ===== Uploader hooks =====
  const handleAfterConvert = useCallback(
    async (pages: PdfPageImage[], _fileId: string) => {
      if (pages.length >= 1) {
        await replicatePageToSide("front", pages[0]);
      }
      if (duplex && pages.length >= 2) {
        await replicatePageToSide("back", pages[1]);
      }
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

  // ===== Persist rotations to preview cache =====
  const persistSideRotations = useCallback(
    async (side: "front" | "back") => {
      const slots = side === "front" ? frontSlots : backSlots;

      const mapByFile = new Map<
        string,
        Map<number, { dataUrl: string; rotationDeg: number }>
      >();

      for (const it of slots) {
        if (!it || !it.sourceFileId || !it.sourcePageNumber) continue;
        const fid = it.sourceFileId;
        const pno = it.sourcePageNumber;
        if (!mapByFile.has(fid)) mapByFile.set(fid, new Map());
        if (!mapByFile.get(fid)!.has(pno)) {
          mapByFile.get(fid)!.set(pno, {
            dataUrl: it.src,
            rotationDeg: (((it.rotationDeg ?? 0) % 360) + 360) % 360,
          });
        }
      }

      for (const [fid, pageMap] of mapByFile.entries()) {
        const prevs = await loadPreviews(fid);
        const merged: PreviewPage[] = prevs.map((p) => {
          const upd = pageMap.get(p.pageNumber);
          if (!upd) return p;
          return {
            pageNumber: p.pageNumber,
            width: p.width,
            height: p.height,
            dataUrl: upd.dataUrl,
            rotationDeg: upd.rotationDeg,
          };
        });
        if (merged.length > 0) await upsertPreviews(fid, merged);
      }
    },
    [frontSlots, backSlots]
  );

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

      await persistSideRotations(side);
    },
    [frontSlots, backSlots, setFrontSlots, setBackSlots, persistSideRotations]
  );

  const clearFront = useCallback(() => {
    setFrontSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
    setFrontSelection(null);
  }, [setFrontSlots, slotsPerSheet, setFrontSelection]);

  const clearBack = useCallback(() => {
    setBackSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
    setBackSelection(null);
  }, [setBackSlots, slotsPerSheet, setBackSelection]);

  const clearBoth = useCallback(() => {
    setFrontSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
    setBackSlots(
      Array<UploadedImage | undefined>(slotsPerSheet).fill(undefined)
    );
    setFrontSelection(null);
    setBackSelection(null);
  }, [
    setFrontSlots,
    setBackSlots,
    slotsPerSheet,
    setFrontSelection,
    setBackSelection,
  ]);

  // ===== Export (shared N-Up builder used by both actions) =====
  const buildCurrentNUpBytes = useCallback(async (): Promise<Uint8Array | null> => {
    const frontPlan = await mapStoreToNUpPlan("front");
    const backPlan = duplex ? await mapStoreToNUpPlan("back") : null;
    if (!frontPlan && !backPlan) return null;

    const parts: Uint8Array[] = [];
    if (frontPlan) parts.push(await exportNUp(frontPlan));
    if (backPlan) parts.push(await exportNUp(backPlan));

    if (parts.length === 1) return parts[0];

    const { PDFDocument } = await import("pdf-lib");
    const merged = await PDFDocument.create();
    for (const bytes of parts) {
      const doc = await PDFDocument.load(bytes);
      const copied = await merged.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => merged.addPage(p));
    }
    return merged.save();
  }, [duplex]);

  const handleExportPdf = (): void => {
    if (!hasAnyImage) return;
    void runWithLoading(async () => {
      const outBytes = await buildCurrentNUpBytes();
      if (!outBytes) return;
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });
  };

  const handleAddToExportList = (): void =>
    void runWithLoading(async () => {
      if (!hasAnyFront) return; // keep current UX gate
      const outBytes = await buildCurrentNUpBytes();
      if (!outBytes) return;

      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(outBytes);
      const pageCount = doc.getPageCount();

      const name = meta.customerName?.trim() || `Job ${queueItems.length + 1}`;
      const blob = new Blob([outBytes], { type: "application/pdf" });
      await addToQueue(name, pageCount, blob);
      setIsQueueOpen(true);
    });

  const handleExportAll = (): void =>
    void runWithLoading(async () => {
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
                ? "Export current sheet(s) to PDF"
                : "Add images to enable export"
            }
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Front */}
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

      {/* Back */}
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
