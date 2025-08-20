"use client";

import React, { useMemo } from "react";
import "./summary-table.scss";
import { useImpositionStore } from "@/store/useImpositionStore";
import type { PaperConfig, ImageConfig } from "@/types/types";

const clamp0 = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
const eq = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

function formatMm(n: number, digits = 1): string {
  return `${Number(n.toFixed(digits))} mm`;
}
function formatMm2(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 10000 ? 0 : 1;
  return `${Number(n.toFixed(digits)).toLocaleString()} mm²`;
}
function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Printed (placeable) area after margins AND crop-marks */
function computePrintedArea(paper: PaperConfig): {
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

/** Layout = rows/cols/items based on printed area + tag footprint */
function computeLayout(
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

  return { rows, cols, items: rows * cols, tagW, tagH, printedW, printedH };
}

export const SummaryTable: React.FC = () => {
  const paper = useImpositionStore((s) => s.paper);
  const image = useImpositionStore((s) => s.image);

  const { rows, cols, items, tagW, tagH, printedW, printedH } = useMemo(
    () => computeLayout(paper, image),
    [paper, image]
  );

  const printedArea = useMemo(() => printedW * printedH, [printedW, printedH]);

  const paperArea = clamp0(paper.width * paper.height);
  const scrapArea = Math.max(0, paperArea - printedArea);
  const scrapPct = paperArea > 0 ? (scrapArea / paperArea) * 100 : 0;

  const guttersH = image.margin?.left ?? 0;
  const guttersV = image.margin?.top ?? 0;

  return (
    <div className="rethink-summary">
      <div className="rethink-summary__header">
        <h3>Summary</h3>
        <div className="rethink-summary__mode">
          {paper.duplex ? "Duplex" : "Simplex"}
        </div>
      </div>

      <dl className="rethink-summary__grid">
        <div className="rethink-summary__row">
          <dt>Paper size</dt>
          <dd>
            {formatMm(paper.width)} × {formatMm(paper.height)}
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt>Gutter</dt>
          <dd>
            H {formatMm(guttersH)} • V {formatMm(guttersV)}
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt>Hangtag size</dt>
          <dd>
            {formatMm(image.width)} × {formatMm(image.height)}
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt>Layout</dt>
          <dd>
            {rows} × {cols} = <b>{items}</b> <span>items</span>
          </dd>
        </div>

        <div className="rethink-summary__row rethink-summary__row--wrap">
          <dt>Printed area</dt>
          <dd>
            {formatMm(printedW)} × {formatMm(printedH)} ={" "}
            <b>{formatMm2(printedArea)}</b>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt>Scrap</dt>
          <dd>
            {formatMm2(scrapArea)} • {formatPct(scrapPct)}
          </dd>
        </div>
      </dl>

      <div className="rethink-summary__footer">
        <span className="rethink-summary__muted">
          Tag footprint (including gutters): {formatMm(tagW)} × {formatMm(tagH)}
        </span>
        {eq(printedW, 0) || eq(printedH, 0) ? (
          <span className="rethink-summary__warn">
            Printed area is zero—check margins or crop mark length.
          </span>
        ) : null}
      </div>
    </div>
  );
};
