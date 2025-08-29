"use client";
import "./meta-info-form.scss";

export interface MetaInfo {
  customerName?: string;
  date?: string; // yyyy-mm-dd or ''
  description?: string;
}

interface Props {
  value: MetaInfo; // accept optional
  onChange: (next: MetaInfo) => void;
  displayMeta: boolean;
  onDisplayMetaChange: (next: boolean) => void;
}

export const MetaInfoForm: React.FC<Props> = ({
  value,
  onChange,
  displayMeta,
  onDisplayMetaChange,
}) => {
  const customerName = value.customerName ?? "";
  const date = value.date ?? "";
  const description = value.description ?? "";

  return (
    <div
      className={`rethink-meta-info-form ${
        !displayMeta ? "rethink-meta-info-form--muted" : ""
      }`}
    >
      <form className="rethink-meta-info-form__content">
        <label className="rethink-meta-info-form__checkbox">
          <input
            type="checkbox"
            checked={displayMeta}
            onChange={(e) => onDisplayMetaChange(e.target.checked)}
            aria-label="Toggle printing metadata"
          />
          Print metadata
        </label>

        <label className="rethink-meta-info-form__field">
          Customer Name
          <input
            className="rethink-input"
            type="text"
            value={customerName}
            onChange={(e) =>
              onChange({ ...value, customerName: e.target.value })
            }
            disabled={!displayMeta}
          />
        </label>

        <label className="rethink-meta-info-form__field">
          Date
          <input
            className="rethink-input"
            type="date"
            value={date}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
            disabled={!displayMeta}
          />
        </label>

        <label className="rethink-meta-info-form__field rethink-meta-info-form__field--wide">
          Description
          <input
            className="rethink-input"
            type="text"
            value={description}
            onChange={(e) =>
              onChange({ ...value, description: e.target.value })
            }
            disabled={!displayMeta}
            placeholder="Notes…"
          />
        </label>
      </form>
    </div>
  );
};
