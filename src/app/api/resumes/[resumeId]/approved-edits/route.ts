import { NextResponse } from "next/server";

import { getResumeRepository, ResumeConflictError, ResumeNotFoundError } from "@/data/resumes";
import { applyApprovedEdits, approvedEditsRequestSchema, ApprovedEditPreconditionError } from "@/server/api/approved-edits";
import { apiErrorResponse } from "@/server/api/respond";
import { resumeIdSchema } from "@/server/api/contracts";

export const runtime = "nodejs";

// This endpoint must remain behind the existing Vercel Deployment Protection.
// Never expose a service-role key to a browser or publish this route unprotected.
export async function POST(request: Request, context: { params: Promise<{ resumeId: string }> }) {
  try {
    const id = resumeIdSchema.parse((await context.params).resumeId);
    const input = approvedEditsRequestSchema.parse(await request.json());
    const repo = getResumeRepository();
    const current = await repo.get(id);
    if (!current) throw new ResumeNotFoundError(id);
    if (current.lockVersion !== input.expectedVersion) throw new ResumeConflictError(current);
    const content = applyApprovedEdits(current.content, input.edits);
    const resume = await repo.update(id, { content }, input.expectedVersion);
    return NextResponse.json({ resume });
  } catch (error) {
    if (error instanceof ApprovedEditPreconditionError) {
      return NextResponse.json({ error: error.message, code: "EDIT_PRECONDITION_FAILED" }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
