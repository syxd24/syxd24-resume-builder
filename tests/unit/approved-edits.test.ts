import { describe, expect, it } from "vitest";

import { createDefaultResumeDocument, resumeDocumentSchema } from "@/domain/resume";
import { applyApprovedEdits, ApprovedEditPreconditionError } from "@/server/api/approved-edits";

function fixture() {
  return resumeDocumentSchema.parse({
    ...createDefaultResumeDocument(),
    sections: [
      { id: "summary-1", type: "summary", heading: "Summary", visible: true, column: "full", content: [{ type: "paragraph", text: "Original summary" }] },
      { id: "experience-1", type: "experience", heading: "Experience", visible: true, column: "full", entries: [
        { id: "entry-1", visible: true, position: "IT Analyst", employer: "Example", description: [{ type: "bullet", text: "Original bullet" }, { type: "bullet", text: "Keep this bullet" }] },
      ] },
      { id: "skills-1", type: "skills", heading: "Skills", visible: true, column: "full", entries: [
        { id: "skill-1", visible: true, name: "Tools", description: "SQL" },
      ] },
    ],
  });
}

describe("approved edits", () => {
  it("applies two paused edits together without changing other fields or mutating the source", () => {
    const original = fixture();
    const result = applyApprovedEdits(original, [
      { kind: "summary", sectionId: "summary-1", blockIndex: 0, before: { type: "paragraph", text: "Original summary" }, after: { type: "paragraph", text: "Approved summary" } },
      { kind: "experience-bullet", sectionId: "experience-1", entryId: "entry-1", blockIndex: 0, before: { type: "bullet", text: "Original bullet" }, after: { type: "bullet", text: "Approved bullet" } },
    ]);
    expect(result.sections[0]).toMatchObject({ type: "summary", content: [{ text: "Approved summary" }] });
    expect(result.sections[1]).toMatchObject({ type: "experience", entries: [{ description: [{ text: "Approved bullet" }, { text: "Keep this bullet" }] }] });
    expect(result.sections[2]).toEqual(original.sections[2]);
    expect(original.sections[0]).toMatchObject({ content: [{ text: "Original summary" }] });
  });

  it("rejects any stale field atomically", () => {
    const input = fixture();
    expect(() => applyApprovedEdits(input, [
      { kind: "summary", sectionId: "summary-1", blockIndex: 0, before: { type: "paragraph", text: "Original summary" }, after: { type: "paragraph", text: "Approved" } },
      { kind: "experience-bullet", sectionId: "experience-1", entryId: "entry-1", blockIndex: 0, before: { type: "bullet", text: "Stale bullet" }, after: { type: "bullet", text: "New bullet" } },
    ])).toThrow(ApprovedEditPreconditionError);
    expect(input.sections[0]).toMatchObject({ content: [{ text: "Original summary" }] });
  });

  it("preserves skill IDs and blocks duplicate writes to the same field", () => {
    const input = fixture();
    const skill = { id: "skill-1", visible: true, name: "Tools", description: "SQL" };
    const updated = applyApprovedEdits(input, [
      { kind: "skill-entry", sectionId: "skills-1", entryId: "skill-1", before: skill, after: { ...skill, description: "SQL, Excel" } },
    ]);
    expect(updated.sections[2]).toMatchObject({ entries: [{ id: "skill-1", description: "SQL, Excel" }] });
    expect(() => applyApprovedEdits(input, [
      { kind: "skill-entry", sectionId: "skills-1", entryId: "skill-1", before: skill, after: { ...skill, description: "SQL, Excel" } },
      { kind: "skill-entry", sectionId: "skills-1", entryId: "skill-1", before: skill, after: { ...skill, description: "SQL, Python" } },
    ])).toThrow(ApprovedEditPreconditionError);
  });
});
