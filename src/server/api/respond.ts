import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ResumeConflictError, ResumeDataError, ResumeNotFoundError } from "@/data/resumes";

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request.", issues: error.flatten() }, { status: 400 });
  }
  if (error instanceof ResumeNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ResumeConflictError) {
    return NextResponse.json(
      { error: error.message, code: "VERSION_CONFLICT", current: error.current },
      { status: 409 },
    );
  }
  if (error instanceof ResumeDataError) {
    return NextResponse.json({ error: "The resume service could not complete the request." }, { status: 500 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
