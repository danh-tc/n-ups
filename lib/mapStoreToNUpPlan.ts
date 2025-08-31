import { PDFDocument } from "pdf-lib";
import { loadPdf } from "@/lib/uploadDb";
import { useImpositionStore } from "@/store/useImpositionStore";
import type { NUpPlan } from "@/lib/exportNUp";
import { computeLayout } from "./imposition";

/**
 * Normalize arbitrary degrees into allowed union (0 | 90 | 180 | 270)
 */
function normalizeRotation(d: number): 0 | 90 | 180 | 270 {
  const n = ((d % 360) + 360) % 360;
  if (n === 90 || n === 180 || n === 270) return n;
  return 0;
}

/**
 * Extract a single page from a stored PDF as fresh pdfBytes
 */
async function extractPageAsPdfBytes(
  fileId: string,
  pageNumber: number
): Promise<Uint8Array> {
  const rec = await loadPdf(fileId);
  if (!rec) throw new Error(`No PDF found for fileId=${fileId}`);

  const srcDoc = await PDFDocument.load(rec.buf);
  const pageIndex = pageNumber - 1;
  if (pageIndex < 0 || pageIndex >= srcDoc.getPageCount()) {
    throw new Error(`Invalid page number ${pageNumber} for fileId=${fileId}`);
  }

  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
  newDoc.addPage(copiedPage);

  return newDoc.save();
}

/**
 * Build NUpPlan from current store state for front or back side
 */
export async function mapStoreToNUpPlan(
  side: "front" | "back"
): Promise<NUpPlan | null> {
  const state = useImpositionStore.getState();
  const selection =
    side === "front" ? state.frontSelection : state.backSelection;
  if (!selection) return null;

  // ---- Extract PDF page ----
  const pdfBytes = await extractPageAsPdfBytes(
    selection.fileId,
    selection.pageNumber
  );

  const { rows, cols } = computeLayout(state.paper, state.image);

  // ---- Layout info ----
  const layout = {
    rows: rows,
    cols: cols,
    auto: false,
  };

  const slotsCount = layout.rows * layout.cols;
  const defaultRotateDeg =
    side === "front"
      ? normalizeRotation(state.frontSlots[0]?.rotationDeg ?? 0)
      : normalizeRotation(state.backSlots[0]?.rotationDeg ?? 0);

  // ---- Build slots ----
  const slots: NUpPlan["slots"] = Array.from({ length: slotsCount }, () => ({
    pdfBytes,
    pageIndex: 0,
    rotateDeg: defaultRotateDeg,
  }));

  const margin = state.image.margin;
  // ---- Build plan ----
  const plan: NUpPlan = {
    paper: {
      widthMm: state.paper.width,
      heightMm: state.paper.height,
      marginMm: state.paper.margin,
    },
    slot: {
      trimSizeMm: {
        width: state.image.width,
        height: state.image.height,
      },
      bleedMm: {
        top: margin.top,
        bottom: margin.bottom,
        left: margin.left,
        right: margin.right,
      },
      defaultRotateDeg,
    },
    layout,
    marks: {
      cutLenMm: state.paper.cutMarkLengthMm ?? 3,
      cutStrokePt: 0.5,
      offsetMm: margin.top ?? 0,
    },
    color: { keepCMYK: true, markColor: "K100" },
    slots,
    meta: { title: "", author: "N-UPS Tool" }, // simplified for now
  };

  return plan;
}
