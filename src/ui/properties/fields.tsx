import { useEffect, useState } from "react";
import { FONT_SIZES } from "../../core/store/uiState";

interface ColorFieldProps {
  readonly label: string;
  readonly value: string;
  readonly swatches: readonly string[];
  onChange(color: string): void;
}

export function ColorField({ label, value, swatches, onChange }: ColorFieldProps) {
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      <div className="swatches">
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className="swatch"
            style={{ background: swatch }}
            aria-pressed={swatch.toLowerCase() === value.toLowerCase()}
            aria-label={swatch}
            onClick={() => onChange(swatch)}
          />
        ))}
        <label className="swatch swatch-custom" title="Custom colour">
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
      </div>
    </fieldset>
  );
}

interface SliderFieldProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string;
  /** Called continuously while dragging, to show the change live. */
  onPreview(value: number): void;
  /** Called once when the user lets go. */
  onCommit(value: number): void;
}

export function SliderField({ label, value, min, max, step, unit, onPreview, onCommit }: SliderFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="mono muted">
          {draft}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => {
          const next = Number(event.target.value);
          setDraft(next);
          onPreview(next);
        }}
        onPointerUp={() => onCommit(draft)}
        onKeyUp={() => onCommit(draft)}
      />
    </label>
  );
}

interface FontSizeFieldProps {
  readonly value: number;
  onChange(size: number): void;
}

export function FontSizeField({ value, onChange }: FontSizeFieldProps) {
  // Keep sizes that aren't in the standard list (e.g. from older edits) selectable.
  const sizes = FONT_SIZES.includes(value) ? FONT_SIZES : [...FONT_SIZES, value].sort((a, b) => a - b);
  return (
    <label className="field">
      <span className="field-label">Size</span>
      <span className="select">
        <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size} pt
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
