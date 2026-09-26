import "server-only";

import type { ResumeImportRecord, ResumeImportType } from "@/data/imports";
import { getResumeRepository } from "@/data/resumes";
import { getServerSupabaseClient } from "@/data/supabase/server";
import { importSourceSchema, type ImportSource } from "@/server/api/contracts";
import type { ImportExtraction } from "@/server/import-export/contracts";

import { ResumeImportError } from "./errors";
import { extractResume } from "./extractor";
import { buildPrivateImportPath, titleFromFilename, validateImportSource } from "./validation";

const BUCKET = "resume-imports";

function mapImport(row: {
  id: string; resume_id: string | null; original_name: string; storage_path: string; mime_type: string;
  status: "uploaded" | "parsing" | "completed" | "failed"; error_message: string | null; created_at: string; updated_at: string;
}): ResumeImportRecord {
  return { id: row.id, resumeId: row.resume_id, originalName: row.original_name, storagePath: row.storage_path, mimeType: row.mime_type, status: row.status, errorMessage: row.error_message, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function setStatus(id: string, status: ResumeImportRecord["status"], options: { resumeId?: string | null; errorMessage?: string | null } = {}) {
  const client = getServerSupabaseClient();
  const values: { status: ResumeImportRecord["status"]; resume_id?: string | null; error_message?: string | null } = { status };
  if ("resumeId" in options) values.resume_id = options.resumeId;
  if ("errorMessage" in options) values.error_message = options.errorMessage;
  const { data, error } = await client.from("resume_imports").update(values).eq("id", id).select("*").single();
  if (error) throw new ResumeImportError("The import status could not be updated.", "STORAGE_FAILED", { cause: error });
  return mapImport(data);
}

async function createResumeFromExtraction(source: ImportSource, path: string, type: ResumeImportType, extraction: ImportExtraction) {
  return getResumeRepository().create({ title: titleFromFilename(source.originalName), content: extraction.document, sourceImportPath: path, sourceImportType: type });
}

export async function importResumeFile(sourceInput: unknown, bytes: Uint8Array) {
  const source = importSourceSchema.parse(sourceInput);
  const type = validateImportSource(source, bytes);
  const client = getServerSupabaseClient();
  const storagePath = buildPrivateImportPath(source.originalName);
  const upload = await client.storage.from(BUCKET).upload(storagePath, bytes, { contentType: source.mimeType, upsert: false });
  if (upload.error) throw new ResumeImportError("The source file could not be stored privately.", "STORAGE_FAILED", { cause: upload.error });

  const created = await client.from("resume_imports").insert({ original_name: source.originalName, storage_path: storagePath, mime_type: source.mimeType, status: "uploaded" }).select("*").single();
  if (created.error) {
    await client.storage.from(BUCKET).remove([storagePath]);
    throw new ResumeImportError("The import record could not be created.", "STORAGE_FAILED", { cause: created.error });
  }
  const importRecord = mapImport(created.data);

  try {
    await setStatus(importRecord.id, "parsing", { errorMessage: null });
    const extraction = await extractResume(type, bytes);
    const resume = await createResumeFromExtraction(source, storagePath, type, extraction);
    const completed = await setStatus(importRecord.id, "completed", { resumeId: resume.id, errorMessage: null });
    return { resume, import: completed, warnings: extraction.warnings, unclassifiedText: extraction.unclassifiedText };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : "The file could not be parsed.";
    await setStatus(importRecord.id, "failed", { errorMessage: message }).catch(() => undefined);
    if (error instanceof ResumeImportError) error.importId = importRecord.id;
    throw error;
  }
}

export async function retryResumeImport(importId: string) {
  const client = getServerSupabaseClient();
  const record = await client.from("resume_imports").select("*").eq("id", importId).maybeSingle();
  if (record.error) throw new ResumeImportError("The import could not be loaded.", "STORAGE_FAILED", { cause: record.error });
  if (!record.data) throw new ResumeImportError("The import was not found.", "NOT_FOUND");
  const download = await client.storage.from(BUCKET).download(record.data.storage_path);
  if (download.error) throw new ResumeImportError("The private source file could not be downloaded for retry.", "STORAGE_FAILED", { cause: download.error });
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  const source = importSourceSchema.parse({ originalName: record.data.original_name, mimeType: record.data.mime_type, size: bytes.byteLength });
  const type = validateImportSource(source, bytes);
  try {
    await setStatus(importId, "parsing", { errorMessage: null });
    const extraction = await extractResume(type, bytes);
    const resume = await createResumeFromExtraction(source, record.data.storage_path, type, extraction);
    const completed = await setStatus(importId, "completed", { resumeId: resume.id, errorMessage: null });
    return { resume, import: completed, warnings: extraction.warnings, unclassifiedText: extraction.unclassifiedText };
  } catch (error) {
    await setStatus(importId, "failed", { errorMessage: error instanceof Error ? error.message.slice(0, 2_000) : "Retry failed." }).catch(() => undefined);
    throw error;
  }
}

export async function deleteResumeImport(importId: string) {
  const client = getServerSupabaseClient();
  const record = await client.from("resume_imports").select("storage_path").eq("id", importId).maybeSingle();
  if (record.error) throw new ResumeImportError("The import could not be loaded.", "STORAGE_FAILED", { cause: record.error });
  if (!record.data) throw new ResumeImportError("The import was not found.", "NOT_FOUND");
  const removed = await client.storage.from(BUCKET).remove([record.data.storage_path]);
  if (removed.error) throw new ResumeImportError("The private source file could not be removed.", "STORAGE_FAILED", { cause: removed.error });
  const deleted = await client.from("resume_imports").delete().eq("id", importId);
  if (deleted.error) throw new ResumeImportError("The import record could not be deleted.", "STORAGE_FAILED", { cause: deleted.error });
}
