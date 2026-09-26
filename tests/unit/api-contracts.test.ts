import { describe, expect, it } from "vitest";

import { importSourceSchema, updateResumeRequestSchema } from "../../src/server/api/contracts";

describe("API contracts", () => {
  it("requires a lock version and a non-empty autosave patch", () => {
    expect(updateResumeRequestSchema.safeParse({ expectedVersion: 0, patch: {} }).success).toBe(false);
    expect(updateResumeRequestSchema.safeParse({ expectedVersion: 4, patch: { title: "Final" } }).success).toBe(true);
  });

  it("enforces the private import size and MIME allowlist", () => {
    expect(importSourceSchema.safeParse({ originalName: "resume.pdf", mimeType: "application/pdf", size: 1024 }).success).toBe(true);
    expect(importSourceSchema.safeParse({ originalName: "payload.exe", mimeType: "application/octet-stream", size: 1024 }).success).toBe(false);
    expect(importSourceSchema.safeParse({ originalName: "huge.pdf", mimeType: "application/pdf", size: 16 * 1024 * 1024 }).success).toBe(false);
  });
});
