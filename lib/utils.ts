export function getTodayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildSheets<T = unknown>(
  images: (T | undefined)[],
  slotsPerSheet: number
): (T | undefined)[][] {
  const sheets: (T | undefined)[][] = [];
  for (let i = 0; i < images.length; i += slotsPerSheet) {
    // Grab a chunk for this sheet
    const chunk = images.slice(i, i + slotsPerSheet);
    // Only add the sheet if it contains any real image
    if (chunk.some(Boolean)) {
      // Pad with undefined so all sheets have full length
      while (chunk.length < slotsPerSheet) chunk.push(undefined);
      sheets.push(chunk);
    }
  }
  // If no sheets have any images, always return one empty sheet
  if (sheets.length === 0) {
    sheets.push(Array(slotsPerSheet).fill(undefined));
  }
  return sheets;
}
