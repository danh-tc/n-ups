"use client";

import React, { useMemo } from "react";
import "./summary-table.scss";
import { useImpositionStore } from "@/store/useImpositionStore";
import type { PaperConfig, ImageConfig } from "@/types/types";
import {
  computeLayout,
  clamp0,
  eq,
  formatMm,
  formatMm2,
  formatPct,
} from "@/lib/imposition";

export const SummaryTable: React.FC = () => {
  const paper = useImpositionStore((s) => s.paper) as PaperConfig;
  const image = useImpositionStore((s) => s.image) as ImageConfig;

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
