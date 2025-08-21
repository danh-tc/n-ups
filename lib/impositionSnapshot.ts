// import type { PaperConfig, ImageConfig, UploadedImage } from "@/types/types";
// import { computeLayout, clamp0 } from "@/lib/imposition";

// export interface SlotRect {
//   x: number;
//   y: number;
//   w: number;
//   h: number; // mm
// }

// export interface SlotSnapshot {
//   index: number; // r*cols + c
//   row: number;
//   col: number;
//   footprint: SlotRect; // tag footprint (image + gutter)
//   inset: SlotRect; // hangtag safe = image size
//   image?: Pick<UploadedImage, "id" | "name" | "src"> & {
//     crop?: { x: number; y: number; w: number; h: number }; // optional, mm or pct
//   };
// }

// export interface ImpositionSnapshot {
//   schemaVersion: 1;
//   paper: Pick<PaperConfig, "width" | "height" | "margin" | "cutMarkLengthMm">;
//   printed: { x: number; y: number; w: number; h: number }; // mm, origin at paper top-left
//   grid: {
//     rows: number;
//     cols: number;
//     cellW: number;
//     cellH: number;
//     totalW: number;
//     totalH: number;
//     left: number;
//     top: number;
//   }; // mm
//   slots: SlotSnapshot[];
//   meta?: { customerName?: string; date?: string; description?: string };
// }

// /** Build an export-ready snapshot in **mm** (no screen scaling). */
// export function buildImpositionSnapshot(
//   paper: PaperConfig,
//   image: ImageConfig,
//   images?: (UploadedImage | undefined)[],
//   meta?: ImpositionSnapshot["meta"]
// ): ImpositionSnapshot {
//   const { rows, cols, tagW, tagH, printedW, printedH } = computeLayout(
//     paper,
//     image
//   );

//   // Printed area position relative to paper (mm)
//   const cut = clamp0(paper.cutMarkLengthMm ?? 0);
//   const printedX = clamp0(paper.margin.left + cut);
//   const printedY = clamp0(paper.margin.top + cut);

//   // Grid dimensions (gutter already in tagW/tagH; CSS gap=0)
//   const gridW = cols > 0 ? cols * tagW : 0;
//   const gridH = rows > 0 ? rows * tagH : 0;

//   // Placement: horizontally centered, vertically **bottom-aligned** to printed area
//   const gridLeft = printedX + (printedW - gridW) / 2;
//   const gridTop = printedY + printedH - gridH;

//   // Inset = image size (hangtag safe)
//   const m = image.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
//   const insetW = Math.max(0, image.width);
//   const insetH = Math.max(0, image.height);

//   const slots: SlotSnapshot[] = [];
//   for (let r = 0; r < rows; r += 1) {
//     for (let c = 0; c < cols; c += 1) {
//       const index = r * cols + c;
//       const fx = gridLeft + c * tagW;
//       const fy = gridTop + r * tagH;

//       const insetX = fx + clamp0(m.left);
//       const insetY = fy + clamp0(m.top);

//       const slot: SlotSnapshot = {
//         index,
//         row: r,
//         col: c,
//         footprint: { x: fx, y: fy, w: tagW, h: tagH },
//         inset: { x: insetX, y: insetY, w: insetW, h: insetH },
//         image: images?.[index]
//           ? {
//               id: images![index]!.id,
//               name: images![index]!.name,
//               src: images![index]!.src,
//             }
//           : undefined,
//       };
//       slots.push(slot);
//     }
//   }

//   return {
//     schemaVersion: 1,
//     paper: {
//       width: paper.width,
//       height: paper.height,
//       margin: paper.margin,
//       cutMarkLengthMm: paper.cutMarkLengthMm ?? 0,
//     },
//     printed: { x: printedX, y: printedY, w: printedW, h: printedH },
//     grid: {
//       rows,
//       cols,
//       cellW: tagW,
//       cellH: tagH,
//       totalW: gridW,
//       totalH: gridH,
//       left: gridLeft,
//       top: gridTop,
//     },
//     slots,
//     meta,
//   };
// }
