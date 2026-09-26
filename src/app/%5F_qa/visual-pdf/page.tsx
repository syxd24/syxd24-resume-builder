import { notFound } from "next/navigation";

import fixtureDesign from "../../../../fixtures/default-design.json";
import fixtureDocument from "../../../../fixtures/golden-resume.json";
import type { ResumeRecord } from "@/data/resumes";
import { resumeDesignSchema, resumeDocumentSchema, type ResumeDocument } from "@/domain/resume";
import { ResumeEditor } from "@/features/editor";
import { ResumeRenderer } from "@/features/resume-renderer";

export const dynamic = "force-dynamic";

const document = resumeDocumentSchema.parse(fixtureDocument);
const design = resumeDesignSchema.parse(fixtureDesign);

function stressDocument(): ResumeDocument {
  const experience = document.sections.find((section) => section.type === "experience");
  if (!experience || experience.type !== "experience") throw new Error("Golden fixture experience section is missing.");

  return {
    ...document,
    sections: [
      {
        ...experience,
        heading: "PROFESSIONAL EXPERIENCE — STRESS FIXTURE",
        entries: Array.from({ length: 48 }, (_, index) => ({
          ...experience.entries[index % experience.entries.length]!,
          id: `stress-entry-${index + 1}`,
          position: `Platform Engineer ${index + 1}`,
          employer: `Synthetic QA Employer ${Math.floor(index / 3) + 1}`,
          description: [
            {
              type: "bullet" as const,
              text: `Synthetic verification entry ${index + 1}: shipped typed services, relational data workflows, and observable production integrations without duplicating or dropping content.`,
            },
            {
              type: "bullet" as const,
              text: "Maintained accessible interfaces, deterministic tests, and print-safe layouts under intentionally dense multi-page conditions.",
            },
          ],
        })),
      },
    ],
  };
}

function fixtureResume(): ResumeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Golden QA Resume",
    content: document,
    design,
    language: design.document.language,
    pageFormat: design.document.pageFormat,
    sortOrder: 0,
    sourceImportPath: null,
    sourceImportType: null,
    lockVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

export default async function VisualPdfQaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; format?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const query = await searchParams;
  const view = query.view ?? "editor";
  if (view === "editor") return <ResumeEditor initialResume={fixtureResume()} />;

  const stress = view.startsWith("stress");
  const print = view.endsWith("print");
  if (!stress && !view.startsWith("golden")) notFound();

  const fixtureVariant = stress
    ? resumeDesignSchema.parse({
        ...fixtureDesign,
        footer: { ...fixtureDesign.footer, pageNumbers: true, showName: true, gapMm: 4 },
      })
    : design;
  const renderDesign = query.format === "Letter"
    ? { ...fixtureVariant, document: { ...fixtureVariant.document, pageFormat: "Letter" as const } }
    : fixtureVariant;

  return (
    <main
      data-qa-ready="true"
      data-qa-view={view}
      style={{ minHeight: "100vh", padding: print ? 0 : "32px", background: print ? "white" : "#e9e6e3" }}
    >
      <ResumeRenderer
        document={stress ? stressDocument() : document}
        design={renderDesign}
        mode={print ? "print" : "editor"}
      />
    </main>
  );
}
