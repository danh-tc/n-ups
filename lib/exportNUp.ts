import {
  PDFDocument,
  cmyk,
  degrees,
  setLineWidth,
  setLineCap,
  setLineJoin,
  moveTo,
  lineTo,
  stroke,
  pushGraphicsState,
  popGraphicsState,
  setStrokingColor,
  PDFPage,
} from "pdf-lib";

export interface MarginMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaperConfig {
  widthMm: number;
  heightMm: number;
  marginMm: MarginMm;
}

export interface SizeMm {
  width: number;
  height: number;
}

export interface BleedMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SlotConfig {
  trimSizeMm: SizeMm;
  bleedMm: BleedMm; // treated as margin around trim
  defaultRotateDeg?: 0 | 90 | 180 | 270;
}

export interface LayoutConfig {
  rows: number;
  cols: number;
  auto: boolean;
}

export interface MarkConfig {
  cutLenMm: number;
  cutStrokePt: number;
  offsetMm?: number;
}

export interface ColorConfig {
  keepCMYK: boolean;
  markColor: "K100";
}

export interface SlotInput {
  pdfBytes: Uint8Array;
  pageIndex: number;
  rotateDeg?: 0 | 90 | 180 | 270;
}

export interface MetaInfo {
  title?: string;
  author?: string;
}

export interface NUpPlan {
  paper: PaperConfig;
  slot: SlotConfig;
  layout: LayoutConfig;
  marks: MarkConfig;
  color: ColorConfig;
  /**
   * Must have length = rows * cols. Use `null` to leave a cell empty.
   */
  slots: Array<SlotInput | null>;
  meta?: MetaInfo;
}

/* ---------- Units ---------- */
const MM_TO_PT = 72 / 25.4;
const mmToPt = (mm: number): number => mm * MM_TO_PT;

interface PtRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clampRotation(rot?: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  return rot === 90 || rot === 180 || rot === 270 ? rot : 0;
}

function ptRectFromTrimAndBleed(
  xTrim: number,
  yTrim: number,
  trimPt: { width: number; height: number },
  bleedPt: { top: number; right: number; bottom: number; left: number }
): { trim: PtRect; outer: PtRect } {
  const trim: PtRect = {
    x: xTrim,
    y: yTrim,
    width: trimPt.width,
    height: trimPt.height,
  };
  const outer: PtRect = {
    x: xTrim - bleedPt.left,
    y: yTrim - bleedPt.bottom,
    width: trimPt.width + bleedPt.left + bleedPt.right,
    height: trimPt.height + bleedPt.top + bleedPt.bottom,
  };
  return { trim, outer };
}

/* ---------- Cut-mark drawing (I-shape perimeter, K=100) ---------- */
function drawCutMarksFromTrimRects(
  page: PDFPage,
  trims: PtRect[],
  mark: MarkConfig
): void {
  if (!trims.length) return;

  const cutLenPt = mmToPt(mark.cutLenMm);
  const offsetPt = mmToPt(mark.offsetMm ?? 0);

  page.pushOperators(pushGraphicsState());
  page.pushOperators(setLineCap(1));
  page.pushOperators(setLineJoin(1));
  page.pushOperators(setLineWidth(mark.cutStrokePt));
  page.pushOperators(setStrokingColor(cmyk(0, 0, 0, 1))); // K100

  // boundaries from TRIM rects
  const xs = Array.from(
    new Set(trims.flatMap((r) => [r.x, r.x + r.width]))
  ).sort((a, b) => a - b);
  const ys = Array.from(
    new Set(trims.flatMap((r) => [r.y, r.y + r.height]))
  ).sort((a, b) => a - b);

  const left = xs[0];
  const right = xs[xs.length - 1];
  const bottom = ys[0];
  const top = ys[ys.length - 1];

  const lines: number[][] = [];
  const pushLine = (x1: number, y1: number, x2: number, y2: number): void => {
    lines.push([x1, y1], [x2, y2]);
  };

  // Corner L
  // BL
  pushLine(
    left - offsetPt - cutLenPt,
    bottom - offsetPt,
    left - offsetPt,
    bottom - offsetPt
  );
  pushLine(
    left - offsetPt,
    bottom - offsetPt - cutLenPt,
    left - offsetPt,
    bottom - offsetPt
  );
  // TL
  pushLine(
    left - offsetPt - cutLenPt,
    top + offsetPt,
    left - offsetPt,
    top + offsetPt
  );
  pushLine(
    left - offsetPt,
    top + offsetPt,
    left - offsetPt,
    top + offsetPt + cutLenPt
  );
  // TR
  pushLine(
    right + offsetPt,
    top + offsetPt,
    right + offsetPt + cutLenPt,
    top + offsetPt
  );
  pushLine(
    right + offsetPt,
    top + offsetPt,
    right + offsetPt,
    top + offsetPt + cutLenPt
  );
  // BR
  pushLine(
    right + offsetPt,
    bottom - offsetPt,
    right + offsetPt + cutLenPt,
    bottom - offsetPt
  );
  pushLine(
    right + offsetPt,
    bottom - offsetPt - cutLenPt,
    right + offsetPt,
    bottom - offsetPt
  );

  // Vertical boundaries
  for (let i = 1; i < xs.length - 1; i += 1) {
    const x = xs[i];
    pushLine(x, bottom - offsetPt - cutLenPt, x, bottom - offsetPt);
    pushLine(x, top + offsetPt, x, top + offsetPt + cutLenPt);
  }
  // Horizontal boundaries
  for (let j = 1; j < ys.length - 1; j += 1) {
    const y = ys[j];
    pushLine(left - offsetPt - cutLenPt, y, left - offsetPt, y);
    pushLine(right + offsetPt, y, right + offsetPt + cutLenPt, y);
  }

  for (let i = 0; i < lines.length; i += 2) {
    const [x1, y1] = lines[i];
    const [x2, y2] = lines[i + 1];
    page.pushOperators(moveTo(x1, y1), lineTo(x2, y2), stroke());
  }

  page.pushOperators(popGraphicsState());
}

/* ---------- Main export ---------- */
export async function exportNUp(plan: NUpPlan): Promise<Uint8Array> {
  const { paper, slot, layout, marks, color, slots, meta } = plan;

  const cellCount = layout.rows * layout.cols;
  if (slots.length !== cellCount) {
    throw new Error(
      `slots length (${slots.length}) must equal rows*cols (${cellCount}).`
    );
  }

  const doc = await PDFDocument.create();
  if (meta?.title) doc.setTitle(meta.title);
  if (meta?.author) doc.setAuthor(meta.author);

  const pageWidthPt = mmToPt(paper.widthMm);
  const pageHeightPt = mmToPt(paper.heightMm);
  const page = doc.addPage([pageWidthPt, pageHeightPt]);

  const allTrimRects: PtRect[] = [];

  const xOrigin = mmToPt(paper.marginMm.left);
  const yOrigin = mmToPt(paper.marginMm.bottom);
  const usableW =
    pageWidthPt - mmToPt(paper.marginMm.left + paper.marginMm.right);

  const trimWPt = mmToPt(slot.trimSizeMm.width);
  const trimHPt = mmToPt(slot.trimSizeMm.height);
  const bleedPt = {
    top: mmToPt(slot.bleedMm.top),
    right: mmToPt(slot.bleedMm.right),
    bottom: mmToPt(slot.bleedMm.bottom),
    left: mmToPt(slot.bleedMm.left),
  };

  const outerW = trimWPt + bleedPt.left + bleedPt.right;
  const outerH = trimHPt + bleedPt.top + bleedPt.bottom;

  const gridTotalW = outerW * layout.cols;
  const gridStartX = xOrigin + (usableW - gridTotalW) / 2;

  const gridStartY = yOrigin + mmToPt(marks.cutLenMm);

  let cell = 0;
  for (let r = 0; r < layout.rows; r += 1) {
    for (let c = 0; c < layout.cols; c += 1) {
      const slotData = slots[cell];

      const xTrim = gridStartX + c * outerW + bleedPt.left;
      const yTrim = gridStartY + r * outerH; // ⬅ trim bottom aligned with margin+cutLen

      const rect = ptRectFromTrimAndBleed(
        xTrim,
        yTrim,
        { width: trimWPt, height: trimHPt },
        bleedPt
      );

      allTrimRects.push(rect.trim);

      if (slotData) {
        // eslint-disable-next-line no-await-in-loop
        await placePdfPageNoScale(
          doc,
          page,
          slotData,
          rect.outer,
          clampRotation(slotData.rotateDeg ?? slot.defaultRotateDeg)
        );
      }

      cell += 1;
    }
  }

  if (color.keepCMYK && color.markColor === "K100") {
    drawCutMarksFromTrimRects(page, allTrimRects, marks);
  } else {
    drawCutMarksFromTrimRects(page, allTrimRects, marks);
  }

  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

/* ---------- Placement helper (no scaling) ---------- */
async function placePdfPageNoScale(
  doc: PDFDocument,
  page: PDFPage,
  slot: SlotInput,
  outer: PtRect,
  rotateDeg: 0 | 90 | 180 | 270
): Promise<void> {
  const [embedded] = await doc.embedPdf(slot.pdfBytes, [slot.pageIndex]);

  const srcW = embedded.width;
  const srcH = embedded.height;

  const drawsW = rotateDeg % 180 === 0 ? srcW : srcH;
  const drawsH = rotateDeg % 180 === 0 ? srcH : srcW;

  const xDraw = outer.x + (outer.width - drawsW) / 2;
  const yDraw = outer.y + (outer.height - drawsH) / 2;

  page.drawPage(embedded, { x: xDraw, y: yDraw, rotate: degrees(rotateDeg) });
}
