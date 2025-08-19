// lib/rotateIfNeeded.ts
export async function rotateIfNeeded(
  dataUrl: string,
  targetWidthMm: number,
  targetHeightMm: number,
  dpi = 300
): Promise<string> {
  const img = await loadImage(dataUrl);

  const imgLandscape = img.naturalWidth >= img.naturalHeight;
  const targetLandscape = targetWidthMm >= targetHeightMm;

  if (imgLandscape === targetLandscape) {
    // Same orientation → no rotation
    return dataUrl;
  }

  // Rotate 90° to match orientation
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;

  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
