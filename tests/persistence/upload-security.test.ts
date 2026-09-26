import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { validatePhoto } from "@/features/editor/photo-validation";
import { buildPrivateImportPath, sanitizeImportFilename, validateImportSource } from "@/features/import/validation";

describe("trusted upload validation", () => {
  it("accepts only matching photo MIME/signature/size combinations", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(validatePhoto({ type: "image/png", size: png.length }, png)).toEqual({ extension: "png" });
    expect(() => validatePhoto({ type: "image/jpeg", size: png.length }, png)).toThrow(/not a valid/i);
    expect(() => validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 + 1 }, new Uint8Array(1))).toThrow(/5 MiB/i);
  });

  it("rejects import extension/MIME/signature mismatches and constructs a private sanitized path", () => {
    const text = new TextEncoder().encode("Alex Morgan\nSummary\nReliable engineer");
    expect(validateImportSource({ originalName: "resume.txt", mimeType: "text/plain", size: text.length }, text)).toBe("txt");
    expect(() => validateImportSource({ originalName: "resume.pdf", mimeType: "application/pdf", size: text.length }, text)).toThrow(/valid PDF/i);
    expect(() => validateImportSource({ originalName: "resume.txt", mimeType: "application/pdf", size: text.length }, text)).toThrow(/do not match/i);
    expect(sanitizeImportFilename("../private\\Alex:Resume.txt")).toBe("Alex_Resume.txt");
    expect(buildPrivateImportPath("../private\\Alex:Resume.txt", "fixed-key")).toBe("imports/pending/fixed-key/Alex_Resume.txt");
  });

  it("keeps user filenames out of photo object keys and uses server-side validation in both routes", () => {
    const photoRoute = readFileSync(resolve("src/app/api/resumes/[resumeId]/photo/route.ts"), "utf8");
    const resumeRoute = readFileSync(resolve("src/app/api/resumes/[resumeId]/route.ts"), "utf8");
    const importRoute = readFileSync(resolve("src/app/api/import/route.ts"), "utf8");
    expect(photoRoute).toContain("validatePhoto(file, bytes)");
    expect(photoRoute).toMatch(/resumes\/\$\{id\}\/photo\/\$\{crypto\.randomUUID\(\)\}/);
    expect(photoRoute).toContain("await bucket.remove([storagePath])");
    expect(resumeRoute).toContain("removePhotoIfUnreferenced");
    expect(importRoute).toContain("importResumeFile");
  });
});
