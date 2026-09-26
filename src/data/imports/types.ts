export const importMimeTypes = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
} as const;

export type ResumeImportType = keyof typeof importMimeTypes;
export type ResumeImportStatus = "uploaded" | "parsing" | "completed" | "failed";

export type ResumeImportRecord = {
  id: string;
  resumeId: string | null;
  originalName: string;
  storagePath: string;
  mimeType: string;
  status: ResumeImportStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface ResumeImportRepository {
  create(input: Pick<ResumeImportRecord, "originalName" | "storagePath" | "mimeType"> & { resumeId?: string | null }): Promise<ResumeImportRecord>;
  updateStatus(id: string, status: ResumeImportStatus, options?: { resumeId?: string | null; errorMessage?: string | null }): Promise<ResumeImportRecord>;
}
