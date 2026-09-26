import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createDefaultResumeDocument,
  defaultResumeDesign,
  normalizeResumeDesign,
  resumeDesignSchema,
  resumeDocumentSchema,
} from "@/domain/resume";
import type { Database, Json } from "@/data/supabase/database.types";
import { getServerSupabaseClient } from "@/data/supabase/server";

import { ResumeConflictError, ResumeDataError, ResumeNotFoundError } from "./errors";
import type { CreateResumeInput, ResumeRecord, ResumeRepository, UpdateResumePatch } from "./types";

type ResumeRow = Database["public"]["Tables"]["resumes"]["Row"];
type ResumeUpdate = Database["public"]["Tables"]["resumes"]["Update"];

function toJson(value: unknown): Json {
  return value as Json;
}

function mapResumeRow(row: ResumeRow): ResumeRecord {
  return {
    id: row.id,
    title: row.title,
    content: resumeDocumentSchema.parse(row.content),
    design: normalizeResumeDesign(row.design),
    language: row.language,
    pageFormat: row.page_format,
    sortOrder: row.sort_order,
    sourceImportPath: row.source_import_path,
    sourceImportType: row.source_import_type,
    lockVersion: row.lock_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function databaseError(message: string, cause: unknown): ResumeDataError {
  return new ResumeDataError(message, { cause });
}

export class SupabaseResumeRepository implements ResumeRepository {
  constructor(private readonly client: SupabaseClient<Database> = getServerSupabaseClient()) {}

  async list(): Promise<ResumeRecord[]> {
    const { data, error } = await this.client.from("resumes").select("*").order("updated_at", { ascending: false });
    if (error) throw databaseError("Could not list resumes.", error);
    return data.map(mapResumeRow);
  }

  async get(id: string): Promise<ResumeRecord | null> {
    const { data, error } = await this.client.from("resumes").select("*").eq("id", id).maybeSingle();
    if (error) throw databaseError(`Could not load resume ${id}.`, error);
    return data ? mapResumeRow(data) : null;
  }

  async create(input: CreateResumeInput = {}): Promise<ResumeRecord> {
    const content = resumeDocumentSchema.parse(input.content ?? createDefaultResumeDocument());
    const design = resumeDesignSchema.parse(input.design ?? defaultResumeDesign);
    const title = input.title?.trim() || "Untitled Resume";

    const { data, error } = await this.client
      .from("resumes")
      .insert({
        title,
        content: toJson(content),
        design: toJson(design),
        language: design.document.language,
        page_format: design.document.pageFormat,
        source_import_path: input.sourceImportPath ?? null,
        source_import_type: input.sourceImportType ?? null,
      })
      .select("*")
      .single();
    if (error) throw databaseError("Could not create resume.", error);
    return mapResumeRow(data);
  }

  async update(id: string, patch: UpdateResumePatch, expectedVersion: number): Promise<ResumeRecord> {
    const values: ResumeUpdate = { lock_version: expectedVersion + 1 };
    if (patch.title !== undefined) values.title = patch.title.trim() || "Untitled Resume";
    if (patch.content !== undefined) values.content = toJson(resumeDocumentSchema.parse(patch.content));
    if (patch.design !== undefined) {
      const design = resumeDesignSchema.parse(patch.design);
      values.design = toJson(design);
      values.language = design.document.language;
      values.page_format = design.document.pageFormat;
    }
    if (patch.language !== undefined) values.language = patch.language;
    if (patch.pageFormat !== undefined) values.page_format = patch.pageFormat;
    if (patch.sortOrder !== undefined) values.sort_order = patch.sortOrder;

    const { data, error } = await this.client
      .from("resumes")
      .update(values)
      .eq("id", id)
      .eq("lock_version", expectedVersion)
      .select("*")
      .maybeSingle();
    if (error) throw databaseError(`Could not update resume ${id}.`, error);
    if (data) return mapResumeRow(data);

    const current = await this.get(id);
    if (!current) throw new ResumeNotFoundError(id);
    throw new ResumeConflictError(current);
  }

  async rename(id: string, title: string): Promise<ResumeRecord> {
    const current = await this.get(id);
    if (!current) throw new ResumeNotFoundError(id);
    return this.update(id, { title }, current.lockVersion);
  }

  async duplicate(id: string): Promise<ResumeRecord> {
    const original = await this.get(id);
    if (!original) throw new ResumeNotFoundError(id);
    return this.create({
      title: `${original.title} - Copy`,
      content: structuredClone(original.content),
      design: structuredClone(original.design),
    });
  }

  async delete(id: string): Promise<void> {
    const { data, error } = await this.client.from("resumes").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw databaseError(`Could not delete resume ${id}.`, error);
    if (!data) throw new ResumeNotFoundError(id);
  }
}

let repository: ResumeRepository | undefined;

export function getResumeRepository(): ResumeRepository {
  repository ??= new SupabaseResumeRepository();
  return repository;
}
