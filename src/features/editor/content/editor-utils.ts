import type { ResumeDocument, ResumeSection } from "@/domain/resume/schema";

export function createEditorId(prefix: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return [...items];
  next.splice(to, 0, item);
  return next;
}

export function replaceSection(document: ResumeDocument, updated: ResumeSection): ResumeDocument {
  return {
    ...document,
    sections: document.sections.map((section) => (section.id === updated.id ? updated : section)),
  };
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function hasSubstantialContent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 20;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.some(hasSubstantialContent);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => !["id", "visible"].includes(key) && hasSubstantialContent(child));
  }
  return false;
}

