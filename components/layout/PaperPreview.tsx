"use client";

import React, { useMemo } from "react";
import { calculateGridLayout } from "@/lib/layoutCalculator";
import { ImageCell } from "./ImageCell";
import "./paper-preview.scss";
import { Crop, X } from "lucide-react";
import { ImageConfig, PaperConfig, UploadedImage } from "@/types/types";

interface Props {
  paper: PaperConfig;
  image: ImageConfig;
  customerName?: string;
  date?: string;
  description?: string;
  showMeta?: boolean;
  images?: (UploadedImage | undefined)[];
  allowSlotImageUpload?: boolean;
  onSlotAddImage?: (slotIdx: number, file: File) => void;
  onSlotRemoveImage?: (slotIdx: number) => void;
  onSlotEditImage?: (slotIdx: number) => void;
}

export const PaperPreview: React.FC<Props> = ({
  paper,
  image,
  customerName,
  date,
  description,
  images,
  allowSlotImageUpload = false,
  onSlotAddImage,
  onSlotRemoveImage,
  onSlotEditImage,
}) => {
  const PREVIEW_W = 500;
  const aspect = paper.height / paper.width;
  const previewWidth = PREVIEW_W;
  const previewHeight = PREVIEW_W * aspect;
  const scale = previewWidth / paper.width;

  const layout = useMemo(
    () => calculateGridLayout(paper, image),
    [paper, image]
  );

  const paperMargin = {
    top: paper.margin.top * scale,
    right: paper.margin.right * scale,
    bottom: paper.margin.bottom * scale,
    left: paper.margin.left * scale,
  };
  const gap = {
    horizontal: paper.gap.horizontal * scale,
    vertical: paper.gap.vertical * scale,
  };

  const cellWidth = image.width * scale;
  const cellHeight = image.height * scale;

  const imgMarginPx = {
    top: (image.margin?.top ?? 0) * scale,
    right: (image.margin?.right ?? 0) * scale,
    bottom: (image.margin?.bottom ?? 0) * scale,
    left: (image.margin?.left ?? 0) * scale,
  };

  // Inset frame size inside each cell
  const insetW = Math.max(0, cellWidth - imgMarginPx.left - imgMarginPx.right);
  const insetH = Math.max(0, cellHeight - imgMarginPx.top - imgMarginPx.bottom);

  const usableW = previewWidth - paperMargin.left - paperMargin.right;
  const usableH = previewHeight - paperMargin.top - paperMargin.bottom;
  const gridW = layout.cols * cellWidth + (layout.cols - 1) * gap.horizontal;
  const gridH = layout.rows * cellHeight + (layout.rows - 1) * gap.vertical;
  const gridOffsetX = (usableW - gridW) / 2;
  const gridOffsetY = (usableH - gridH) / 2;

  return (
    <div className="rethink-paper-preview-wrap">
      <div
        className="rethink-paper-preview"
        style={{ width: previewWidth, height: previewHeight }}
      >
        {/* Paper margin box */}
        <div
          className="rethink-paper-preview__margin"
          style={{
            top: paperMargin.top,
            left: paperMargin.left,
            width: previewWidth - paperMargin.left - paperMargin.right,
            height: previewHeight - paperMargin.top - paperMargin.bottom,
          }}
        />

        {/* Grid container */}
        <div
          className="rethink-paper-preview__grid"
          style={{
            top: paperMargin.top + gridOffsetY,
            left: paperMargin.left + gridOffsetX,
            width: gridW,
            height: gridH,
            gridTemplateRows: `repeat(${layout.rows}, ${cellHeight}px)`,
            gridTemplateColumns: `repeat(${layout.cols}, ${cellWidth}px)`,
            gap: `${gap.vertical}px ${gap.horizontal}px`,
          }}
        >
          {Array.from({ length: layout.rows }).flatMap((_, r) =>
            Array.from({ length: layout.cols }).map((__, c) => {
              const idx = r * layout.cols + c;
              const hasImage = !!images?.[idx];

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
                    {/* Inner frame (reflects per-image margin) */}
                    <div
                      className="rethink-image-slot__inset"
                      style={{
                        top: imgMarginPx.top,
                        left: imgMarginPx.left,
                        width: insetW,
                        height: insetH,
                      }}
                    >
                      {hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images![idx]!.src}
                          alt={images![idx]!.name}
                          className="rethink-image-slot__img"
                        />
                      ) : allowSlotImageUpload && onSlotAddImage ? (
                        <label className="rethink-image-slot__upload">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onSlotAddImage(idx, file);
                            }}
                          />
                          <span className="rethink-image-slot__add-icon">
                            ＋
                          </span>
                        </label>
                      ) : (
                        <div className="rethink-image-slot__placeholder" />
                      )}
                    </div>

                    {/* Actions overlay (centered horizontally) */}
                    {hasImage && (
                      <div className="rethink-image-slot__actions">
                        <button
                          className="rethink-image-slot__action-btn rethink-image-slot__action-btn--crop"
                          title="Crop"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotEditImage?.(idx);
                          }}
                        >
                          <Crop strokeWidth={2} />
                        </button>
                        <button
                          className="rethink-image-slot__action-btn rethink-image-slot__action-btn--remove"
                          title="Remove"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotRemoveImage?.(idx);
                          }}
                        >
                          <X strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>
                </ImageCell>
              );
            })
          )}
        </div>

        {(customerName || date || description) && (
          <div
            className="rethink-paper-preview__meta"
            style={{
              paddingLeft: paperMargin.left,
              paddingRight: paperMargin.right,
              height: paperMargin.bottom || "fit-content",
            }}
          >
            <div
              className="rethink-paper-preview__meta-left"
              style={{ marginLeft: "15px" }}
            >
              {date} {customerName} {description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
