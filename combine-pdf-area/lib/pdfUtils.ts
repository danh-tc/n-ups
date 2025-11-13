import { PDFDocument } from "pdf-lib";
import type { PdfFileRecord } from "./db";

export async function combinePdfs(files: PdfFileRecord[]): Promise<Blob> {
  const sorted = files.slice().sort((a, b) => a.order - b.order);
  const mergedPdf = await PDFDocument.create();

  for (const file of sorted) {
    const bytes = await file.file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();

  const ab = new ArrayBuffer(mergedBytes.length);
  const view = new Uint8Array(ab);
  view.set(mergedBytes);

  return new Blob([ab], { type: "application/pdf" });
}
