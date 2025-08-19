"use client";
import "./meta-info-form.scss";

interface Props {
  value: { customerName: string; date: string; description: string };
  onChange: (next: Props["value"]) => void;
  displayMeta: boolean;
  onDisplayMetaChange: (next: boolean) => void;
}

export const MetaInfoForm: React.FC<Props> = ({
  value,
  onChange,
  displayMeta,
  onDisplayMetaChange,
}) => (
  <div
    className={`rethink-meta-info-form ${
      !displayMeta ? "rethink-meta-info-form--muted" : ""
    }`}
  >
    <form className="rethink-meta-info-form__content">
      {/* Checkbox */}
      <label className="rethink-meta-info-form__checkbox">
        <input
          type="checkbox"
          checked={displayMeta}
          onChange={(e) => onDisplayMetaChange(e.target.checked)}
          aria-label="Toggle printing metadata"
        />
        Print metadata
      </label>

      {/* Fields (wrap when space is tight) */}
      <label className="rethink-meta-info-form__field">
        Customer Name
        <input
          className="rethink-input"
          type="text"
          value={value.customerName}
          onChange={(e) => onChange({ ...value, customerName: e.target.value })}
          disabled={!displayMeta}
        />
      </label>

      <label className="rethink-meta-info-form__field">
        Date
        <input
          className="rethink-input"
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          disabled={!displayMeta}
        />
      </label>

      <label className="rethink-meta-info-form__field rethink-meta-info-form__field--wide">
        Description
        <input
          className="rethink-input"
          type="text"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          disabled={!displayMeta}
          placeholder="Notes…"
        />
      </label>
    </form>
  </div>
);
