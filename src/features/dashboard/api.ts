import type { ResumeRecord } from "@/data/resumes/types";

type ErrorPayload = { error?: unknown };

export type DownloadedResumePdf = {
  blob: Blob;
  filename: string;
};

export class DashboardRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DashboardRequestError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const message = typeof payload.error === "string" ? payload.error : "The request could not be completed.";
    throw new DashboardRequestError(message, response.status);
  }

  return (await response.json()) as T;
}

async function requestError(response: Response): Promise<never> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    await readJson<never>(response);
  }

  throw new DashboardRequestError(`The request could not be completed (${response.status}).`, response.status);
}

function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the regular filename parameter when a server sends
      // malformed percent encoding.
    }
  }

  return /filename="?([^";]+)"?/i.exec(value)?.[1]?.trim() ?? null;
}

export async function listResumes(signal?: AbortSignal): Promise<ResumeRecord[]> {
  const response = await fetch("/api/resumes", { cache: "no-store", signal });
  return (await readJson<{ resumes: ResumeRecord[] }>(response)).resumes;
}

export async function createResume(title?: string): Promise<ResumeRecord> {
  const response = await fetch("/api/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(title ? { title } : {}),
  });
  return (await readJson<{ resume: ResumeRecord }>(response)).resume;
}

export async function renameResume(resume: ResumeRecord, title: string): Promise<ResumeRecord> {
  const response = await fetch(`/api/resumes/${resume.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVersion: resume.lockVersion,
      patch: { title: title.trim() },
    }),
  });
  return (await readJson<{ resume: ResumeRecord }>(response)).resume;
}

export async function duplicateResume(id: string): Promise<ResumeRecord> {
  const response = await fetch(`/api/resumes/${id}/duplicate`, { method: "POST" });
  return (await readJson<{ resume: ResumeRecord }>(response)).resume;
}

export async function deleteResume(id: string): Promise<void> {
  const response = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
  if (!response.ok) await readJson<never>(response);
}

export async function downloadResumePdf(id: string, fallbackTitle: string): Promise<DownloadedResumePdf> {
  const response = await fetch(`/api/resumes/${id}/export`, {
    method: "GET",
    headers: { Accept: "application/pdf" },
  });
  if (!response.ok) return requestError(response);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new DashboardRequestError("The export service did not return a PDF.", 502);
  }

  const filename = filenameFromDisposition(response.headers.get("content-disposition"))
    ?? `${fallbackTitle.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "resume"}.pdf`;

  return { blob: await response.blob(), filename };
}
