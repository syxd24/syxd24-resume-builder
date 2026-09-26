import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/data/supabase/database.types";
import { getServerSupabaseClient } from "@/data/supabase/server";

import type { ResumeImportRecord, ResumeImportRepository, ResumeImportStatus } from "./types";

type ImportRow = Database["public"]["Tables"]["resume_imports"]["Row"];

function mapImport(row: ImportRow): ResumeImportRecord {
  return {
    id: row.id,
    resumeId: row.resume_id,
    originalName: row.original_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseResumeImportRepository implements ResumeImportRepository {
  constructor(private readonly client: SupabaseClient<Database> = getServerSupabaseClient()) {}

  async create(input: { originalName: string; storagePath: string; mimeType: string; resumeId?: string | null }): Promise<ResumeImportRecord> {
    const { data, error } = await this.client
      .from("resume_imports")
      .insert({ original_name: input.originalName, storage_path: input.storagePath, mime_type: input.mimeType, resume_id: input.resumeId ?? null })
      .select("*")
      .single();
    if (error) throw new Error("Could not create import record.", { cause: error });
    return mapImport(data);
  }

  async updateStatus(
    id: string,
    status: ResumeImportStatus,
    options: { resumeId?: string | null; errorMessage?: string | null } = {},
  ): Promise<ResumeImportRecord> {
    const { data, error } = await this.client
      .from("resume_imports")
      .update({ status, resume_id: options.resumeId, error_message: options.errorMessage })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Could not update import ${id}.`, { cause: error });
    return mapImport(data);
  }
}
