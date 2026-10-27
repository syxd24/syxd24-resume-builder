import { NextResponse } from "next/server";
import { z } from "zod";

import { getResumeRepository, ResumeConflictError, ResumeNotFoundError } from "@/data/resumes";
import { apiErrorResponse } from "@/server/api/respond";
import { resumeIdSchema } from "@/server/api/contracts";

export const runtime = "nodejs";

const duplicateRequestSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ resumeId: string }> }) {
  try {
    const id = resumeIdSchema.parse((await context.params).resumeId);
    const rawBody = await request.text();
    const input = duplicateRequestSchema.parse(rawBody ? JSON.parse(rawBody) : {});
    const repository = getResumeRepository();
    const original = await repository.get(id);
    if (!original) throw new ResumeNotFoundError(id);
    if (input.expectedVersion !== undefined && input.expectedVersion !== original.lockVersion) {
      throw new ResumeConflictError(original);
    }
    const resume = await repository.create({
      title: input.title ?? `${original.title} - Copy`,
      content: structuredClone(original.content),
      design: structuredClone(original.design),
    });
    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
