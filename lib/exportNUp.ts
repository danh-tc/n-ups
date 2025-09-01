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
  translate,
  rotateRadians,
  setFillingColor,
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
  date?: string;
  customerName?: string;
  description?: string;
  displayMeta?: boolean
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

/* ---------- Cut-mark drawing (perimeter “I” at ALL cut lines, K=100) ---------- */
// Ticks are placed on page perimeter aligned to EVERY trim boundary (xs & ys),
// and start exactly at TRIM + BLEED (+ optional offset).
function drawCutMarksFromTrimRects(
  page: PDFPage,
  trims: PtRect[],
  mark: MarkConfig,
  perimeterBleedPt?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }
): void {
  if (!trims.length) return;

  const cutLenPt = mmToPt(mark.cutLenMm);
  const offsetPt = mmToPt(mark.offsetMm ?? 0);

  page.pushOperators(
    pushGraphicsState(),
    setLineCap(0), // butt for crisp ends
    setLineJoin(0),
    setLineWidth(mark.cutStrokePt),
    setStrokingColor(cmyk(0, 0, 0, 1)) // K100
  );

  // Unique vertical/horizontal boundaries from TRIM rects
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

  // Perimeter offsets = bleed + offset
  const offL = (perimeterBleedPt?.left ?? 0) + offsetPt;
  const offR = (perimeterBleedPt?.right ?? 0) + offsetPt;
  const offT = (perimeterBleedPt?.top ?? 0) + offsetPt;
  const offB = (perimeterBleedPt?.bottom ?? 0) + offsetPt;

  const draw = (x1: number, y1: number, x2: number, y2: number): void => {
    page.pushOperators(moveTo(x1, y1), lineTo(x2, y2), stroke());
  };

  // Top & bottom: draw I-marks at EVERY vertical cut line (all xs)
  for (let i = 0; i < xs.length; i += 1) {
    const x = xs[i];
    // bottom tick (points outward)
    draw(x, bottom - offB - cutLenPt, x, bottom - offB);
    // top tick
    draw(x, top + offT, x, top + offT + cutLenPt);
  }

  // Left & right: draw I-marks at EVERY horizontal cut line (all ys)
  for (let j = 0; j < ys.length; j += 1) {
    const y = ys[j];
    // left tick
    draw(left - offL - cutLenPt, y, left - offL, y);
    // right tick
    draw(right + offR, y, right + offR + cutLenPt, y);
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
  if (meta?.customerName) doc.setTitle(meta.customerName);

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
  const gridStartY = yOrigin + mmToPt(marks.cutLenMm) + bleedPt.bottom; // keep bottom clearance

  let cell = 0;
  for (let r = 0; r < layout.rows; r += 1) {
    for (let c = 0; c < layout.cols; c += 1) {
      const slotData = slots[cell];

      const xTrim = gridStartX + c * outerW + bleedPt.left;
      const yTrim = gridStartY + r * outerH;

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
          clampRotation(
            (slotData.rotateDeg ?? slot.defaultRotateDeg ?? 0) as
              | 0
              | 90
              | 180
              | 270
          )
        );
      }

      cell += 1;
    }
  }

  // Perimeter marks aligned to ALL cut lines; start at trim + bleed
  drawCutMarksFromTrimRects(page, allTrimRects, marks, bleedPt);

  const metaText = [meta?.date, meta?.customerName, meta?.description]
    .filter(Boolean)
    .join(" — ");
  if (metaText && meta?.displayMeta) {
    const xText = mmToPt(paper.marginMm.left);
    const yText = mmToPt(paper.marginMm.bottom);
    page.pushOperators(pushGraphicsState(), setFillingColor(cmyk(0, 0, 0, 1)));
    page.drawText(metaText, { x: xText, y: yText, size: 10 });
    page.pushOperators(popGraphicsState());
  }

  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

/* ---------- Placement helper (no scaling) ---------- */
async function placePdfPageNoScale(
  doc: PDFDocument,
  page: PDFPage,
  slot: SlotInput,
  outer: { x: number; y: number; width: number; height: number },
  rotateDeg: 0 | 90 | 180 | 270
): Promise<void> {
  const [embedded] = await doc.embedPdf(slot.pdfBytes, [slot.pageIndex]);
  if (!embedded) throw new Error(`Invalid pageIndex: ${slot.pageIndex}`);

  const srcW = embedded.width;
  const srcH = embedded.height;

  // draw page centered in the OUTER rect, then rotate around center
  const cx = outer.x + outer.width / 2;
  const cy = outer.y + outer.height / 2;

  // We draw with origin at center, so we offset by half of the *unrotated* source size.
  // Rotation happens via CTM, so no need to pre-swap W/H for 90/270.
  page.pushOperators(
    pushGraphicsState(),
    translate(cx, cy),
    rotateRadians((Math.PI * rotateDeg) / 180)
  );

  // draw at (-srcW/2, -srcH/2) with no extra rotate
  page.drawPage(embedded, {
    x: -srcW / 2,
    y: -srcH / 2,
    // no rotate here; rotation already applied by CTM above
  });

  page.pushOperators(popGraphicsState());
}
