import type { DateRange, ResumeDate, ResumeDesign } from "@/domain/resume";

export type PageFormat = "A4" | "Letter";

export const PAGE_DIMENSIONS: Record<PageFormat, { cssWidth: string; cssHeight: string; widthMm: number; heightMm: number }> = {
  A4: { cssWidth: "210mm", cssHeight: "297mm", widthMm: 210, heightMm: 297 },
  Letter: { cssWidth: "8.5in", cssHeight: "11in", widthMm: 215.9, heightMm: 279.4 },
};

const MONTHS: Record<ResumeDesign["document"]["language"], readonly string[]> = {
  "en-GB": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "de-DE": ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  "pl-PL": ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
};

const CURRENT_LABEL: Record<ResumeDesign["document"]["language"], string> = {
  "en-GB": "Present",
  "de-DE": "Heute",
  "pl-PL": "Obecnie",
};

function paddedMonth(month: number | undefined): string {
  return month ? String(month).padStart(2, "0") : "";
}

export function formatResumeDate(date: ResumeDate | undefined, design: ResumeDesign): string {
  if (!date) return "";
  if (date.raw?.trim()) return date.raw.trim();
  if (!date.year && !date.month) return "";

  const year = date.year ? String(date.year) : "";
  const month = paddedMonth(date.month);

  switch (design.document.dateFormat) {
    case "MMM YYYY":
      return [date.month ? MONTHS[design.document.language][date.month - 1] : "", year].filter(Boolean).join(" ");
    case "YYYY-MM-DD":
      return [year, month].filter(Boolean).join("-");
    case "DD/MM/YYYY":
    case "MM/DD/YYYY":
    case "MM/YYYY":
      return [month, year].filter(Boolean).join("/");
  }
}

export function formatDateRange(range: DateRange | undefined, design: ResumeDesign): string {
  if (!range) return "";
  const start = formatResumeDate(range.start, design);
  const end = range.current ? CURRENT_LABEL[design.document.language] : formatResumeDate(range.end, design);
  return [start, end].filter(Boolean).join(" – ");
}

export function joinMetadata(parts: Array<string | undefined>, separator: string): string {
  return parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)).join(separator);
}

export function safeHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:" || url.protocol === "tel:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function emailHref(email: string): string {
  return `mailto:${email.trim()}`;
}

export function phoneHref(phone: string): string {
  const normalized = phone.replace(/[^+\d]/g, "");
  return `tel:${normalized}`;
}

const FONT_STACKS: Record<string, string> = {
  Alegreya: '"Alegreya", Inter, "Source Sans 3", "Segoe UI", Arial, ui-sans-serif, system-ui, sans-serif',
  Georgia: 'Georgia, "Times New Roman", serif',
  Inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  Lato: 'Lato, ui-sans-serif, system-ui, sans-serif',
  Merriweather: 'Merriweather, Georgia, "Times New Roman", serif',
  "Source Sans 3": '"Source Sans 3", "Segoe UI", Arial, sans-serif',
  "Times New Roman": '"Times New Roman", Times, serif',
};

export function fontStack(font: string): string {
  if (FONT_STACKS[font]) return FONT_STACKS[font];
  const safeName = font.replace(/["'\\;]/g, "").trim();
  return safeName ? `"${safeName}", ui-sans-serif, system-ui, sans-serif` : FONT_STACKS.Inter!;
}
