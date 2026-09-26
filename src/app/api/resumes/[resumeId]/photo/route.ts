import { NextResponse } from "next/server";
import { z } from "zod";

import { getResumeRepository, ResumeNotFoundError } from "@/data/resumes";
import { getServerSupabaseClient } from "@/data/supabase/server";
import { validatePhoto } from "@/features/editor/photo-validation";
import { apiErrorResponse } from "@/server/api/respond";

export const runtime = "nodejs";
type Context = { params: Promise<{ resumeId: string }> };
const idSchema = z.string().uuid();

export async function GET(_: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).resumeId);
    const resume = await getResumeRepository().get(id);
    if (!resume) throw new ResumeNotFoundError(id);
    const storagePath = resume.content.personal.photo?.storagePath;
    if (!storagePath) return NextResponse.json({ error: "This resume has no profile photo." }, { status: 404 });
    const signed = await getServerSupabaseClient().storage.from("resume-assets").createSignedUrl(storagePath, 5 * 60);
    if (signed.error) throw new Error("The photo could not be loaded.", { cause: signed.error });
    return NextResponse.json({ storagePath, signedUrl: signed.data.signedUrl });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).resumeId);
    const resume = await getResumeRepository().get(id);
    if (!resume) throw new ResumeNotFoundError(id);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Select a JPEG, PNG, or WebP photo." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { extension } = validatePhoto(file, bytes);
    const storagePath = `resumes/${id}/photo/${crypto.randomUUID()}.${extension}`;
    const bucket = getServerSupabaseClient().storage.from("resume-assets");
    const uploaded = await bucket.upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploaded.error) throw new Error("The photo could not be stored.", { cause: uploaded.error });
    const signed = await bucket.createSignedUrl(storagePath, 5 * 60);
    if (signed.error) {
      await bucket.remove([storagePath]);
      throw new Error("The uploaded photo could not be previewed.", { cause: signed.error });
    }
    return NextResponse.json({ storagePath, signedUrl: signed.data.signedUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The uploaded file")) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof Error && error.message.startsWith("Choose a JPEG")) return NextResponse.json({ error: error.message }, { status: 422 });
    return apiErrorResponse(error);
  }
}
