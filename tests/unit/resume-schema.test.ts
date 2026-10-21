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
    expect(parsed.personal.details).toHaveLength(2);
    expect(parsed.personal.details[1]).toMatchObject({
      kind: "work-authorization",
      visible: true,
    });
    expect(parsed.sections.map((section) => section.type)).toContain("experience");
  });

  it("persists flexible personal details while remaining compatible with older documents", () => {
    const document = createDefaultResumeDocument();
    document.personal.details = [
      {
        id: "detail-work-authorization",
        kind: "work-authorization",
        label: "Work Authorization",
        value: "Authorized to work in Poland | No sponsorship required",
        visible: true,
      },
    ];

    const roundTrip = resumeDocumentSchema.parse(JSON.parse(JSON.stringify(document)));
    expect(roundTrip.personal.details).toEqual(document.personal.details);

    const legacy = structuredClone(document) as unknown as { personal: Record<string, unknown> };
    delete legacy.personal.details;
    expect(resumeDocumentSchema.parse(legacy).personal.details).toEqual([]);
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
