"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ResumeRecord } from "@/data/resumes/types";

import { createResume, deleteResume, downloadResumePdf, duplicateResume, listResumes, renameResume } from "./api";
import { BlankPageIcon, DocumentIcon, PlusIcon, UploadIcon } from "./Icons";
import { Modal } from "./Modal";
import { ResumeCard } from "./ResumeCard";
import { sortByUpdatedAt } from "./format";
import styles from "./dashboard.module.css";

type BusyAction = { id: string; action: "delete" | "duplicate" | "download" | "rename" } | null;

function LoadingCards() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div className={styles.skeletonCard} key={item} aria-hidden="true">
          <div className={styles.skeletonPage} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineShort} />
        </div>
      ))}
      <span className={styles.srOnly} role="status">Loading resumes…</span>
    </>
  );
}

export function DashboardLibrary() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ResumeRecord | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ResumeRecord | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);
    try {
      setResumes(sortByUpdatedAt(await listResumes(signal)));
      setStatus("ready");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Your resume library could not be loaded.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const showError = (caught: unknown, fallback: string) => {
    setError(caught instanceof Error ? caught.message : fallback);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const resume = await createResume();
      setCreateOpen(false);
      router.push(`/resumes/${resume.id}`);
    } catch (caught) {
      showError(caught, "The resume could not be created.");
      setCreating(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameTitle.trim()) return;
    setBusy({ id: renameTarget.id, action: "rename" });
    setError(null);
    try {
      const updated = await renameResume(renameTarget, renameTitle);
      setResumes((current) => sortByUpdatedAt(current.map((resume) => (resume.id === updated.id ? updated : resume))));
      setRenameTarget(null);
    } catch (caught) {
      showError(caught, "The resume could not be renamed.");
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async (resume: ResumeRecord) => {
    setBusy({ id: resume.id, action: "duplicate" });
    setError(null);
    try {
      const duplicate = await duplicateResume(resume.id);
      setResumes((current) => sortByUpdatedAt([duplicate, ...current]));
    } catch (caught) {
      showError(caught, "The resume could not be duplicated.");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusy({ id: target.id, action: "delete" });
    setError(null);
    try {
      await deleteResume(target.id);
      setResumes((current) => current.filter((resume) => resume.id !== target.id));
      setDeleteTarget(null);
    } catch (caught) {
      showError(caught, "The resume could not be deleted.");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (resume: ResumeRecord) => {
    setBusy({ id: resume.id, action: "download" });
    setError(null);
    try {
      const pdf = await downloadResumePdf(resume.id, resume.title);
      const href = URL.createObjectURL(pdf.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = pdf.filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 0);
    } catch (caught) {
      showError(caught, "The PDF could not be downloaded.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><DocumentIcon /></span>
          <span>Paperform</span>
        </div>
        <nav aria-label="Workspace">
          <Link className={styles.activeNav} href="/resumes" aria-current="page"><DocumentIcon /> Resumes</Link>
        </nav>
        <p className={styles.privateNote}>Private workspace</p>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Workspace</p>
            <h1>My Resumes</h1>
            <p className={styles.subtitle}>Create focused versions of your resume for every opportunity.</p>
          </div>
          <button className={styles.primaryButton} type="button" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New resume
          </button>
        </header>

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            {status === "error" ? <button type="button" onClick={() => void load()}>Retry</button> : <button type="button" onClick={() => setError(null)}>Dismiss</button>}
          </div>
        ) : null}

        <section aria-label="Resume library" className={styles.grid}>
          <button type="button" className={styles.newCard} onClick={() => setCreateOpen(true)}>
            <span className={styles.newIcon}><PlusIcon /></span>
            <strong>New resume</strong>
            <span>Start blank or import an existing file</span>
          </button>

          {status === "loading" ? <LoadingCards /> : null}
          {status === "ready"
            ? resumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  busyAction={busy?.id === resume.id ? busy.action : undefined}
                  onDelete={setDeleteTarget}
                  onDownload={(target) => void handleDownload(target)}
                  onDuplicate={(target) => void handleDuplicate(target)}
                  onRename={(target) => {
                    setRenameTarget(target);
                    setRenameTitle(target.title);
                  }}
                />
              ))
            : null}
        </section>

        {status === "ready" && resumes.length === 0 ? (
          <p className={styles.emptyHint}>Your first resume will appear here and stay available across visits.</p>
        ) : null}
      </main>

      <Modal open={createOpen} onClose={() => !creating && setCreateOpen(false)} title="Create a resume" description="Choose how you would like to begin. You can edit every detail afterward.">
        <div className={styles.createChoices}>
          <button type="button" onClick={() => void handleCreate()} disabled={creating}>
            <span><BlankPageIcon /></span>
            <strong>{creating ? "Creating…" : "Start blank"}</strong>
            <small>Begin with the essential resume sections.</small>
          </button>
          <button type="button" onClick={() => router.push("/resumes/import")} disabled={creating}>
            <span><UploadIcon /></span>
            <strong>Import existing resume</strong>
            <small>Upload a PDF, DOCX, or TXT file.</small>
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(renameTarget)} onClose={() => !busy && setRenameTarget(null)} title="Rename resume" description="Use a clear title so this version is easy to find later.">
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void handleRename(); }}>
          <label htmlFor="resume-title">Resume title</label>
          <input id="resume-title" autoFocus maxLength={300} value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} />
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setRenameTarget(null)} disabled={busy?.action === "rename"}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={!renameTitle.trim() || busy?.action === "rename"}>{busy?.action === "rename" ? "Saving…" : "Save title"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => !busy && setDeleteTarget(null)} title="Delete resume?" description={deleteTarget ? `“${deleteTarget.title}” will be permanently removed. This action cannot be undone.` : undefined}>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => setDeleteTarget(null)} disabled={busy?.action === "delete"}>Cancel</button>
          <button type="button" className={styles.dangerButton} onClick={() => void handleDelete()} disabled={busy?.action === "delete"}>{busy?.action === "delete" ? "Deleting…" : "Delete resume"}</button>
        </div>
      </Modal>
    </div>
  );
}
