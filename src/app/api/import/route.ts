import { NextResponse } from "next/server";

import { importErrorResponse } from "@/features/import/http";
import { importResumeFile } from "@/features/import/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Select a PDF, DOCX, or TXT resume." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await importResumeFile({ originalName: file.name, mimeType: file.type, size: file.size }, bytes);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return importErrorResponse(error);
  }
}
