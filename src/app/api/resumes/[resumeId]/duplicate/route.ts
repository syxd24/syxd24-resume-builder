import { NextResponse } from "next/server";

import { getResumeRepository } from "@/data/resumes";
import { apiErrorResponse } from "@/server/api/respond";
import { resumeIdSchema } from "@/server/api/contracts";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ resumeId: string }> }) {
  try {
    const id = resumeIdSchema.parse((await context.params).resumeId);
    const resume = await getResumeRepository().duplicate(id);
    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
