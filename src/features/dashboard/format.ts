const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units = [
  { name: "year", milliseconds: 31_536_000_000 },
  { name: "month", milliseconds: 2_592_000_000 },
  { name: "week", milliseconds: 604_800_000 },
  { name: "day", milliseconds: 86_400_000 },
  { name: "hour", milliseconds: 3_600_000 },
  { name: "minute", milliseconds: 60_000 },
] as const;

export function formatEditedTime(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Edited recently";

  const elapsed = timestamp - now;
  for (const unit of units) {
    if (Math.abs(elapsed) >= unit.milliseconds) {
      return `Edited ${relativeTime.format(Math.round(elapsed / unit.milliseconds), unit.name)}`;
    }
  }

  return "Edited just now";
}

export function sortByUpdatedAt<T extends { updatedAt: string }>(resumes: readonly T[]): T[] {
  return [...resumes].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}
