"use client";

import React, { JSX, useCallback, useState } from "react";
import { cmyk, PDFDocument } from "pdf-lib";
import { exportNUp } from "@/lib/exportNUp"; // adjust if different
import type { NUpPlan } from "@/lib/exportNUp";

/* ---------- tiny helpers (ESLint-clean) ---------- */
const MM_TO_PT = 72 / 25.4;
const mmToPt = (mm: number): number => mm * MM_TO_PT;

export async function makeDummyPdf(
  widthMm = 110,
  heightMm = 50
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([mmToPt(widthMm), mmToPt(heightMm)]);
  // Draw a nearly invisible 0.1pt rectangle in CMYK white to create a /Contents stream
  page.drawRectangle({
    x: 0,
    y: 0,
    width: mmToPt(widthMm),
    height: mmToPt(heightMm),
    color: cmyk(0, 1, 1, 0), // values are 0–1, so 30% = 0.3, 5% = 0.05
  });
  return doc.save({ useObjectStreams: true });
}

function downloadBytes(bytes: Uint8Array, filename = "nup-test.pdf"): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- page component ---------- */
export default function TestNupPage(): JSX.Element {
  const [status, setStatus] = useState<string>("");

  const handleCreate = useCallback(async (): Promise<void> => {
    setStatus("Building plan...");

    // 1) Hardcoded sample config (you can wire from store later)
    const paper: NUpPlan["paper"] = {
      widthMm: 478,
      heightMm: 320,
      marginMm: { top: 4, right: 15, bottom: 12, left: 15 },
    };

    const image = { width: 110, height: 50 } as const; // trim
    const gutter = { horizontal: 1.5, vertical: 1.5 } as const; // bleed
    const layout = { rows: 4, cols: 4, auto: false } as const;

    // 2) One dummy PDF for all slots
    const pdfBytes = await makeDummyPdf(
      image.width + 2 * gutter.horizontal,
      image.height + 2 * gutter.vertical
    );
    const slotsCount = layout.rows * layout.cols;
    const slots: NUpPlan["slots"] = Array.from({ length: slotsCount }, () => ({
      pdfBytes,
      pageIndex: 0,
      rotateDeg: 0,
    }));

    // 3) Hardcoded marks & color
    const marks: NUpPlan["marks"] = {
      cutLenMm: 3,
      cutStrokePt: 0.5,
      offsetMm: 1.5,
    };
    const color: NUpPlan["color"] = { keepCMYK: true, markColor: "K100" };

    const plan: NUpPlan = {
      paper,
      slot: {
        trimSizeMm: { width: image.width, height: image.height },
        bleedMm: {
          top: gutter.vertical,
          right: gutter.horizontal,
          bottom: gutter.vertical,
          left: gutter.horizontal,
        },
        defaultRotateDeg: 0,
      },
      layout,
      marks,
      color,
      slots,
      meta: { title: "N-UPS Test", author: "N-UPS Tool" },
    };

    // 4) Export and download
    setStatus("Rendering PDF...");
    const bytes = await exportNUp(plan);
    downloadBytes(bytes);
    setStatus(`Done (${bytes.length.toLocaleString()} bytes)`);
  }, []);

  return (
    <main className="p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">N-Up Test</h1>
      <button
        type="button"
        onClick={handleCreate}
        className="px-4 py-2 rounded-2xl shadow border hover:opacity-90"
      >
        Create PDF
      </button>
      <p className="text-sm opacity-80">{status}</p>
    </main>
  );
}
