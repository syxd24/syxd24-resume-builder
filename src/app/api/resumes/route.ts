import { NextResponse } from "next/server";

import { getResumeRepository } from "@/data/resumes";
import { apiErrorResponse } from "@/server/api/respond";
import { createResumeRequestSchema } from "@/server/api/contracts";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ resumes: await getResumeRepository().list() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createResumeRequestSchema.parse(await request.json());
    const resume = await getResumeRepository().create(input);
    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
