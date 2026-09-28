import type { ResumeDesign, ResumeDocument } from "../../src/domain/resume";

type StubProps = {
  document: ResumeDocument;
  design: ResumeDesign;
  pageFormat: "A4" | "Letter";
  mode: "thumbnail";
  pageLimit?: number;
};

export function ResumeRenderer({ document, pageFormat, mode, pageLimit }: StubProps) {
  return <div data-testid="shared-resume-renderer" data-mode={mode} data-page-limit={pageLimit}>{document.personal.fullName} · {pageFormat}</div>;
}
