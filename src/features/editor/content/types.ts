import type { ResumeDocument, ResumeSection } from "@/domain/resume/schema";

export type ContentEditorChangeMeta = {
  reason:
    | "personal"
    | "personal-detail"
    | "personal-link"
    | "section-add"
    | "section-update"
    | "section-delete"
    | "section-reorder"
    | "entry-add"
    | "entry-update"
    | "entry-delete"
    | "entry-duplicate"
    | "entry-reorder";
  sectionId?: string;
  entryId?: string;
};

export type ContentEditorProps = {
  document: ResumeDocument;
  onChange: (document: ResumeDocument, meta: ContentEditorChangeMeta) => void;
  onRequestImport?: () => void;
  onRequestPhotoUpload?: () => void;
  className?: string;
};

export type EntrySection = Exclude<ResumeSection, { type: "summary" } | { type: "declaration" }>;
export type ResumeEntry = EntrySection["entries"][number];

