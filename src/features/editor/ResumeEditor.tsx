"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { ResumeRecord } from "@/data/resumes";
import { ContentEditor } from "@/features/editor/content";
import { CustomizePanel } from "@/features/editor/customize";
import { ResumeRenderer } from "@/features/resume-renderer";

import styles from "./resume-editor.module.css";
import { useResumeAutosave } from "./useResumeAutosave";

type Mode = "content" | "customize";

async function responseError(response: Response, fallback: string): Promise<Error> {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return new Error(payload.error || fallback);
}

export function ResumeEditor({ initialResume, initialPhotoUrl }: { initialResume: ResumeRecord; initialPhotoUrl?: string }) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialResume.title);
  const [document, setDocument] = useState(initialResume.content);
  const [design, setDesign] = useState(initialResume.design);
  const [mode, setMode] = useState<Mode>("content");
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [actionError, setActionError] = useState<string>();
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const snapshot = useMemo(() => ({ title, content: document, design }), [title, document, design]);
  const autosave = useResumeAutosave({ resumeId: initialResume.id, initialVersion: initialResume.lockVersion, snapshot });
  const assetUrls = document.personal.photo?.storagePath && photoUrl ? { [document.personal.photo.storagePath]: photoUrl } : undefined;

  const goBack = async () => {
    if (await autosave.flush()) router.push("/resumes");
  };

  const uploadPhoto = async (file: File) => {
    setActionError(undefined);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`/api/resumes/${initialResume.id}/photo`, { method: "POST", body: form });
    if (!response.ok) throw await responseError(response, "The photo could not be uploaded.");
    const payload = await response.json() as { storagePath: string; signedUrl: string };
    setPhotoUrl(payload.signedUrl);
    setDocument((current) => ({ ...current, personal: { ...current.personal, photo: { storagePath: payload.storagePath, alt: `${current.personal.fullName || "Resume"} profile` } } }));
  };

  const download = async () => {
    setDownloading(true);
    setActionError(undefined);
    try {
      if (!(await autosave.flush())) throw new Error("Save your pending changes before downloading the PDF.");
      const response = await fetch(`/api/resumes/${initialResume.id}/export`, { headers: { Accept: "application/pdf" } });
      if (!response.ok) throw await responseError(response, "The PDF could not be generated.");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? "resume.pdf";
      const href = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 0);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The PDF could not be generated.");
    } finally {
      setDownloading(false);
    }
  };

  const duplicate = async () => {
    if (!(await autosave.flush())) throw new Error("Save your pending changes before duplicating the resume.");
    const response = await fetch(`/api/resumes/${initialResume.id}/duplicate`, { method: "POST" });
    if (!response.ok) throw await responseError(response, "The resume could not be duplicated.");
    const payload = await response.json() as { resume: ResumeRecord };
    router.push(`/resumes/${payload.resume.id}`);
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${title || "Untitled Resume"}” permanently?`)) return;
    const response = await fetch(`/api/resumes/${initialResume.id}`, { method: "DELETE" });
    if (!response.ok) throw await responseError(response, "The resume could not be deleted.");
    router.push("/resumes");
  };

  const runAction = (action: () => Promise<void>) => {
    setMenuOpen(false);
    setActionError(undefined);
    void action().catch((cause) => setActionError(cause instanceof Error ? cause.message : "The action could not be completed."));
  };

  return (
    <div className={styles.editor}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarStart}>
          <button type="button" className={styles.backButton} onClick={() => void goBack()} aria-label="Back to My Resumes">←</button>
          <div className={styles.modeTabs} role="tablist" aria-label="Editor mode">
            <button type="button" role="tab" aria-selected={mode === "content"} onClick={() => setMode("content")}>Content</button>
            <button type="button" role="tab" aria-selected={mode === "customize"} onClick={() => setMode("customize")}>Customize</button>
          </div>
        </div>
        <div className={styles.toolbarCenter}>
          <label htmlFor="resume-title">Resume title</label>
          <input id="resume-title" value={title} maxLength={300} onChange={(event) => setTitle(event.target.value)} />
          <div className={styles.saveState} data-state={autosave.status} role="status">
            {autosave.status === "saving" ? "Saving…" : autosave.status === "error" ? "Save failed" : "Saved"}
            {autosave.status === "error" ? <button type="button" onClick={() => void autosave.retry().catch(() => undefined)}>Retry</button> : null}
          </div>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.downloadButton} disabled={downloading} onClick={() => void download()}>{downloading ? "Generating…" : "Download PDF"}</button>
          <div className={styles.menuWrap}>
            <button type="button" className={styles.menuButton} aria-label="Resume actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>•••</button>
            {menuOpen ? <div className={styles.menu} role="menu">
              <button type="button" role="menuitem" onClick={() => runAction(duplicate)}>Duplicate</button>
              <button type="button" role="menuitem" className={styles.danger} onClick={() => runAction(remove)}>Delete</button>
            </div> : null}
          </div>
        </div>
      </header>

      {autosave.error || actionError ? <div className={styles.errorBanner} role="alert">{actionError || autosave.error}</div> : null}

      <div className={styles.workspace} data-mode={mode}>
        <section className={styles.controls} aria-label={`${mode} controls`}>
          {mode === "content" ? (
            <ContentEditor
              document={document}
              onChange={setDocument}
              onRequestImport={() => router.push("/resumes/import")}
              onRequestPhotoUpload={() => uploadRef.current?.click()}
            />
          ) : (
            <CustomizePanel
              design={design}
              onChange={setDesign}
              sections={document.sections.map((section) => ({ id: section.id, label: section.heading, type: section.type }))}
              photoAsset={{ present: Boolean(document.personal.photo), previewUrl: photoUrl, alt: document.personal.photo?.alt }}
              onPhotoUpload={uploadPhoto}
              onPhotoRemove={() => { setPhotoUrl(undefined); setDocument((current) => ({ ...current, personal: { ...current.personal, photo: undefined } })); }}
            />
          )}
          <input ref={uploadRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file).catch((cause) => setActionError(cause instanceof Error ? cause.message : "Photo upload failed.")); event.currentTarget.value = ""; }} />
        </section>
        <section className={styles.previewWorkspace} aria-label="Live resume preview">
          <div className={styles.previewScale} data-page-format={design.document.pageFormat}>
            <ResumeRenderer document={document} design={design} pageFormat={design.document.pageFormat} mode="editor" assetUrls={assetUrls} />
          </div>
        </section>
      </div>
    </div>
  );
}
