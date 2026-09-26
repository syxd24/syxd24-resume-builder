import type { ResumeDesign, ResumeDocument } from "@/domain/resume";

export type ResumeSourceType = "pdf" | "docx" | "txt";

export type ResumeRecord = {
  id: string;
  title: string;
  content: ResumeDocument;
  design: ResumeDesign;
  language: string;
  pageFormat: "A4" | "Letter";
  sortOrder: number;
  sourceImportPath: string | null;
  sourceImportType: ResumeSourceType | null;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateResumeInput = {
  title?: string;
  content?: ResumeDocument;
  design?: ResumeDesign;
  sourceImportPath?: string | null;
  sourceImportType?: ResumeSourceType | null;
};

export type UpdateResumePatch = Partial<
  Pick<ResumeRecord, "title" | "content" | "design" | "language" | "pageFormat" | "sortOrder">
>;

export interface ResumeRepository {
  list(): Promise<ResumeRecord[]>;
  get(id: string): Promise<ResumeRecord | null>;
  create(input?: CreateResumeInput): Promise<ResumeRecord>;
  update(id: string, patch: UpdateResumePatch, expectedVersion: number): Promise<ResumeRecord>;
  rename(id: string, title: string): Promise<ResumeRecord>;
  duplicate(id: string): Promise<ResumeRecord>;
  delete(id: string): Promise<void>;
}
