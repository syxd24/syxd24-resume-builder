import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DashboardRequestError,
  deleteResume,
  downloadResumePdf,
  renameResume,
} from "../../src/features/dashboard/api";
import type { ResumeRecord } from "../../src/data/resumes/types";

const resume = {
  id: "2a2de08c-54a2-496a-95c6-269a593a0407",
  title: "Platform Resume",
  lockVersion: 7,
} as ResumeRecord;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard API client", () => {
  it("uses optimistic version protection when renaming", async () => {
    const updated = { ...resume, title: "Principal Resume", lockVersion: 8 };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ resume: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(renameResume(resume, "  Principal Resume  ")).resolves.toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(`/api/resumes/${resume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: 7, patch: { title: "Principal Resume" } }),
    });
  });

  it("surfaces server errors from destructive actions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Resume not found." }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(deleteResume(resume.id)).rejects.toEqual(
      expect.objectContaining<Partial<DashboardRequestError>>({ message: "Resume not found.", status: 404 }),
    );
  });

  it("downloads the real PDF response and honors its filename", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(pdfBytes, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename*=UTF-8''Platform%20Resume.pdf",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadResumePdf(resume.id, resume.title);

    expect(result.filename).toBe("Platform Resume.pdf");
    expect(result.blob).toEqual(expect.any(Blob));
    expect(result.blob.size).toBe(pdfBytes.byteLength);
    expect(fetchMock).toHaveBeenCalledWith(`/api/resumes/${resume.id}/export`, {
      method: "GET",
      headers: { Accept: "application/pdf" },
    });
  });

  it("rejects successful non-PDF responses instead of downloading an error page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("render failed", { status: 200, headers: { "content-type": "text/html" } })),
    );

    await expect(downloadResumePdf(resume.id, resume.title)).rejects.toEqual(
      expect.objectContaining<Partial<DashboardRequestError>>({ status: 502 }),
    );
  });
});
