"use client";
import "./paper-settings-form.scss";

interface Props {
  value: {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    gap: { horizontal: number; vertical: number };
    duplex?: boolean;
    cutMarkLengthMm?: number;
  };
  onChange: (next: Props["value"]) => void;
}

/** Small epsilon for float comparison (e.g., 7.5) */
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const PRESETS = [
  {
    key: "KM1-S",
    label: "KM1 S",
    duplex: false,
    margin: { top: 4, bottom: 12, left: 15, right: 10 },
  },
  {
    key: "KM1/SHEET-D",
    label: "KM1/SHEET-D",
    duplex: true,
    margin: { top: 4, bottom: 12, left: 15, right: 15 },
  },
  {
    key: "SHEET-S",
    label: "Sheet S",
    duplex: false,
    margin: { top: 4, bottom: 12, left: 7.5, right: 15 },
  },
] as const;

export const PaperSettingsForm: React.FC<Props> = ({ value, onChange }) => {
  const applyPreset = (p: (typeof PRESETS)[number]) => {
    onChange({
      ...value,
      duplex: p.duplex,
      margin: { ...value.margin, ...p.margin },
    });
  };

  const isActivePreset = (p: (typeof PRESETS)[number]) =>
    Boolean(value.duplex) === p.duplex &&
    eq(value.margin.top, p.margin.top) &&
    eq(value.margin.bottom, p.margin.bottom) &&
    eq(value.margin.left, p.margin.left) &&
    eq(value.margin.right, p.margin.right);

  const safeNumber = (input: string) => Math.max(0, Number(input) || 0);

  // --- NEW: reset button handler ---
  const resetPaper = () => {
    onChange({
      ...value,
      width: 0,
      height: 0,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      cutMarkLengthMm: 0,
    });
  };

  const swapPaper = () => {
    onChange({
      ...value,
      width: value.height,
      height: value.width,
    });
  };

  const isResetDisabled =
    value.width === 0 &&
    value.height === 0 &&
    value.margin.top === 0 &&
    value.margin.right === 0 &&
    value.margin.bottom === 0 &&
    value.margin.left === 0 &&
    (value.cutMarkLengthMm ?? 0) === 0;

  return (
    <form className="rethink-paper-settings-form">
      <div className="rethink-paper-settings-form__printing">
        <label className="rethink-checkbox">
          <input
            className="rethink-checkbox__input"
            type="checkbox"
            checked={Boolean(value.duplex)}
            onChange={(e) => onChange({ ...value, duplex: e.target.checked })}
          />
          <span className="rethink-checkbox__box" aria-hidden />
          <span className="rethink-checkbox__label">
            Duplex printing
            <em className="rethink-checkbox__hint"> (unchecked = simplex)</em>
          </span>
        </label>

        <div className="rethink-paper-settings-form__actions">
          <button
            type="button"
            className="rethink-btn rethink-btn--sm rethink-btn--outline"
            onClick={resetPaper}
            disabled={isResetDisabled}
            title="Reset paper size, margins, and crop mark length to 0"
          >
            Reset to 0
          </button>
          <button
            type="button"
            className="rethink-btn rethink-btn--sm rethink-btn--outline"
            onClick={swapPaper}
            title="Swap paper width and height"
            style={{ marginLeft: 8 }}
          >
            Swap W↔H
          </button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="rethink-paper-settings-form__dimensions">
        <label>
          Paper Width (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            value={value.width}
            onChange={(e) =>
              onChange({ ...value, width: safeNumber(e.target.value) })
            }
          />
        </label>
        <label>
          Paper Height (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            value={value.height}
            onChange={(e) =>
              onChange({ ...value, height: safeNumber(e.target.value) })
            }
          />
        </label>
      </div>

      {/* Presets */}
      <div className="rethink-paper-settings-form__presets">
        <div className="rethink-paper-settings-form__presets-title">
          Quick Margins
        </div>
        {PRESETS.map((p) => {
          const active = isActivePreset(p);
          return (
            <button
              key={p.key}
              type="button"
              className={`rethink-btn rethink-btn--sm rethink-btn--outline rethink-chip ${
                active ? "is-active" : ""
              }`}
              aria-pressed={active}
              onClick={() => applyPreset(p)}
              title={`${p.label} · ${p.duplex ? "Duplex" : "Simplex"} (T${
                p.margin.top
              } B${p.margin.bottom} L${p.margin.left} R${p.margin.right})`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Margins */}
      <div className="rethink-paper-settings-form__margins">
        <label>
          Margin Top (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            value={value.margin.top}
            onChange={(e) =>
              onChange({
                ...value,
                margin: { ...value.margin, top: safeNumber(e.target.value) },
              })
            }
          />
        </label>
        <label>
          Margin Right (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            value={value.margin.right}
            onChange={(e) =>
              onChange({
                ...value,
                margin: { ...value.margin, right: safeNumber(e.target.value) },
              })
            }
          />
        </label>
        <label>
          Margin Bottom (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            value={value.margin.bottom}
            onChange={(e) =>
              onChange({
                ...value,
                margin: { ...value.margin, bottom: safeNumber(e.target.value) },
              })
            }
          />
        </label>
        <label>
          Margin Left (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            value={value.margin.left}
            onChange={(e) =>
              onChange({
                ...value,
                margin: { ...value.margin, left: safeNumber(e.target.value) },
              })
            }
          />
        </label>
      </div>

      <div className="rethink-paper-settings-form__marks">
        <label>
          Crop Marks Length (mm)
          <input
            className="rethink-input"
            type="number"
            min={0}
            step={0.5}
            value={value.cutMarkLengthMm ?? 5}
            onChange={(e) =>
              onChange({
                ...value,
                cutMarkLengthMm: safeNumber(e.target.value),
              })
            }
          />
        </label>
      </div>
    </form>
  );
};
