"use client";

import "./summary-table.scss";

interface Props {
  paper: { width: number; height: number };
  image: { width: number; height: number };
  layout: { rows: number; cols: number; totalSlots: number };
  gap: { horizontal: number; vertical: number };
  margin: { top: number; right: number; bottom: number; left: number };
}

export const SummaryTable: React.FC<Props> = ({
  paper,
  image,
  layout,
  gap,
  margin,
}) => {
  const printedWidth =
    layout.cols * image.width + (layout.cols - 1) * gap.horizontal;
  const printedHeight =
    layout.rows * image.height + (layout.rows - 1) * gap.vertical;

  const paperArea = paper.width * paper.height;
  const printedArea = printedWidth * printedHeight;
  const usageRaw = (printedArea / paperArea) * 100;
  const usagePercent = usageRaw.toFixed(2);
  const usageClamped = Math.max(0, Math.min(100, usageRaw)); // for bar width

  return (
    <section className="rethink-summary" aria-label="Layout summary">
      <dl className="rethink-summary__list">
        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Paper Size</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">
              {paper.width}mm × {paper.height}mm
            </span>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Margin (T/R/B/L)</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">
              {margin.top} / {margin.right} / {margin.bottom} / {margin.left} mm
            </span>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Gap (Vertical × Horizontal)</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">
              {gap.vertical}mm × {gap.horizontal}mm
            </span>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Image Size</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">
              {image.width}mm × {image.height}mm
            </span>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Grid</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">
              {layout.rows} rows × {layout.cols} columns
            </span>
          </dd>
        </div>

        <div className="rethink-summary__row rethink-summary__row--em">
          <dt className="rethink-summary__label">Total Slots</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">{layout.totalSlots}</span>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Printed Area (incl. gap)</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">
              {printedWidth.toFixed(1)}mm × {printedHeight.toFixed(1)}mm
            </span>
          </dd>
        </div>

        <div className="rethink-summary__row">
          <dt className="rethink-summary__label">Usage</dt>
          <dd className="rethink-summary__value-cell">
            <span className="rethink-summary__value">{usagePercent}%</span>
            <div
              className="rethink-summary__usage"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(usagePercent)}
              aria-label="Paper area used"
            >
              <div
                className="rethink-summary__usage-fill"
                style={{ width: `${usageClamped}%` }} // dynamic inline width only
              />
            </div>
            <span className="rethink-summary__usage-note">of paper area</span>
          </dd>
        </div>
      </dl>
    </section>
  );
};
