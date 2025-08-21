import type { PaperConfig, ImageConfig } from "@/types/types";

/** Safe clamp to zero for invalid/negative numbers */
export const clamp0 = (n: number): number =>
  Number.isFinite(n) && n > 0 ? n : 0;

export const eq = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

export function formatMm(n: number, digits = 1): string {
  return `${Number(n.toFixed(digits))} mm`;
}
export function formatMm2(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 10000 ? 0 : 1;
  return `${Number(n.toFixed(digits)).toLocaleString()} mm²`;
}
/** Expects an already computed percent (0–100). */
export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Printed (placeable) area after margins AND crop‑marks. Units: mm. */
export function computePrintedArea(paper: PaperConfig): {
  printedW: number;
  printedH: number;
  printedArea: number;
} {
  const { width, height, margin, cutMarkLengthMm } = paper;
  const cut = clamp0(cutMarkLengthMm ?? 0);
  const printedW = clamp0(width - margin.left - margin.right - 2 * cut);
  const printedH = clamp0(height - margin.top - margin.bottom - 2 * cut);
  return { printedW, printedH, printedArea: printedW * printedH };
}

/** Layout by printed area + tag footprint (image + per‑image margins). */
export function computeLayout(
  paper: PaperConfig,
  image: ImageConfig
): {
  rows: number;
  cols: number;
  items: number;
  tagW: number;
  tagH: number;
  printedW: number;
  printedH: number;
} {
  const { printedW, printedH } = computePrintedArea(paper);

  const m = image.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const tagW = clamp0(image.width + clamp0(m.left) + clamp0(m.right));
  const tagH = clamp0(image.height + clamp0(m.top) + clamp0(m.bottom));

  const gapX = clamp0(paper.gap.horizontal);
  const gapY = clamp0(paper.gap.vertical);

  const cols =
    tagW <= 0 ? 0 : Math.max(0, Math.floor((printedW + gapX) / (tagW + gapX)));
  const rows =
    tagH <= 0 ? 0 : Math.max(0, Math.floor((printedH + gapY) / (tagH + gapY)));

  return {
    rows,
    cols,
    items: rows * cols,
    tagW,
    tagH,
    printedW,
    printedH,
  };
}
