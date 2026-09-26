import { notFound } from "next/navigation";

import { getResumeRepository } from "@/data/resumes";
import { ResumeEditor } from "@/features/editor";
import { createResumeAssetUrls } from "@/features/resume-renderer/assets";
import { resumeIdSchema } from "@/server/api/contracts";

export const dynamic = "force-dynamic";

export default async function ResumeEditorPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const parsed = resumeIdSchema.safeParse((await params).resumeId);
  if (!parsed.success) notFound();
  const resume = await getResumeRepository().get(parsed.data);
  if (!resume) notFound();
  const assetUrls: Record<string, string> = await createResumeAssetUrls(resume.content).catch(() => ({}));
  const photoPath = resume.content.personal.photo?.storagePath;
  return <ResumeEditor initialResume={resume} initialPhotoUrl={photoPath ? assetUrls[photoPath] : undefined} />;
}
