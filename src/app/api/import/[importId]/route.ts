import { NextResponse } from "next/server";
import { z } from "zod";

import { importErrorResponse } from "@/features/import/http";
import { deleteResumeImport, retryResumeImport } from "@/features/import/service";

export const runtime = "nodejs";

const paramsSchema = z.object({ importId: z.string().uuid() });

export async function POST(_: Request, context: { params: Promise<{ importId: string }> }) {
  try {
    const { importId } = paramsSchema.parse(await context.params);
    return NextResponse.json(await retryResumeImport(importId));
  } catch (error) {
    return importErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ importId: string }> }) {
  try {
    const { importId } = paramsSchema.parse(await context.params);
    await deleteResumeImport(importId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return importErrorResponse(error);
  }
}
