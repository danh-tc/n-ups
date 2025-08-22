"use client";

import React, { useMemo } from "react";
import { ImageCell } from "./ImageCell";
import "./paper-preview.scss";
import { Crop, X } from "lucide-react";
import type { ImageConfig, PaperConfig, UploadedImage } from "@/types/types";
import { computeLayout, clamp0 } from "@/lib/imposition";

interface Props {
  paper: PaperConfig;
  image: ImageConfig;
  customerName?: string;
  date?: string;
  description?: string;
  showMeta?: boolean;
  showLegend?: boolean;
  images?: (UploadedImage | undefined)[];
  onSlotRemoveImage?: (slotIdx: number) => void;
  onSlotEditImage?: (slotIdx: number) => void;
}

export const PaperPreview: React.FC<Props> = ({
  paper,
  image,
  customerName,
  date,
  description,
  showMeta = true,
  showLegend = true,
  images,
}) => {
  const PREVIEW_W = 500;

  // Screen-only scaling
  const { previewWidth, previewHeight, scale } = useMemo(() => {
    const w = clamp0(paper.width);
    const h = clamp0(paper.height);
    if (w === 0 || h === 0)
      return { previewWidth: PREVIEW_W, previewHeight: PREVIEW_W, scale: 1 };
    const pw = PREVIEW_W;
    return { previewWidth: pw, previewHeight: pw * (h / w), scale: pw / w };
  }, [paper.width, paper.height]);

  // Layout (printedW/H already account for margins + cut marks)
  const { rows, cols, tagW, tagH, printedW, printedH } = useMemo(
    () => computeLayout(paper, image),
    [paper, image]
  );

  // Margin area (px)
  const paperMargin = useMemo(
    () => ({
      top: clamp0(paper.margin.top) * scale,
      right: clamp0(paper.margin.right) * scale,
      bottom: clamp0(paper.margin.bottom) * scale,
      left: clamp0(paper.margin.left) * scale,
    }),
    [
      paper.margin.top,
      paper.margin.right,
      paper.margin.bottom,
      paper.margin.left,
      scale,
    ]
  );

  // Cut mark inset (px)
  const cutPx = useMemo(
    () => clamp0((paper as PaperConfig).cutMarkLengthMm ?? 0) * scale,
    [scale, paper]
  );

  // Printed area position + size (px)
  const printedBox = useMemo(
    () => ({
      width: Math.max(0, printedW * scale),
      height: Math.max(0, printedH * scale),
      left: paperMargin.left + cutPx,
      top: paperMargin.top + cutPx,
    }),
    [printedW, printedH, paperMargin.left, paperMargin.top, cutPx, scale]
  );

  // Cell (footprint) size in px: image + gutter(image.margin)
  const cellWidth = tagW * scale;
  const cellHeight = tagH * scale;

  // Inset (image) margins (px)
  const imgMarginPx = useMemo(
    () => ({
      top: clamp0(image.margin?.top ?? 0) * scale,
      right: clamp0(image.margin?.right ?? 0) * scale,
      bottom: clamp0(image.margin?.bottom ?? 0) * scale,
      left: clamp0(image.margin?.left ?? 0) * scale,
    }),
    [
      image.margin?.top,
      image.margin?.right,
      image.margin?.bottom,
      image.margin?.left,
      scale,
    ]
  );

  // Inset size = image size (always visible)
  const insetW = Math.max(0, cellWidth - imgMarginPx.left - imgMarginPx.right);
  const insetH = Math.max(0, cellHeight - imgMarginPx.top - imgMarginPx.bottom);

  // Grid overall size (no CSS gap; gutter lives inside footprint)
  const gridW = cols > 0 ? cols * cellWidth : 0;
  const gridH = rows > 0 ? rows * cellHeight : 0;

  // Place grid: horizontally centered, vertically bottom-aligned to printed area
  const gridLeft = printedBox.left + (printedBox.width - gridW) / 2;
  const gridTop = printedBox.top + printedBox.height - gridH;

  // Margin fill size (for the yellow band)
  const usableW = Math.max(
    0,
    previewWidth - paperMargin.left - paperMargin.right
  );
  const usableH = Math.max(
    0,
    previewHeight - paperMargin.top - paperMargin.bottom
  );

  const showGrid = rows > 0 && cols > 0 && cellWidth > 0 && cellHeight > 0;

  return (
    <div className="rethink-paper-preview-wrap" data-contrast="high">
      <div
        className="rethink-paper-preview"
        style={{ width: previewWidth, height: previewHeight }}
      >
        {/* Margin band */}
        <div
          className="rethink-paper-preview__margin"
          style={{
            top: paperMargin.top,
            left: paperMargin.left,
            width: usableW,
            height: usableH,
          }}
        />

        {/* Printed area */}
        <div
          className="rethink-paper-preview__printed"
          style={{
            top: printedBox.top,
            left: printedBox.left,
            width: printedBox.width,
            height: printedBox.height,
          }}
        />

        {/* Grid (footprints + insets) */}
        {showGrid ? (
          <div
            className="rethink-paper-preview__grid"
            style={{
              top: gridTop,
              left: gridLeft,
              width: gridW,
              height: gridH,
              gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
              gridTemplateColumns: `repeat(${cols}, ${cellWidth}px)`,
              gap: "0px 0px",
            }}
          >
            {Array.from({ length: rows }).flatMap((_, r) =>
              Array.from({ length: cols }).map((__, c) => {
                const idx = r * cols + c;
                const img = images?.[idx];

                return (
                  <ImageCell
                    key={`${r}-${c}`}
                    width={cellWidth}
                    height={cellHeight}
                  >
                    <div
                      className="rethink-image-slot"
                      style={
                        {
                          "--cell-w": `${cellWidth}px`,
                          "--cell-h": `${cellHeight}px`,
                        } as React.CSSProperties
                      }
                    >
                      <div
                        className="rethink-image-slot__inset"
                        style={{
                          top: imgMarginPx.top,
                          left: imgMarginPx.left,
                          width: insetW,
                          height: insetH,
                        }}
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.src}
                            alt={img.name ?? "uploaded image"}
                            className="rethink-image-slot__img"
                            decoding="async"
                            loading="lazy"
                          />
                        ) : (
                          <div className="rethink-image-slot__placeholder" />
                        )}
                      </div>
                    </div>
                  </ImageCell>
                );
              })
            )}
          </div>
        ) : (
          <div className="rethink-paper-preview__empty">
            Not enough space for 1 item.
          </div>
        )}

        {/* Legend */}
        {showLegend ? (
          <div
            className="rethink-paper-preview__legend"
            style={{
              right: Math.max(8, paperMargin.right + 8),
              top: Math.max(8, paperMargin.top + 8),
            }}
            aria-label="Preview legend"
          >
            <div className="legend-item">
              <span className="legend-swatch legend-swatch--paper" />
              <span className="legend-label">Paper</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch--margin" />
              <span className="legend-label">Margins</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch--printed" />
              <span className="legend-label">Printed area</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch--tag" />
              <span className="legend-label">Hangtag footprint</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch--inset" />
              <span className="legend-label">Hangtag (safe)</span>
            </div>
          </div>
        ) : null}

        {/* Meta — bottom-left of printed area */}
        {showMeta && (customerName || date || description) ? (
          <div
            className="rethink-paper-preview__meta"
            style={{
              left: printedBox.left,
              bottom: paperMargin.bottom + cutPx,
              width: printedBox.width,
            }}
          >
            <div
              className="rethink-paper-preview__meta-left"
              title={`${date ?? ""} ${customerName ?? ""} ${
                description ?? ""
              }`.trim()}
            >
              {date} {customerName} {description}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
