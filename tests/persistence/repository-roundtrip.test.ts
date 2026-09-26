import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database, Json } from "@/data/supabase/database.types";
import { ResumeConflictError, SupabaseResumeRepository } from "@/data/resumes";
import { resumeDesignSchema, resumeDocumentSchema } from "@/domain/resume";

type ResumeRow = Database["public"]["Tables"]["resumes"]["Row"];
type ResumeInsert = Database["public"]["Tables"]["resumes"]["Insert"];
type ResumeUpdate = Database["public"]["Tables"]["resumes"]["Update"];

function copy<T>(value: T): T {
  return structuredClone(value);
}

class InMemorySupabase {
  readonly rows = new Map<string, ResumeRow>();
  private tick = 0;

  private timestamp(): string {
    this.tick += 1;
    return new Date(Date.UTC(2026, 8, 23, 12, 0, this.tick)).toISOString();
  }

  from(table: string) {
    if (table !== "resumes") throw new Error(`Unexpected table ${table}`);
    const rows = this.rows;
    const timestamp = this.timestamp.bind(this);

    return {
      select() {
        let id: string | undefined;
        const chain = {
          eq(column: string, value: unknown) {
            if (column === "id") id = String(value);
            return chain;
          },
          async maybeSingle() {
            return { data: id && rows.has(id) ? copy(rows.get(id)!) : null, error: null };
          },
          async order(column: string, options: { ascending: boolean }) {
            const selectedRows = [...rows.values()].map(copy);
            selectedRows.sort((left, right) => {
              const a = String(left[column as keyof ResumeRow]);
              const b = String(right[column as keyof ResumeRow]);
              return options.ascending ? a.localeCompare(b) : b.localeCompare(a);
            });
            return { data: selectedRows, error: null };
          },
        };
        return chain;
      },
      insert(input: ResumeInsert) {
        return {
          select() {
            return {
              async single() {
                const id = input.id ?? crypto.randomUUID();
                const now = timestamp();
                const row: ResumeRow = {
                  id,
                  title: input.title ?? "Untitled Resume",
                  content: copy((input.content ?? {}) as Json),
                  design: copy((input.design ?? {}) as Json),
                  language: input.language ?? "en-GB",
                  page_format: input.page_format ?? "A4",
                  sort_order: input.sort_order ?? 0,
                  source_import_path: input.source_import_path ?? null,
                  source_import_type: input.source_import_type ?? null,
                  lock_version: input.lock_version ?? 0,
                  created_at: input.created_at ?? now,
                  updated_at: input.updated_at ?? now,
                };
                rows.set(id, copy(row));
                return { data: copy(row), error: null };
              },
            };
          },
        };
      },
      update(values: ResumeUpdate) {
        let id: string | undefined;
        let expectedVersion: number | undefined;
        const chain = {
          eq(column: string, value: unknown) {
            if (column === "id") id = String(value);
            if (column === "lock_version") expectedVersion = Number(value);
            return chain;
          },
          select() {
            return chain;
          },
          async maybeSingle() {
            const current = id ? rows.get(id) : undefined;
            if (!current || (expectedVersion !== undefined && current.lock_version !== expectedVersion)) {
              return { data: null, error: null };
            }
            const updated = {
              ...current,
              ...copy(values),
              updated_at: timestamp(),
            } as ResumeRow;
            rows.set(current.id, copy(updated));
            return { data: copy(updated), error: null };
          },
        };
        return chain;
      },
      delete() {
        let id: string | undefined;
        const chain = {
          eq(column: string, value: unknown) {
            if (column === "id") id = String(value);
            return chain;
          },
          select() {
            return chain;
          },
          async maybeSingle() {
            if (!id || !rows.has(id)) return { data: null, error: null };
            rows.delete(id);
            return { data: { id }, error: null };
          },
        };
        return chain;
      },
    };
  }
}

function exactDocument() {
  return resumeDocumentSchema.parse({
    version: 1,
    personal: {
      fullName: "Persistence QA",
      links: [{ id: "portfolio", label: "Portfolio", url: "https://example.com", visible: true }],
      photo: { storagePath: "resumes/test/photo/portrait.webp", alt: "Portrait" },
    },
    sections: [
      {
        id: "summary",
        type: "summary",
        heading: "Profile",
        visible: true,
        column: "full",
        content: [{ type: "paragraph", text: "fallback", spans: [{ text: "Marked summary", marks: ["bold"] }] }],
      },
      {
        id: "experience",
        type: "experience",
        heading: "Experience",
        visible: true,
        column: "primary",
        entries: [
          { id: "exp-second", visible: true, position: "Second", employer: "B", description: [] },
          { id: "exp-first", visible: false, position: "First", employer: "A", description: [] },
        ],
      },
      {
        id: "skills",
        type: "skills",
        heading: "Skills",
        visible: false,
        column: "secondary",
        entries: [{ id: "skill", visible: true, name: "Postgres", level: 91 }],
      },
    ],
  });
}

function exactDesign() {
  return resumeDesignSchema.parse({
    document: { language: "de-DE", dateFormat: "MMM YYYY", pageFormat: "Letter" },
    layout: { mode: "two-column", secondaryWidthPct: 37, columnGapMm: 8 },
    typography: { bodyFont: "Inter", nameFont: "Georgia", baseSizePt: 11, nameOffsetPt: 13, sectionHeadingOffsetPt: 4, entryHeaderOffsetPt: 1, lineHeight: 1.3 },
    spacing: { marginTopMm: 10, marginRightMm: 11, marginBottomMm: 12, marginLeftMm: 13, headerGapMm: 5, sectionGapMm: 6, headingGapMm: 3, entryGapMm: 4, paragraphGapMm: 2 },
    colors: { accent: "#336699", border: "#778899", accentTargets: { name: false, headings: true, jobTitle: true } },
    header: { alignment: "right", detailsArrangement: "split", lineStyle: "accent", showIcons: false, nameFirst: false },
    photo: { visible: true, shape: "rounded", placement: "right", sizeMm: 30, grayscale: true, zoom: 2.25, x: 0.2, y: 0.8 },
    links: { underline: true, colorMode: "accent", showIcons: false },
    footer: { pageNumbers: true, showName: true, showEmail: true, alignment: "right", gapMm: 7 },
    sections: { skills: { headingStyle: "underline", skillDisplay: "level" } },
  });
}

describe("Supabase resume repository persistence contract", () => {
  it("round-trips content, design, order, columns, photo state, CRUD, and duplicate independence", async () => {
    const database = new InMemorySupabase();
    const repository = new SupabaseResumeRepository(database as unknown as SupabaseClient<Database>);
    const document = exactDocument();
    const design = exactDesign();

    const created = await repository.create({ title: "  Resume Germany  ", content: document, design });
    expect(created).toMatchObject({ title: "Resume Germany", content: document, design, language: "de-DE", pageFormat: "Letter", lockVersion: 0 });
    expect(await repository.list()).toEqual([created]);
    expect(await repository.get(created.id)).toEqual(created);

    const reordered = resumeDocumentSchema.parse({ ...document, sections: [document.sections[2], document.sections[0], document.sections[1]] });
    const updatedDesign = resumeDesignSchema.parse({ ...design, colors: { ...design.colors, accent: "#AA3300" }, photo: { ...design.photo, zoom: 3, x: 0.75, y: 0.1 } });
    const updated = await repository.update(created.id, { content: reordered, design: updatedDesign, sortOrder: 9 }, created.lockVersion);
    expect(updated.lockVersion).toBe(1);
    expect((await repository.get(created.id))?.content).toEqual(reordered);
    expect((await repository.get(created.id))?.design).toEqual(updatedDesign);
    expect(updated.content.sections.map((section) => section.id)).toEqual(["skills", "summary", "experience"]);
    expect(updated.content.sections[2]?.column).toBe("primary");
    expect(updatedDesign.photo).toMatchObject({ zoom: 3, x: 0.75, y: 0.1, grayscale: true });

    const renamed = await repository.rename(created.id, "Final Original");
    expect(renamed).toMatchObject({ title: "Final Original", lockVersion: 2 });
    const duplicate = await repository.duplicate(created.id);
    expect(duplicate.id).not.toBe(created.id);
    expect(duplicate).toMatchObject({ title: "Final Original - Copy", content: renamed.content, design: renamed.design });

    const duplicateDocument = resumeDocumentSchema.parse({ ...duplicate.content, personal: { ...duplicate.content.personal, fullName: "Changed Copy" } });
    await repository.update(duplicate.id, { content: duplicateDocument, design: resumeDesignSchema.parse({ ...duplicate.design, colors: { ...duplicate.design.colors, accent: "#CC0000" } }) }, duplicate.lockVersion);
    expect((await repository.get(created.id))?.content.personal.fullName).toBe("Persistence QA");
    expect((await repository.get(created.id))?.design.colors.accent).toBe("#AA3300");

    await repository.delete(created.id);
    expect(await repository.get(created.id)).toBeNull();
    expect((await repository.list()).map((resume) => resume.id)).toEqual([duplicate.id]);
  });

  it("rejects a delayed stale version rather than overwriting the latest row", async () => {
    const repository = new SupabaseResumeRepository(new InMemorySupabase() as unknown as SupabaseClient<Database>);
    const created = await repository.create({ title: "Initial", content: exactDocument(), design: exactDesign() });
    const latest = await repository.update(created.id, { title: "Latest" }, 0);

    await expect(repository.update(created.id, { title: "Delayed older save" }, 0)).rejects.toMatchObject({
      name: "ResumeConflictError",
      current: latest,
    } satisfies Partial<ResumeConflictError>);
    expect((await repository.get(created.id))?.title).toBe("Latest");
  });
});
