import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createDefaultResumeDocument,
  defaultResumeDesign,
  normalizeResumeDesign,
  resumeDesignSchema,
  resumeDocumentSchema,
  richTextToPlainText,
} from "../../src/domain/resume";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), "fixtures", name), "utf8"));
}

describe("canonical resume schemas", () => {
  it("parses the golden resume fixture", () => {
    const parsed = resumeDocumentSchema.parse(fixture("golden-resume.json"));
    expect(parsed.personal.fullName).toBe("Alex Morgan");
    expect(parsed.sections.map((section) => section.type)).toContain("experience");
  });

  it("parses and fills defaults in the design fixture", () => {
    const parsed = resumeDesignSchema.parse(fixture("default-design.json"));
    expect(parsed.document.pageFormat).toBe("A4");
    expect(parsed.footer.alignment).toBe("center");
  });

  it("generates independent default documents", () => {
    const first = createDefaultResumeDocument();
    const second = createDefaultResumeDocument();
    expect(first.sections[0]?.id).not.toBe(second.sections[0]?.id);
    expect(resumeDocumentSchema.parse(first)).toEqual(first);
  });

  it("falls back safely when persisted design data is corrupt", () => {
    const recovered = normalizeResumeDesign({ document: { pageFormat: "Tabloid" } });
    expect(recovered).toEqual(defaultResumeDesign);
  });

  it("extracts plain text from legacy blocks and marked spans", () => {
    expect(
      richTextToPlainText([
        { type: "paragraph", text: "first" },
        { type: "bullet", text: "", spans: [{ text: "second", marks: ["bold"] }] },
      ]),
    ).toBe("first\nsecond");
  });

  it("rejects duplicate section identities", () => {
    const document = createDefaultResumeDocument();
    document.sections[1]!.id = document.sections[0]!.id;
    expect(resumeDocumentSchema.safeParse(document).success).toBe(false);
  });
});
