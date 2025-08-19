import { PDFDocument, rgb } from "pdf-lib";

const mmToPt = (mm: number) => mm * 2.83465;

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
interface Gap {
  horizontal: number;
  vertical: number;
}

interface ExportImpositionPdfParams {
  paper: { width: number; height: number; margin: Margin; gap: Gap };
  image: { width: number; height: number; margin?: Margin };
  sheets: Array<Array<{ src: string } | undefined>>;
  layout: { rows: number; cols: number };
  customerName?: string;
  description?: string;
  date?: string;

  // footer visibility (from zustand store)
  displayMeta?: boolean; // draw footer only when true

  // “+” mark settings
  cutMarkLengthMm?: number; // arm length (default 3 mm)
  cutMarkThicknessPt?: number; // stroke thickness (default 0.5 pt)
  cutMarkColor?: { r: number; g: number; b: number }; // 0–255 (default black)
  cutMarkCornerOffsetMm?: number; // push + outside(+) / inside(−) from slot corner (default 0)
}

// ---------- helpers ----------
function drawCrosshair(
  page: import("pdf-lib").PDFPage,
  cxPt: number,
  cyPt: number,
  armLenPt: number,
  color: import("pdf-lib").RGB,
  thickness: number
) {
  const half = armLenPt / 2;
  page.drawLine({
    start: { x: cxPt - half, y: cyPt },
    end: { x: cxPt + half, y: cyPt },
    color,
    thickness,
  });
  page.drawLine({
    start: { x: cxPt, y: cyPt - half },
    end: { x: cxPt, y: cyPt + half },
    color,
    thickness,
  });
}

/** Four “+” marks centered at the four corners of a RECT (generic; here we pass the OUTER slot). */
function drawCornerCrosshairs(
  page: import("pdf-lib").PDFPage,
  xPt: number,
  yPt: number,
  wPt: number,
  hPt: number,
  armLenPt: number,
  color: import("pdf-lib").RGB,
  thickness: number,
  cornerOffsetPt: number
) {
  const xL = xPt,
    xR = xPt + wPt;
  const yB = yPt,
    yT = yPt + hPt;

  drawCrosshair(
    page,
    xL - cornerOffsetPt,
    yT + cornerOffsetPt,
    armLenPt,
    color,
    thickness
  ); // TL
  drawCrosshair(
    page,
    xR + cornerOffsetPt,
    yT + cornerOffsetPt,
    armLenPt,
    color,
    thickness
  ); // TR
  drawCrosshair(
    page,
    xL - cornerOffsetPt,
    yB - cornerOffsetPt,
    armLenPt,
    color,
    thickness
  ); // BL
  drawCrosshair(
    page,
    xR + cornerOffsetPt,
    yB - cornerOffsetPt,
    armLenPt,
    color,
    thickness
  ); // BR
}

// ---------- main ----------
export async function exportImpositionPdf({
  paper,
  image,
  sheets,
  layout,
  customerName,
  description,
  date,
  displayMeta = true,
  cutMarkLengthMm = 3,
  cutMarkThicknessPt = 0.5,
  cutMarkColor = { r: 0, g: 0, b: 0 },
  cutMarkCornerOffsetMm = 0,
}: ExportImpositionPdfParams) {
  const pdfDoc = await PDFDocument.create();

  const rgbColor = rgb(
    (cutMarkColor.r ?? 0) / 255,
    (cutMarkColor.g ?? 0) / 255,
    (cutMarkColor.b ?? 0) / 255
  );
  const armLenPt = mmToPt(cutMarkLengthMm);
  const cornerOffsetPt = mmToPt(cutMarkCornerOffsetMm);

  // per-image margins (mm)
  const imgMargin = {
    top: image.margin?.top ?? 0,
    right: image.margin?.right ?? 0,
    bottom: image.margin?.bottom ?? 0,
    left: image.margin?.left ?? 0,
  };

  // inner image area (mm)
  const innerMmW = Math.max(
    0,
    image.width - (imgMargin.left + imgMargin.right)
  );
  const innerMmH = Math.max(
    0,
    image.height - (imgMargin.top + imgMargin.bottom)
  );

  for (const element of sheets) {
    const page = pdfDoc.addPage([mmToPt(paper.width), mmToPt(paper.height)]);
    const images = element;

    // center grid (mm)
    const usableW = paper.width - paper.margin.left - paper.margin.right;
    const usableH = paper.height - paper.margin.top - paper.margin.bottom;
    const gridW =
      layout.cols * image.width + (layout.cols - 1) * paper.gap.horizontal;
    const gridH =
      layout.rows * image.height + (layout.rows - 1) * paper.gap.vertical;
    const gridOffsetX = paper.margin.left + (usableW - gridW) / 2;
    const gridOffsetY = paper.margin.top + (usableH - gridH) / 2;

    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const idx = row * layout.cols + col;
        const img = images[idx];
        if (!img) continue;

        // OUTER slot (item) rect in points
        const slotXPt = mmToPt(
          gridOffsetX + col * (image.width + paper.gap.horizontal)
        );
        const slotYPt = mmToPt(
          paper.height -
            (gridOffsetY + (row + 1) * image.height + row * paper.gap.vertical)
        );
        const slotWPt = mmToPt(image.width);
        const slotHPt = mmToPt(image.height);

        // INNER rect (after per-image margins) in points
        const insetXPt = slotXPt + mmToPt(imgMargin.left);
        const insetYPt = slotYPt + mmToPt(imgMargin.bottom);
        const insetWPt = mmToPt(innerMmW);
        const insetHPt = mmToPt(innerMmH);

        // embed image
        const bytes = await fetch(img?.src as string).then((r) =>
          r.arrayBuffer()
        );
        let pdfImage;
        if (img.src.startsWith("data:image/png")) {
          pdfImage = await pdfDoc.embedPng(bytes);
        } else if (
          img.src.startsWith("data:image/jpeg") ||
          img.src.startsWith("data:image/jpg")
        ) {
          pdfImage = await pdfDoc.embedJpg(bytes);
        } else {
          throw new Error("Unsupported image format: must be PNG or JPEG");
        }

        // draw image (inner)
        page.drawImage(pdfImage, {
          x: insetXPt,
          y: insetYPt,
          width: insetWPt,
          height: insetHPt,
        });

        // draw four corner “+” marks based on OUTER slot (ignores inner margins)
        drawCornerCrosshairs(
          page,
          slotXPt,
          slotYPt,
          slotWPt,
          slotHPt,
          armLenPt,
          rgbColor,
          cutMarkThicknessPt,
          cornerOffsetPt
        );
      }
    }

    // footer only when displayMeta is true
    if (displayMeta && (customerName || description || date)) {
      page.drawText(
        `${customerName ?? ""}   ${description ?? ""}   ${date ?? ""}`,
        {
          x: mmToPt(10),
          y: mmToPt(7),
          size: 15,
        }
      );
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
