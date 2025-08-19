"use client";
import "./paper-settings-form.scss";

interface Props {
  value: {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    gap: { horizontal: number; vertical: number };
  };
  onChange: (next: Props["value"]) => void;
}

export const PaperSettingsForm: React.FC<Props> = ({ value, onChange }) => (
  <form className="rethink-paper-settings-form">
    <div className="rethink-paper-settings-form__dimensions">
      <label>
        Paper Width (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.width}
          onChange={(e) =>
            onChange({ ...value, width: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Paper Height (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.height}
          onChange={(e) =>
            onChange({ ...value, height: Number(e.target.value) })
          }
        />
      </label>
    </div>

    <div className="rethink-paper-settings-form__margins">
      <label>
        Margin Top (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.margin.top}
          onChange={(e) =>
            onChange({
              ...value,
              margin: { ...value.margin, top: Number(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Margin Right (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.margin.right}
          onChange={(e) =>
            onChange({
              ...value,
              margin: { ...value.margin, right: Number(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Margin Bottom (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.margin.bottom}
          onChange={(e) =>
            onChange({
              ...value,
              margin: { ...value.margin, bottom: Number(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Margin Left (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.margin.left}
          onChange={(e) =>
            onChange({
              ...value,
              margin: { ...value.margin, left: Number(e.target.value) },
            })
          }
        />
      </label>
    </div>

    <div className="rethink-paper-settings-form__gap">
      <label>
        Gap Horizontal (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.gap.horizontal}
          onChange={(e) =>
            onChange({
              ...value,
              gap: { ...value.gap, horizontal: Number(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Gap Vertical (mm)
        <input
          className="rethink-input"
          type="number"
          value={value.gap.vertical}
          onChange={(e) =>
            onChange({
              ...value,
              gap: { ...value.gap, vertical: Number(e.target.value) },
            })
          }
        />
      </label>
    </div>
  </form>
);
