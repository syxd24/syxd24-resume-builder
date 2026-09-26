import { describe, expect, it } from "vitest";

import { formatEditedTime, sortByUpdatedAt } from "../../src/features/dashboard/format";

describe("dashboard date formatting", () => {
  const now = Date.parse("2026-09-23T12:00:00.000Z");

  it("formats recent and elapsed edits for card metadata", () => {
    expect(formatEditedTime("2026-09-23T11:59:40.000Z", now)).toBe("Edited just now");
    expect(formatEditedTime("2026-09-23T10:00:00.000Z", now)).toBe("Edited 2 hours ago");
    expect(formatEditedTime("not-a-date", now)).toBe("Edited recently");
  });

  it("sorts newest-first without mutating the API response", () => {
    const original = [
      { id: "older", updatedAt: "2026-09-20T00:00:00.000Z" },
      { id: "newer", updatedAt: "2026-09-22T00:00:00.000Z" },
    ];

    expect(sortByUpdatedAt(original).map(({ id }) => id)).toEqual(["newer", "older"]);
    expect(original.map(({ id }) => id)).toEqual(["older", "newer"]);
  });
});
