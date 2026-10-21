import { describe, expect, it } from "vitest";
import { createDefaultResumeDocument, resumeDocumentSchema } from "@/domain/resume/schema";
import {
  addPersonalDetail,
  addPersonalLink,
  appendEntry,
  appendSection,
  copyEntry,
  moveEntry,
  movePersonalDetail,
  moveSection,
  removeEntry,
  removePersonalDetail,
  updateEntry,
  updatePersonalDetail,
  updatePersonalLink,
  updateSectionSettings,
} from "@/features/editor/content/document-operations";
import { SECTION_CATALOG } from "@/features/editor/content/factories";

describe("content document operations", () => {
  it("creates every Add Content section as canonical editable data", () => {
    let document = createDefaultResumeDocument();
    for (const item of SECTION_CATALOG) {
      document = appendSection(document, item.type).document;
    }

    expect(resumeDocumentSchema.safeParse(document).success).toBe(true);
    expect(document.sections.slice(-SECTION_CATALOG.length).map((section) => section.type)).toEqual(
      SECTION_CATALOG.map((item) => item.type),
    );
    expect(document.sections.at(-1)).toMatchObject({ type: "custom", entries: [] });
  });

  it("persists rename, visibility, column placement and exact section order", () => {
    const source = createDefaultResumeDocument();
    const target = source.sections[1]!;
    let document = updateSectionSettings(source, target.id, {
      heading: "Selected Work",
      visible: false,
      column: "secondary",
    });
    document = moveSection(document, 1, 3);

    expect(document.sections[3]).toMatchObject({
      id: target.id,
      heading: "Selected Work",
      visible: false,
      column: "secondary",
    });
    expect(resumeDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("adds, edits, duplicates, reorders and removes entries without aliasing", () => {
    const source = createDefaultResumeDocument();
    const experience = source.sections.find((section) => section.type === "experience")!;
    const firstResult = appendEntry(source, experience.id);
    const first = firstResult.entry!;
    let document = updateEntry(firstResult.document, experience.id, {
      ...first,
      position: "Staff Engineer",
      employer: "Example Ltd",
    });
    const secondResult = copyEntry(document, experience.id, first.id);
    const second = secondResult.entry!;
    document = updateEntry(secondResult.document, experience.id, {
      ...second,
      position: "Principal Engineer",
    });
    document = moveEntry(document, experience.id, 1, 0);

    let updated = document.sections.find((section) => section.id === experience.id)!;
    expect("entries" in updated && updated.entries.map((entry) => entry.id)).toEqual([second.id, first.id]);
    expect("entries" in updated && updated.entries[0]).toMatchObject({ position: "Principal Engineer" });
    expect("entries" in updated && updated.entries[1]).toMatchObject({ position: "Staff Engineer" });

    document = removeEntry(document, experience.id, first.id);
    updated = document.sections.find((section) => section.id === experience.id)!;
    expect("entries" in updated && updated.entries).toHaveLength(1);
    expect(resumeDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("adds and updates canonical named personal links", () => {
    let document = addPersonalLink(createDefaultResumeDocument());
    const link = document.personal.links[0]!;
    document = updatePersonalLink(document, link.id, {
      label: "LinkedIn",
      url: "https://linkedin.com/in/example",
      visible: false,
    });

    expect(document.personal.links[0]).toMatchObject({
      label: "LinkedIn",
      url: "https://linkedin.com/in/example",
      visible: false,
    });
    expect(resumeDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("serializes optional personal details with their edits, visibility and order intact", () => {
    let document = createDefaultResumeDocument();
    const workAuthorization = addPersonalDetail(document, "work-authorization");
    document = updatePersonalDetail(
      workAuthorization.document,
      workAuthorization.detail.id,
      { value: "Authorized to work in Poland", visible: false },
    );
    const custom = addPersonalDetail(document, "custom");
    document = updatePersonalDetail(custom.document, custom.detail.id, {
      label: "Security clearance",
      value: "Eligible",
    });
    document = movePersonalDetail(document, 1, 0);

    const persisted = resumeDocumentSchema.parse(JSON.parse(JSON.stringify(document)));
    expect(persisted.personal.details).toEqual([
      {
        id: custom.detail.id,
        kind: "custom",
        label: "Security clearance",
        value: "Eligible",
        visible: true,
      },
      {
        id: workAuthorization.detail.id,
        kind: "work-authorization",
        label: "Work Authorization",
        value: "Authorized to work in Poland",
        visible: false,
      },
    ]);

    const removed = removePersonalDetail(persisted, custom.detail.id);
    expect(removed.personal.details).toEqual([persisted.personal.details[1]]);
    expect(resumeDocumentSchema.safeParse(removed).success).toBe(true);
  });
});
