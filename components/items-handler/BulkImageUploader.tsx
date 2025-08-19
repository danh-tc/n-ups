"use client";

import React, { useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
import "./bulk-image-uploader.scss";
import type { UploadedImage } from "@/types/types";
import { rotateIfNeeded } from "@/lib/rotateIfNeeded";
import { autoCoverCrop } from "@/lib/autoCoverCrop";
import FullScreenBrandedLoader from "../layout/FullScreenLoader";
import { useLoadingTask } from "@/hooks/useLoadingTask";

interface BulkImageUploaderProps {
  onImagesLoaded: (images: UploadedImage[]) => void;
  label?: string;
  uploadedImages?: (UploadedImage | undefined)[];
  onClearAll?: () => void;
  /** Slot size to fit (in mm). If provided, images are auto-cropped like 'cover'. */
  targetSizeMm?: { width: number; height: number };
  /** Output DPI for the auto-cropped image (default 300). */
  dpi?: number;
  /** Image output format for auto-crop. */
  output?: { type: "image/jpeg" | "image/png"; quality?: number };
  /** Optional per-image margins in mm; if provided, crop fills the inner area (target - margins). */
  marginMm?: { top: number; right: number; bottom: number; left: number };
}

export const BulkImageUploader: React.FC<BulkImageUploaderProps> = ({
  onImagesLoaded,
  label = "Bulk Select & Arrange Images",
  uploadedImages = [],
  onClearAll,
  targetSizeMm,
  dpi = 300,
  output = { type: "image/png" },
  marginMm,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, runWithLoading } = useLoadingTask();

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    await runWithLoading(async () => {
      // Process all files in parallel, preserve order
      const images = await Promise.all(
        files.map(async (file): Promise<UploadedImage> => {
          const dataUrl = await readAsDataURL(file);

          // Rotate to match target orientation if provided
          const orientedSrc = targetSizeMm
            ? await rotateIfNeeded(
                dataUrl,
                targetSizeMm.width,
                targetSizeMm.height,
                dpi
              )
            : dataUrl;

          // Auto-crop to "cover" the target slot if provided
          if (targetSizeMm) {
            const { dataUrl: autoUrl, crop } = await autoCoverCrop(
              orientedSrc,
              targetSizeMm,
              dpi,
              output,
              marginMm
            );
            return {
              originalSrc: orientedSrc,
              src: autoUrl,
              name: file.name,
              file,
              crop,
            };
          }

          // No target: just return oriented image
          return {
            originalSrc: orientedSrc,
            src: orientedSrc,
            name: file.name,
            file,
          };
        })
      );

      onImagesLoaded(images);
    });

    // reset file input so same files can be re-selected later
    e.target.value = "";
  };

  return (
    <div className="bulk-image-uploader">
      <button
        className="rethink-btn rethink-btn--outline rethink-btn--md"
        type="button"
        onClick={handleButtonClick}
      >
        <span className="icon-left">
          <Upload size={14} strokeWidth={2} />
        </span>
        <span className="label">{label}</span>
        {uploadedImages.length > 0 && onClearAll && (
          <span
            className="icon-right"
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
            }}
            title="Clear all images"
          >
            <Trash2 size={18} strokeWidth={1.5} />
          </span>
        )}
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </button>

      <div className="bulk-image-uploader__hint">
        Uploaded: <b>{uploadedImages.filter(Boolean).length}</b>
      </div>

      <FullScreenBrandedLoader
        open={isLoading}
        text="Uploading and preparing your images…"
        backdropColor="#fff"
        textColor="#3a3a3a"
        dotColor="#b8864d"
      />
    </div>
  );
};

function readAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
