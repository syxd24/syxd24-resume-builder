"use client";

import { useEffect, useId, useState } from "react";
import type { DateRange, ResumeDate } from "@/domain/resume/schema";
import { normalizeUrl } from "./editor-utils";
import styles from "./content-editor.module.css";

type TextFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  multiline?: boolean;
  required?: boolean;
};

export function TextField({
  label,
  value = "",
  onChange,
  placeholder,
  type = "text",
  multiline = false,
  required = false,
}: TextFieldProps) {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={3}
          placeholder={placeholder}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

type UrlFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function UrlField({ label, value = "", onChange, placeholder = "example.com" }: UrlFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const normalized = normalizeUrl(draft);
    setDraft(normalized);
    onChange(normalized);
  };

  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        inputMode="url"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type DateEditorProps = {
  label: string;
  value?: ResumeDate;
  onChange: (value: ResumeDate | undefined) => void;
};

export function DateEditor({ label, value, onChange }: DateEditorProps) {
  const [yearDraft, setYearDraft] = useState(value?.year?.toString() ?? "");

  useEffect(() => setYearDraft(value?.year?.toString() ?? ""), [value?.year]);

  const setPart = (patch: Partial<ResumeDate>) => {
    const next = { ...value, ...patch };
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, item]) => item !== undefined && item !== ""),
    ) as ResumeDate;
    onChange(Object.keys(cleaned).length ? cleaned : undefined);
  };

  const commitYear = () => {
    const year = Number(yearDraft);
    if (!yearDraft.trim()) {
      setPart({ year: undefined });
      return;
    }
    if (Number.isInteger(year) && year >= 1900 && year <= 2200) {
      setPart({ year });
    } else {
      setYearDraft(value?.year?.toString() ?? "");
    }
  };

  return (
    <fieldset className={styles.dateEditor}>
      <legend>{label}</legend>
      <label>
        <span>Month</span>
        <select
          value={value?.month ?? ""}
          onChange={(event) => setPart({ month: event.target.value ? Number(event.target.value) : undefined })}
        >
          <option value="">Month</option>
          {MONTHS.map((month, index) => (
            <option key={month} value={index + 1}>{month}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Year</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={yearDraft}
          placeholder="YYYY"
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, 4);
            setYearDraft(next);
            const year = Number(next);
            if (next.length === 4 && year >= 1900 && year <= 2200) setPart({ year });
          }}
          onBlur={commitYear}
        />
      </label>
      <label className={styles.dateRaw}>
        <span>Display text (optional)</span>
        <input
          value={value?.raw ?? ""}
          placeholder="e.g. Spring 2024"
          onChange={(event) => setPart({ raw: event.target.value || undefined })}
        />
      </label>
    </fieldset>
  );
}

type DateRangeEditorProps = {
  value?: DateRange;
  onChange: (value: DateRange | undefined) => void;
  currentLabel?: string;
};

export function DateRangeEditor({ value, onChange, currentLabel = "Currently here" }: DateRangeEditorProps) {
  const range: DateRange = value ?? { current: false };
  const setRange = (patch: Partial<DateRange>) => onChange({ ...range, ...patch });
  return (
    <fieldset className={styles.dateRange}>
      <legend>Dates</legend>
      <div className={styles.dateRangeGrid}>
        <DateEditor label="Start" value={range.start} onChange={(start) => setRange({ start })} />
        {!range.current ? (
          <DateEditor label="End" value={range.end} onChange={(end) => setRange({ end })} />
        ) : null}
      </div>
      <label className={styles.checkField}>
        <input
          type="checkbox"
          checked={range.current}
          onChange={(event) => setRange({ current: event.target.checked })}
        />
        <span>{currentLabel}</span>
      </label>
    </fieldset>
  );
}

type LevelFieldProps = {
  label?: string;
  value?: number;
  onChange: (value: number | undefined) => void;
};

export function LevelField({ label = "Level", value, onChange }: LevelFieldProps) {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}{value === undefined ? " (not set)" : ` — ${value}%`}</span>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value ?? 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {value !== undefined ? (
        <button type="button" className={styles.textButton} onClick={() => onChange(undefined)}>Clear level</button>
      ) : null}
    </label>
  );
}
