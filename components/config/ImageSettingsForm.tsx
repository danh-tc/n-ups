"use client";
import "./image-settings-form.scss";
import type { ImageConfig, ImageMargin } from "@/types/types";

interface Props {
  value: ImageConfig;
  onChange: (next: ImageConfig) => void;
}

const safeNum = (v: string) => Math.max(0, Number(v) || 0);
const eq = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const PRESETS = [0, 1.5, 2.5, 3, 3.5];

export const ImageSettingsForm: React.FC<Props> = ({ value, onChange }) => {
  const m: ImageMargin = value.margin ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  // derive symmetric gutters (assume L=R and T=B; fall back to left/top)
  const gutterH = m.left ?? 0;
  const gutterV = m.top ?? 0;

  const setGutterH = (n: number) =>
    onChange({ ...value, margin: { ...m, left: n, right: n } });

  const setGutterV = (n: number) =>
    onChange({ ...value, margin: { ...m, top: n, bottom: n } });

  const applyBothGutters = (n: number) =>
    onChange({ ...value, margin: { top: n, right: n, bottom: n, left: n } });

  // NEW: reset all (width, height, all gutters -> 0)
  const resetAll = () =>
    onChange({
      ...value,
      width: 0,
      height: 0,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

  // NEW: swap W <-> H
  const swapSize = () =>
    onChange({
      ...value,
      width: value.height,
      height: value.width,
    });

  const isResetDisabled =
    value.width === 0 &&
    value.height === 0 &&
    (m.top ?? 0) === 0 &&
    (m.right ?? 0) === 0 &&
    (m.bottom ?? 0) === 0 &&
    (m.left ?? 0) === 0;

  // Active preset only if BOTH gutters match one of the preset values
  const activePreset =
    PRESETS.find((n) => eq(gutterH, n) && eq(gutterV, n)) ?? null;

  return (
    <form
      className="rethink-image-settings-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="rethink-image-settings-form__section">
        <div className="rethink-image-settings-form__title">Hangtag Size</div>
        <div
          className="rethink-image-settings-form__actions"
          style={{ marginTop: 8 }}
        >
          <button
            type="button"
            className="rethink-btn rethink-btn--outline rethink-btn--sm"
            onClick={swapSize}
            title="Swap width and height"
          >
            Swap W↔H
          </button>
          <button
            type="button"
            className="rethink-btn rethink-btn--outline rethink-btn--sm"
            onClick={resetAll}
            disabled={isResetDisabled}
            title="Reset width, height, and all gutters to 0"
            style={{ marginLeft: 8 }}
          >
            Reset All
          </button>
        </div>
        <div className="rethink-image-settings-form__grid">
          <label className="rethink-field">
            <span className="rethink-field__label">Width (mm)</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={1}
              value={value.width}
              onChange={(e) =>
                onChange({ ...value, width: safeNum(e.target.value) })
              }
            />
          </label>
          <label className="rethink-field">
            <span className="rethink-field__label">Height (mm)</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={1}
              value={value.height}
              onChange={(e) =>
                onChange({ ...value, height: safeNum(e.target.value) })
              }
            />
          </label>
        </div>
      </div>

      {/* Gutter controls */}
      <div className="rethink-image-settings-form__section">
        <div className="rethink-image-settings-form__title">Gutter (mm)</div>

        {/* Quick applies: 0 / 1.5 / 2.5 / 3 / 3.5 (applies to BOTH H & V) */}
        <div
          className="rethink-image-settings-form__presets"
          style={{ marginBottom: 8 }}
          role="group"
          aria-label="Gutter presets"
        >
          {PRESETS.map((n) => {
            const active = activePreset !== null && eq(activePreset, n);
            return (
              <button
                key={n}
                type="button"
                className={`rethink-btn rethink-btn--outline rethink-btn--sm ${
                  active ? "is-active" : ""
                }`}
                aria-pressed={active}
                onClick={() => applyBothGutters(n)}
                title={`Set both gutters to ${n}mm`}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="rethink-image-settings-form__grid rethink-image-settings-form__grid--margins">
          <label className="rethink-field">
            <span className="rethink-field__label">Gutter Horizontal (mm)</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={0.5}
              value={gutterH}
              onChange={(e) => setGutterH(safeNum(e.target.value))}
            />
          </label>
          <label className="rethink-field">
            <span className="rethink-field__label">Gutter Vertical (mm)</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={0.5}
              value={gutterV}
              onChange={(e) => setGutterV(safeNum(e.target.value))}
            />
          </label>
        </div>
      </div>
    </form>
  );
};
