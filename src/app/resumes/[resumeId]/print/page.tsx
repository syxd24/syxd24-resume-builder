import { notFound } from "next/navigation";

import { getResumeRepository } from "@/data/resumes";
import { ResumeRenderer } from "@/features/resume-renderer";
import { createResumeAssetUrls } from "@/features/resume-renderer/assets";
import { resumeIdSchema } from "@/server/api/contracts";

export const dynamic = "force-dynamic";

export default async function ResumePrintPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const parsed = resumeIdSchema.safeParse((await params).resumeId);
  if (!parsed.success) notFound();
  const resume = await getResumeRepository().get(parsed.data);
  if (!resume) notFound();
  const assetUrls = await createResumeAssetUrls(resume.content).catch(() => ({}));
  return (
    <main data-print-ready="true">
      <ResumeRenderer document={resume.content} design={resume.design} pageFormat={resume.pageFormat} mode="print" assetUrls={assetUrls} />
    </main>
  );
}
