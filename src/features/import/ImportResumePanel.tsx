"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./import.module.css";

type ImportResponse = { resume?: { id: string }; warnings?: string[]; error?: string; importId?: string };
type Status = "idle" | "uploading" | "parsing" | "failed";

export function ImportResumePanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();
  const [failedImportId, setFailedImportId] = useState<string>();

  const complete = (result: ImportResponse) => {
    if (!result.resume?.id) throw new Error(result.error || "The import did not create a resume.");
    router.push(`/resumes/${result.resume.id}?imported=1`);
  };

  const upload = async (file: File) => {
    setError(undefined);
    setFailedImportId(undefined);
    setStatus("uploading");
    const form = new FormData();
    form.append("file", file);
    try {
      setStatus("parsing");
      const response = await fetch("/api/import", { method: "POST", body: form });
      const result = await response.json() as ImportResponse;
      if (!response.ok) {
        setFailedImportId(result.importId);
        throw new Error(result.error || "Import failed.");
      }
      complete(result);
    } catch (cause) {
      setStatus("failed");
      setError(cause instanceof Error ? cause.message : "Import failed.");
    }
  };

  const retry = async () => {
    if (!failedImportId) {
      inputRef.current?.click();
      return;
    }
    setStatus("parsing");
    setError(undefined);
    try {
      const response = await fetch(`/api/import/${failedImportId}`, { method: "POST" });
      const result = await response.json() as ImportResponse;
      if (!response.ok) throw new Error(result.error || "Retry failed.");
      complete(result);
    } catch (cause) {
      setStatus("failed");
      setError(cause instanceof Error ? cause.message : "Retry failed.");
    }
  };

  const discard = async () => {
    if (failedImportId) await fetch(`/api/import/${failedImportId}`, { method: "DELETE" });
    setFailedImportId(undefined);
    setError(undefined);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = status === "uploading" || status === "parsing";
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.back} href="/resumes">← Back to My Resumes</Link>
        <section className={styles.card} aria-labelledby="import-title">
          <div className={styles.icon} aria-hidden="true">↥</div>
          <p className={styles.eyebrow}>Import existing resume</p>
          <h1 id="import-title">Bring your experience with you</h1>
          <p className={styles.lead}>Upload a PDF, DOCX, or TXT file. We keep the original private, extract only supported facts, and open the result for review.</p>
          <label className={styles.dropzone} data-busy={busy}>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/plain,.txt"
              disabled={busy}
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }}
            />
            <strong>{status === "uploading" ? "Storing source privately…" : status === "parsing" ? "Extracting editable content…" : "Choose a resume file"}</strong>
            <span>PDF, DOCX, or UTF-8 TXT · up to 15 MiB</span>
          </label>
          {error ? (
            <div className={styles.error} role="alert">
              <strong>Import needs attention</strong>
              <p>{error}</p>
              <div className={styles.actions}>
                <button type="button" onClick={() => void retry()}>Retry</button>
                <button type="button" className={styles.secondary} onClick={() => void discard()}>Delete failed import</button>
              </div>
            </div>
          ) : null}
          <div className={styles.notes}>
            <p><strong>Private by design.</strong> The source is stored in the private resume-imports bucket and never exposed as a public URL.</p>
            <p><strong>Review encouraged.</strong> Uncertain text is preserved in an Imported Content section instead of being discarded or guessed.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
