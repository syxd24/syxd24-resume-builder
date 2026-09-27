import { notFound } from "next/navigation";

import fixtureDesign from "../../../fixtures/default-design.json";
import fixtureDocument from "../../../fixtures/golden-resume.json";
import type { ResumeRecord } from "@/data/resumes";
import { resumeDesignSchema, resumeDocumentSchema } from "@/domain/resume";
import { ResumeEditor } from "@/features/editor";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const content = resumeDocumentSchema.parse(fixtureDocument);
  const design = resumeDesignSchema.parse(fixtureDesign);
  const resume: ResumeRecord = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Golden Preview Resume",
    content,
    design,
    language: design.document.language,
    pageFormat: design.document.pageFormat,
    sortOrder: 0,
    sourceImportPath: null,
    sourceImportType: null,
    lockVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return <ResumeEditor initialResume={resume} previewMode />;
}
