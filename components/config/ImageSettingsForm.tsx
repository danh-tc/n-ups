// components/config/ImageSettingsForm.tsx
"use client";
import "./image-settings-form.scss";
import type { ImageConfig, ImageMargin } from "@/types/types";

interface Props {
  value: ImageConfig;
  onChange: (next: ImageConfig) => void;
}

const num = (v: string) => (Number.isNaN(Number(v)) ? 0 : Number(v));

export const ImageSettingsForm: React.FC<Props> = ({ value, onChange }) => {
  const m: ImageMargin = value.margin ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return (
    <form
      className="rethink-image-settings-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="rethink-image-settings-form__section">
        <div className="rethink-image-settings-form__title">Image Size</div>
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
                onChange({ ...value, width: num(e.target.value) })
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
                onChange({ ...value, height: num(e.target.value) })
              }
            />
          </label>
        </div>
      </div>

      <div className="rethink-image-settings-form__section">
        <div className="rethink-image-settings-form__title">
          Image Margin (mm)
        </div>
        <div className="rethink-image-settings-form__grid rethink-image-settings-form__grid--margins">
          <label className="rethink-field">
            <span className="rethink-field__label">Top</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={1}
              value={m.top}
              onChange={(e) =>
                onChange({
                  ...value,
                  margin: { ...m, top: num(e.target.value) },
                })
              }
            />
          </label>
          <label className="rethink-field">
            <span className="rethink-field__label">Right</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={1}
              value={m.right}
              onChange={(e) =>
                onChange({
                  ...value,
                  margin: { ...m, right: num(e.target.value) },
                })
              }
            />
          </label>
          <label className="rethink-field">
            <span className="rethink-field__label">Bottom</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={1}
              value={m.bottom}
              onChange={(e) =>
                onChange({
                  ...value,
                  margin: { ...m, bottom: num(e.target.value) },
                })
              }
            />
          </label>
          <label className="rethink-field">
            <span className="rethink-field__label">Left</span>
            <input
              className="rethink-input"
              type="number"
              min={0}
              step={1}
              value={m.left}
              onChange={(e) =>
                onChange({
                  ...value,
                  margin: { ...m, left: num(e.target.value) },
                })
              }
            />
          </label>
        </div>

        <div className="rethink-image-settings-form__actions">
          <button
            type="button"
            className="rethink-btn rethink-btn--outline rethink-btn--sm"
            onClick={() =>
              onChange({
                ...value,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
              })
            }
          >
            Reset margins
          </button>
        </div>
      </div>
    </form>
  );
};
