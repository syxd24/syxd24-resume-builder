import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultResumeDocument } from "@/domain/resume";
import { ResumeImportError } from "@/features/import/errors";

const mocks = vi.hoisted(() => ({
  client: undefined as unknown,
  createResume: vi.fn(),
  extractResume: vi.fn(),
}));

vi.mock("@/data/supabase/server", () => ({ getServerSupabaseClient: () => mocks.client }));
vi.mock("@/data/resumes", () => ({ getResumeRepository: () => ({ create: mocks.createResume }) }));
vi.mock("@/features/import/extractor", () => ({ extractResume: mocks.extractResume }));

import { deleteResumeImport, importResumeFile, retryResumeImport } from "@/features/import/service";

type ImportStatus = "uploaded" | "parsing" | "completed" | "failed";

function importHarness(bytes = new TextEncoder().encode("Alex Morgan\nSUMMARY\nReliable engineer")) {
  const uploaded: Array<{ bucket: string; path: string; contentType: string }> = [];
  const removed: Array<{ bucket: string; paths: string[] }> = [];
  const statuses: ImportStatus[] = [];
  const events: string[] = [];
  let deleted = false;
  let record = {
    id: "10000000-0000-4000-8000-000000000001",
    resume_id: null as string | null,
    original_name: "../private\\Alex Resume.txt",
    storage_path: "imports/pending/existing/Alex Resume.txt",
    mime_type: "text/plain",
    status: "failed" as ImportStatus,
    error_message: "initial failure" as string | null,
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
  };

  const client = {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, _payload: Uint8Array, options: { contentType: string }) {
            events.push("storage.upload");
            uploaded.push({ bucket, path, contentType: options.contentType });
            return { data: { path }, error: null };
          },
          async remove(paths: string[]) {
            events.push("storage.remove");
            removed.push({ bucket, paths });
            return { data: paths, error: null };
          },
          async download(path: string) {
            events.push("storage.download");
            expect(path).toBe(record.storage_path);
            return { data: { arrayBuffer: async () => bytes.slice().buffer }, error: null };
          },
        };
      },
    },
    from(table: string) {
      expect(table).toBe("resume_imports");
      return {
        insert(values: { original_name: string; storage_path: string; mime_type: string; status: ImportStatus }) {
          events.push("record.insert");
          record = { ...record, original_name: values.original_name, storage_path: values.storage_path, mime_type: values.mime_type, status: values.status, error_message: null };
          statuses.push(values.status);
          return { select: () => ({ single: async () => ({ data: structuredClone(record), error: null }) }) };
        },
        update(values: { status: ImportStatus; resume_id?: string | null; error_message?: string | null }) {
          const chain = {
            eq() { return chain; },
            select() { return chain; },
            async single() {
              events.push(`record.${values.status}`);
              record = {
                ...record,
                status: values.status,
                resume_id: "resume_id" in values ? values.resume_id ?? null : record.resume_id,
                error_message: "error_message" in values ? values.error_message ?? null : record.error_message,
              };
              statuses.push(values.status);
              return { data: structuredClone(record), error: null };
            },
          };
          return chain;
        },
        select() {
          const chain = {
            eq() { return chain; },
            async maybeSingle() { return { data: deleted ? null : structuredClone(record), error: null }; },
          };
          return chain;
        },
        delete() {
          return {
            async eq() {
              events.push("record.delete");
              deleted = true;
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { client, uploaded, removed, statuses, events, get record() { return record; }, get deleted() { return deleted; } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createResume.mockResolvedValue({ id: "20000000-0000-4000-8000-000000000002" });
  mocks.extractResume.mockResolvedValue({ document: createDefaultResumeDocument(), warnings: [], unclassifiedText: [] });
});

describe("import private-source and status semantics", () => {
  it("stores the source first, records uploaded/parsing/completed, and links the resulting resume", async () => {
    const bytes = new TextEncoder().encode("Alex Morgan\nSUMMARY\nReliable engineer");
    const harness = importHarness(bytes);
    mocks.client = harness.client;

    const result = await importResumeFile({ originalName: "../private\\Alex Resume.txt", mimeType: "text/plain", size: bytes.length }, bytes);

    expect(harness.events.slice(0, 2)).toEqual(["storage.upload", "record.insert"]);
    expect(harness.statuses).toEqual(["uploaded", "parsing", "completed"]);
    expect(harness.uploaded[0]).toMatchObject({ bucket: "resume-imports", contentType: "text/plain" });
    expect(harness.uploaded[0]?.path).toMatch(/^imports\/pending\/[0-9a-f-]+\/Alex Resume\.txt$/i);
    expect(mocks.createResume).toHaveBeenCalledWith(expect.objectContaining({
      title: "Alex Resume",
      sourceImportPath: harness.uploaded[0]?.path,
      sourceImportType: "txt",
    }));
    expect(result.import).toMatchObject({ status: "completed", resumeId: "20000000-0000-4000-8000-000000000002" });
  });

  it("retains a failed source with an understandable failed record, then retries from private storage", async () => {
    const bytes = new TextEncoder().encode("Alex Morgan\nSUMMARY\nReliable engineer");
    const harness = importHarness(bytes);
    mocks.client = harness.client;
    mocks.extractResume.mockRejectedValueOnce(new ResumeImportError("Parser could not read this resume.", "NO_TEXT"));

    await expect(importResumeFile({ originalName: "resume.txt", mimeType: "text/plain", size: bytes.length }, bytes)).rejects.toMatchObject({
      message: "Parser could not read this resume.",
      importId: "10000000-0000-4000-8000-000000000001",
    });
    expect(harness.statuses).toEqual(["uploaded", "parsing", "failed"]);
    expect(harness.removed).toEqual([]);
    expect(harness.record.error_message).toBe("Parser could not read this resume.");

    mocks.extractResume.mockResolvedValueOnce({ document: createDefaultResumeDocument(), warnings: [], unclassifiedText: [] });
    const retried = await retryResumeImport(harness.record.id);
    expect(harness.events).toContain("storage.download");
    expect(harness.statuses.slice(-2)).toEqual(["parsing", "completed"]);
    expect(retried.import.status).toBe("completed");
  });

  it("removes the private source before deleting a failed import record", async () => {
    const harness = importHarness();
    mocks.client = harness.client;
    await deleteResumeImport(harness.record.id);
    expect(harness.events.slice(-2)).toEqual(["storage.remove", "record.delete"]);
    expect(harness.removed).toEqual([{ bucket: "resume-imports", paths: [harness.record.storage_path] }]);
    expect(harness.deleted).toBe(true);
  });
});
