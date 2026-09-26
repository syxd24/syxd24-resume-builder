import type { ResumeDocument } from "@/domain/resume";
import type { ResumeRecord } from "@/data/resumes";
import type { ImportSource } from "@/server/api/contracts";

export type ResumePdf = {
  bytes: Uint8Array;
  filename: string;
  contentType: "application/pdf";
};

export interface ResumePdfExporter {
  export(resume: ResumeRecord): Promise<ResumePdf>;
}

export type ImportExtraction = {
  document: ResumeDocument;
  unclassifiedText: string[];
  warnings: string[];
};

export interface ResumeImportExtractor {
  supports(source: ImportSource): boolean;
  extract(source: ImportSource, bytes: Uint8Array): Promise<ImportExtraction>;
}
