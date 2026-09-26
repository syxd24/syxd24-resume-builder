import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ResumeImportError } from "./errors";

export function importErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) return NextResponse.json({ error: "The import request is invalid.", issues: error.flatten() }, { status: 400 });
  if (error instanceof ResumeImportError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "STORAGE_FAILED" ? 500 : 422;
    return NextResponse.json({ error: error.message, code: error.code, importId: error.importId }, { status });
  }
  return NextResponse.json({ error: "The resume could not be imported." }, { status: 500 });
}
