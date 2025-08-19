// lib/autoCoverCrop.ts
export interface AutoCoverCropResult {
  dataUrl: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotate?: number;
    scaleX?: number;
    scaleY?: number;
    naturalWidth: number;
    naturalHeight: number;
  };
}

/**
 * Auto-crop an image like CSS object-fit: cover, centered.
 * Supports optional per-image margins: the crop will match the *inner* target area
 * (target - margins) so it aligns with your preview/export inset.
 *
 * @param src DataURL or URL of the original image
 * @param targetMm Target slot size in mm (outer cell)
 * @param dpi Export DPI (default 300)
 * @param output e.g. { type:'image/jpeg', quality:0.9 } or { type:'image/png' }
 * @param marginMm Optional per-image margin in mm (top/right/bottom/left)
 */
export async function autoCoverCrop(
  src: string,
  targetMm: { width: number; height: number },
  dpi = 300,
  output: { type: "image/jpeg" | "image/png"; quality?: number } = {
    type: "image/png",
  },
  marginMm?: { top: number; right: number; bottom: number; left: number }
): Promise<AutoCoverCropResult> {
  const img = await loadImage(src);
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;

  // Compute inner (effective) target area by subtracting margins (in mm)
  const mTop = marginMm?.top ?? 0;
  const mRight = marginMm?.right ?? 0;
  const mBottom = marginMm?.bottom ?? 0;
  const mLeft = marginMm?.left ?? 0;

  const innerMmW = Math.max(0.1, targetMm.width - (mLeft + mRight));
  const innerMmH = Math.max(0.1, targetMm.height - (mTop + mBottom));

  // Convert inner target to print pixels
  const targetPxW = Math.max(1, Math.round((innerMmW / 25.4) * dpi));
  const targetPxH = Math.max(1, Math.round((innerMmH / 25.4) * dpi));

  const imgRatio = naturalW / naturalH;
  const targetRatio = targetPxW / targetPxH;

  // Compute source crop rect (sx, sy, sw, sh) in original pixels
  let sx = 0,
    sy = 0,
    sw = naturalW,
    sh = naturalH;

  if (imgRatio > targetRatio) {
    // Image is wider: crop width to match target ratio
    sw = Math.round(naturalH * targetRatio);
    sx = Math.round((naturalW - sw) / 2);
    sy = 0;
    sh = naturalH;
  } else {
    // Image is taller or equal: crop height
    sh = Math.round(naturalW / targetRatio);
    sy = Math.round((naturalH - sh) / 2);
    sx = 0;
    sw = naturalW;
  }

  // Draw into a canvas of INNER print pixels (aligns with inset area)
  const canvas = document.createElement("canvas");
  canvas.width = targetPxW;
  canvas.height = targetPxH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetPxW, targetPxH);

  const dataUrl =
    output.type === "image/jpeg"
      ? canvas.toDataURL("image/jpeg", output.quality ?? 0.9)
      : canvas.toDataURL("image/png");

  // Crop settings in original pixel space
  const crop = {
    x: sx,
    y: sy,
    width: sw,
    height: sh,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    naturalWidth: naturalW,
    naturalHeight: naturalH,
  };

  return { dataUrl, crop };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
