"use client";

import "./items-handler.scss";
import React, { useEffect, useState, useMemo } from "react";
import { BulkImageUploader } from "@/components/items-handler/BulkImageUploader";
import { PaperPreview } from "../layout/PaperPreview";
import { calculateGridLayout } from "@/lib/layoutCalculator";
import { useImpositionStore } from "@/store/useImpositionStore";
import { SheetPaginator } from "./SheetPaginator";
import { useHydrated } from "@/hooks/useImpositionHydrated";
import { CropSettings, UploadedImage } from "@/types/types";
import { CropperModal } from "./CropperModal";
import { exportImpositionPdf } from "@/lib/exportImpositionPdf";
import { autoCoverCrop } from "@/lib/autoCoverCrop";
import { rotateIfNeeded } from "@/lib/rotateIfNeeded";
import ExportQueueDrawer from "./ExportQueueDrawer";
import { useExportQueueStore } from "@/store/useExportQueueStore";
import FullScreenBrandedLoader from "../layout/FullScreenLoader";
import { useLoadingTask } from "@/hooks/useLoadingTask";
import PdfUpload from "./PdfUpload";

export default function ItemsHandler() {
  const [images, setImages] = useState<(UploadedImage | undefined)[]>([]);
  const [currentSheet, setCurrentSheet] = useState(0);

  const image = useImpositionStore((s) => s.image);
  const paper = useImpositionStore((s) => s.paper);
  const meta = useImpositionStore((s) => s.meta);
  const displayMeta = useImpositionStore((s) => s.displayMeta);

  const { isLoading, runWithLoading } = useLoadingTask();

  const layout = calculateGridLayout(paper, image);
  const slotsPerSheet = layout.rows * layout.cols;

  // --- Derived: do we have any uploaded images at all? ---
  const hasAnyImage = useMemo(() => images.some(Boolean), [images]);

  // Build sheets
  const sheets: (UploadedImage | undefined)[][] = [];
  for (let i = 0; i < images.length; i += slotsPerSheet) {
    sheets.push(images.slice(i, i + slotsPerSheet));
  }
  if (sheets.length === 0) {
    sheets.push(Array(slotsPerSheet).fill(undefined));
  } else if (sheets[sheets.length - 1].length < slotsPerSheet) {
    sheets[sheets.length - 1] = [
      ...sheets[sheets.length - 1],
      ...Array(slotsPerSheet - sheets[sheets.length - 1].length).fill(
        undefined
      ),
    ];
  }

  const [cropModal, setCropModal] = useState<{
    open: boolean;
    slotIdx: number | null;
    src: string | null;
    initialCrop?: CropSettings;
  }>({ open: false, slotIdx: null, src: null });

  // ===== Export List (Queue) via Zustand + IndexedDB =====
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

  // open crop modal — always from original
  const handleSlotEditImage = (slotIdx: number) => {
    const baseIndex = currentSheet * slotsPerSheet;
    const img = images[baseIndex + slotIdx];
    if (!img) return;
    setCropModal({
      open: true,
      slotIdx,
      src: img.originalSrc,
      initialCrop: img.crop,
    });
  };

  const handleSlotAddImage = (slotIdx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const orientedSrc = await rotateIfNeeded(
        dataUrl,
        image.width,
        image.height,
        300
      );

      const { dataUrl: autoUrl, crop } = await autoCoverCrop(
        orientedSrc,
        { width: image.width, height: image.height },
        300,
        { type: "image/png" },
        image.margin
      );

      const newImage: UploadedImage = {
        originalSrc: orientedSrc,
        src: autoUrl,
        name: file.name,
        file,
        crop,
      };

      setImages((prev) => {
        const baseIndex = currentSheet * slotsPerSheet;
        const next = [...prev];
        while (next.length < baseIndex + slotsPerSheet) next.push(undefined);
        next[baseIndex + slotIdx] = newImage;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSlotRemoveImage = (slotIdx: number) => {
    setImages((prev) => {
      const baseIndex = currentSheet * slotsPerSheet;
      const next = [...prev];
      if (next[baseIndex + slotIdx]) next[baseIndex + slotIdx] = undefined;
      return next;
    });
  };

  const handleClearAllUploadedImages = () => {
    setImages([]);
    setCurrentSheet(0);
  };

  const buildCurrentPdfBytes = async () => {
    const pdfBytes = await exportImpositionPdf({
      paper,
      image,
      sheets,
      layout,
      customerName: meta.customerName,
      description: meta.description,
      displayMeta: displayMeta,
      date: meta.date,
      cutMarkLengthMm: 6,
      cutMarkThicknessPt: 0.7,
      cutMarkColor: { r: 0, g: 0, b: 0 },
    });
    return pdfBytes;
  };

  const handleExportPdf = () => {
    if (!hasAnyImage) return; // guard
    return runWithLoading(async () => {
      const pdfBytes = await buildCurrentPdfBytes();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });
  };

  const handleAddToExportList = () => {
    if (!hasAnyImage) return; // guard
    return runWithLoading(async () => {
      const pdfBytes = await buildCurrentPdfBytes();

      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfBytes);
      const pageCount = doc.getPageCount();

      const name = meta.customerName?.trim() || `Job ${queueItems.length + 1}`;
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      await addToQueue(name, pageCount, blob);
      setIsQueueOpen(true);
    });
  };

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
      <PdfUpload
        maxSizeMB={50}
        onSelect={(file) => {
          // alert("done");
        }}
      />
      <div className="rethink-toolbar">
        <div className="rethink-toolbar__left">
          <div className="rethink-status-line">Queued: {queueItems.length}</div>
        </div>

        <div className="rethink-toolbar__right">
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
            disabled={!hasAnyImage}
            title={
              hasAnyImage
                ? "Generate current PDF and add to export list"
                : "Add at least one image to enable"
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
                ? "Export current job (all sheets)"
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

      <div className="rethink-paginator-row">
        <SheetPaginator
          totalSheets={sheets.length}
          currentSheet={currentSheet}
          onChange={setCurrentSheet}
        />
      </div>

      <div className="rethink-paper">
        <div className="rethink-paper__chip">
          {layout.cols}×{layout.rows} · {paper.width}×{paper.height}mm · Gap{" "}
          {paper.gap.horizontal}/{paper.gap.vertical}mm · Margin{" "}
          {paper.margin.top}/{paper.margin.right}/{paper.margin.bottom}/
          {paper.margin.left}mm
        </div>

        <PaperPreview
          paper={paper}
          image={image}
          customerName={meta.customerName}
          description={meta.description}
          images={sheets[currentSheet] || []}
          date={meta.date}
          onSlotRemoveImage={handleSlotRemoveImage}
          onSlotEditImage={handleSlotEditImage}
        />
      </div>

      {cropModal.open && cropModal.src && (
        <CropperModal
          imageData={image}
          dpi={300}
          isOpen={cropModal.open}
          imageSrc={cropModal.src}
          onClose={() =>
            setCropModal({ open: false, slotIdx: null, src: null })
          }
          onConfirm={({ dataUrl, crop }) => {
            if (cropModal.slotIdx === null) return;
            const baseIndex = currentSheet * slotsPerSheet;
            const next = [...images];
            const old = next[baseIndex + cropModal.slotIdx];
            if (!old) return;
            next[baseIndex + cropModal.slotIdx] = {
              ...old,
              src: dataUrl,
              crop,
            };
            setImages(next);
            setCropModal({ open: false, slotIdx: null, src: null });
          }}
        />
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
