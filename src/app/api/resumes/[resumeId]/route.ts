import { NextResponse } from "next/server";

import { getResumeRepository, ResumeNotFoundError } from "@/data/resumes";
import { removePhotoIfUnreferenced } from "@/features/editor/photo-storage";
import { apiErrorResponse } from "@/server/api/respond";
import { resumeIdSchema, updateResumeRequestSchema } from "@/server/api/contracts";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ resumeId: string }> };

async function validatedId(context: RouteContext): Promise<string> {
  return resumeIdSchema.parse((await context.params).resumeId);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = await validatedId(context);
    const resume = await getResumeRepository().get(id);
    if (!resume) throw new ResumeNotFoundError(id);
    return NextResponse.json({ resume });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = await validatedId(context);
    const input = updateResumeRequestSchema.parse(await request.json());
    const repository = getResumeRepository();
    const previous = await repository.get(id);
    if (!previous) throw new ResumeNotFoundError(id);
    const resume = await repository.update(id, input.patch, input.expectedVersion);
    const previousPhoto = previous.content.personal.photo?.storagePath;
    const currentPhoto = resume.content.personal.photo?.storagePath;
    if (previousPhoto && previousPhoto !== currentPhoto) {
      await removePhotoIfUnreferenced(previousPhoto).catch((error) => {
        console.error("Resume saved, but its unreferenced previous photo could not be cleaned up.", error);
      });
    }
    return NextResponse.json({ resume });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = await validatedId(context);
    const repository = getResumeRepository();
    const resume = await repository.get(id);
    if (!resume) throw new ResumeNotFoundError(id);
    await repository.delete(id);
    await removePhotoIfUnreferenced(resume.content.personal.photo?.storagePath).catch((error) => {
      console.error("Resume deleted, but its unreferenced photo could not be cleaned up.", error);
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
