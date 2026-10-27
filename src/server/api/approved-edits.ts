import { z } from "zod";

import {
  resumeDocumentSchema,
  richTextBlockSchema,
  skillEntrySchema,
  type ResumeDocument,
} from "@/domain/resume/schema";

// Exact-before-value checks prevent an AI-approved edit from touching a stale field.
const identifier = z.string().min(1).max(250);
const richTextEdit = {
  sectionId: identifier,
  blockIndex: z.number().int().nonnegative(),
  before: richTextBlockSchema,
  after: richTextBlockSchema,
};

export const approvedEditsRequestSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  edits: z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("summary"), ...richTextEdit }).strict(),
    z.object({ kind: z.literal("experience-bullet"), ...richTextEdit, entryId: identifier }).strict(),
    z.object({
      kind: z.literal("skill-entry"),
      sectionId: identifier,
      entryId: identifier,
      before: skillEntrySchema,
      after: skillEntrySchema,
    }).strict(),
  ])).min(1).max(30),
}).strict();

export type ApprovedEdit = z.infer<typeof approvedEditsRequestSchema>["edits"][number];

export class ApprovedEditPreconditionError extends Error {
  constructor() {
    super("An approved field no longer matches the saved CV. No changes were applied.");
    this.name = "ApprovedEditPreconditionError";
  }
}

function expectExact(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new ApprovedEditPreconditionError();
}

export function applyApprovedEdits(document: ResumeDocument, edits: ApprovedEdit[]): ResumeDocument {
  const copy = structuredClone(document);
  const targets = new Set<string>();

  for (const edit of edits) {
    const target = `${edit.kind}:${edit.sectionId}:${"entryId" in edit ? edit.entryId : ""}:${"blockIndex" in edit ? edit.blockIndex : ""}`;
    if (targets.has(target)) throw new ApprovedEditPreconditionError();
    targets.add(target);

    const section = copy.sections.find((part) => part.id === edit.sectionId);
    if (edit.kind === "summary") {
      if (section?.type !== "summary") throw new ApprovedEditPreconditionError();
      const block = section.content[edit.blockIndex];
      if (!block) throw new ApprovedEditPreconditionError();
      expectExact(block, edit.before);
      section.content[edit.blockIndex] = edit.after;
    } else if (edit.kind === "experience-bullet") {
      if (section?.type !== "experience") throw new ApprovedEditPreconditionError();
      const entry = section.entries.find((part) => part.id === edit.entryId);
      const block = entry?.description[edit.blockIndex];
      if (!entry || !block || block.type !== "bullet" || edit.after.type !== "bullet") {
        throw new ApprovedEditPreconditionError();
      }
      expectExact(block, edit.before);
      entry.description[edit.blockIndex] = edit.after;
    } else {
      if (section?.type !== "skills") throw new ApprovedEditPreconditionError();
      const index = section.entries.findIndex((part) => part.id === edit.entryId);
      const entry = section.entries[index];
      if (!entry || edit.before.id !== edit.entryId || edit.after.id !== edit.entryId) {
        throw new ApprovedEditPreconditionError();
      }
      expectExact(entry, edit.before);
      section.entries[index] = edit.after;
    }
  }
  return resumeDocumentSchema.parse(copy);
}
