import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/data/supabase/server", () => ({
  getServerSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        contains: () => ({
          limit: () => ({ maybeSingle: harness.maybeSingle }),
        }),
      }),
    }),
    storage: { from: () => ({ remove: harness.remove }) },
  }),
}));

import { removePhotoIfUnreferenced } from "@/features/editor/photo-storage";

const managedPath = "resumes/00000000-0000-4000-8000-000000000001/photo/00000000-0000-4000-8000-000000000002.webp";

describe("reference-aware photo cleanup", () => {
  beforeEach(() => {
    harness.maybeSingle.mockReset();
    harness.remove.mockReset();
    harness.remove.mockResolvedValue({ error: null });
  });

  it("keeps a photo that is still referenced by a duplicate", async () => {
    harness.maybeSingle.mockResolvedValue({ data: { id: "00000000-0000-4000-8000-000000000003" }, error: null });

    await expect(removePhotoIfUnreferenced(managedPath)).resolves.toBe(false);
    expect(harness.remove).not.toHaveBeenCalled();
  });

  it("removes the final unreferenced managed photo", async () => {
    harness.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(removePhotoIfUnreferenced(managedPath)).resolves.toBe(true);
    expect(harness.remove).toHaveBeenCalledWith([managedPath]);
  });

  it("never deletes an arbitrary storage path", async () => {
    await expect(removePhotoIfUnreferenced("resume-imports/private.pdf")).resolves.toBe(false);
    expect(harness.maybeSingle).not.toHaveBeenCalled();
    expect(harness.remove).not.toHaveBeenCalled();
  });
});
