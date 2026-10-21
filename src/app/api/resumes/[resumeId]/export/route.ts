import { NextResponse } from "next/server";

import { getResumeRepository, ResumeNotFoundError } from "@/data/resumes";
import { renderResumePdf } from "@/features/resume-renderer/pdf";
import { apiErrorResponse } from "@/server/api/respond";
import { resumeIdSchema } from "@/server/api/contracts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ resumeId: string }> }) {
  try {
    const id = resumeIdSchema.parse((await context.params).resumeId);
    const resume = await getResumeRepository().get(id);
    if (!resume) throw new ResumeNotFoundError(id);
    const pdf = await renderResumePdf(resume, new URL(request.url).origin);
    const body = Uint8Array.from(pdf.bytes).buffer as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": pdf.contentType,
        "Content-Disposition": `attachment; filename="${pdf.filename.replace(/["\\]/g, "-")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
