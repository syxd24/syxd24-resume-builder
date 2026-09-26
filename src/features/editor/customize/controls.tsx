"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import styles from "./customize.module.css";

export type SelectOption<T extends string> = Readonly<{
  label: string;
  value: T;
}>;

type FieldProps = Readonly<{
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}>;

export function Field({ label, hint, children }: FieldProps) {
  const id = useId();

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
    </div>
  );
}

type SelectControlProps<T extends string> = Readonly<{
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
}>;

export function SelectControl<T extends string>({ label, value, options, onChange, hint }: SelectControlProps<T>) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value as T)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

type TextControlProps = Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxLength?: number;
}>;

export function TextControl({ label, value, onChange, hint, maxLength }: TextControlProps) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input
          id={id}
          className={styles.textInput}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

type SegmentedControlProps<T extends string> = Readonly<{
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
}>;

export function SegmentedControl<T extends string>({ label, value, options, onChange, hint }: SegmentedControlProps<T>) {
  const groupLabelId = useId();

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel} id={groupLabelId}>
        {label}
      </span>
      <div className={styles.segmented} role="radiogroup" aria-labelledby={groupLabelId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? styles.segmentActive : styles.segment}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
    </div>
  );
}

type SwitchControlProps = Readonly<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}>;

export function SwitchControl({ label, checked, onChange, hint }: SwitchControlProps) {
  const id = useId();

  return (
    <div className={styles.switchRow}>
      <div>
        <label className={styles.switchLabel} htmlFor={id}>
          {label}
        </label>
        {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
      </div>
      <input id={id} className={styles.checkbox} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </div>
  );
}

function decimalPlaces(step: number) {
  const fraction = step.toString().split(".")[1];
  return fraction?.length ?? 0;
}

export function stepValue(value: number, direction: -1 | 1, min: number, max: number, step: number) {
  const stepped = Math.min(max, Math.max(min, value + direction * step));
  return Number(stepped.toFixed(decimalPlaces(step)));
}

type StepperControlProps = Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  hint?: string;
  disabled?: boolean;
}>;

export function StepperControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = String,
  hint,
  disabled = false,
}: StepperControlProps) {
  const id = useId();

  return (
    <div className={styles.field}>
      <div className={styles.stepperHeading}>
        <label className={styles.fieldLabel} htmlFor={id}>
          {label}
        </label>
        <output className={styles.stepperValue} htmlFor={id}>
          {formatValue(value)}
        </output>
      </div>
      <div className={styles.stepperRow}>
        <button
          type="button"
          className={styles.stepButton}
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(stepValue(value, -1, min, max, step))}
        >
          −
        </button>
        <input
          id={id}
          className={styles.range}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <button
          type="button"
          className={styles.stepButton}
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(stepValue(value, 1, min, max, step))}
        >
          +
        </button>
      </div>
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
    </div>
  );
}

type ColorControlProps = Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: readonly string[];
}>;

const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export function ColorControl({ label, value, onChange, presets }: ColorControlProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const updateDraft = (next: string) => {
    const normalized = next.startsWith("#") ? next : `#${next}`;
    setDraft(normalized);
    if (HEX_COLOR.test(normalized)) onChange(normalized.toUpperCase());
  };

  return (
    <div className={styles.colorRow}>
      <label className={styles.fieldLabel} htmlFor={`${id}-text`}>
        {label}
      </label>
      <div className={styles.colorInputs}>
        <input
          id={`${id}-picker`}
          className={styles.colorPicker}
          type="color"
          value={value}
          aria-label={`${label} color picker`}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <input
          id={`${id}-text`}
          className={HEX_COLOR.test(draft) ? styles.colorText : styles.colorTextInvalid}
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!HEX_COLOR.test(draft)}
          onChange={(event) => updateDraft(event.target.value)}
          onBlur={() => {
            if (!HEX_COLOR.test(draft)) setDraft(value);
          }}
        />
      </div>
      {presets?.length ? (
        <div className={styles.colorPresets} aria-label={`${label} presets`}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={value.toUpperCase() === preset.toUpperCase() ? styles.colorPresetActive : styles.colorPreset}
              style={{ backgroundColor: preset }}
              aria-label={`Set ${label} to ${preset}`}
              aria-pressed={value.toUpperCase() === preset.toUpperCase()}
              onClick={() => onChange(preset.toUpperCase())}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type SettingsCardProps = Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
}>;

export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <section className={styles.card} aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>
      <header className={styles.cardHeader}>
        <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}
