import type { ResumeDesign, ResumeDocument } from "../../src/domain/resume";

type StubProps = {
  document: ResumeDocument;
  design: ResumeDesign;
  pageFormat: "A4" | "Letter";
  mode: "thumbnail";
};

export function ResumeRenderer({ document, pageFormat, mode }: StubProps) {
  return <div data-testid="shared-resume-renderer" data-mode={mode}>{document.personal.fullName} · {pageFormat}</div>;
}
