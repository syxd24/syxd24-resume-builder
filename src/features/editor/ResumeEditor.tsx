"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { ResumeRecord } from "@/data/resumes";
import { ContentEditor } from "@/features/editor/content";
import { CustomizePanel } from "@/features/editor/customize";
import { ResumeRenderer } from "@/features/resume-renderer";

import styles from "./resume-editor.module.css";
import { useResumeAutosave } from "./useResumeAutosave";

type Mode = "content" | "customize";
type MobilePane = "edit" | "preview";
type PreviewZoomMode = "fit-width" | "fit-page" | "actual" | "custom";

const MIN_EDITOR_PERCENT = 36;
const MAX_EDITOR_PERCENT = 58;
const MIN_PREVIEW_SCALE = 0.35;
const MAX_PREVIEW_SCALE = 1.6;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return new Error(payload.error || fallback);
}

export function ResumeEditor({
  initialResume,
  initialPhotoUrl,
  previewMode = false,
}: {
  initialResume: ResumeRecord;
  initialPhotoUrl?: string;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const previewWorkspaceRef = useRef<HTMLElement>(null);
  const previewToolbarRef = useRef<HTMLDivElement>(null);
  const previewSurfaceRef = useRef<HTMLDivElement>(null);
  const previewScaleRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initialResume.title);
  const [document, setDocument] = useState(initialResume.content);
  const [design, setDesign] = useState(initialResume.design);
  const [mode, setMode] = useState<Mode>("content");
  const [mobilePane, setMobilePane] = useState<MobilePane>("edit");
  const [editorPercent, setEditorPercent] = useState(45);
  const [resizing, setResizing] = useState(false);
  const [previewZoomMode, setPreviewZoomMode] = useState<PreviewZoomMode>("fit-width");
  const [previewScale, setPreviewScale] = useState(0.9);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [actionError, setActionError] = useState<string>();
  const [externalChangeWarning, setExternalChangeWarning] = useState<string>();
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const snapshot = useMemo(() => ({ title, content: document, design }), [title, document, design]);
  const autosave = useResumeAutosave({ resumeId: initialResume.id, initialVersion: initialResume.lockVersion, snapshot, disabled: previewMode });
  const { versionRef, hasPendingChanges } = autosave;
  const assetUrls = document.personal.photo?.storagePath && photoUrl ? { [document.personal.photo.storagePath]: photoUrl } : undefined;

  // ChatGPT may update a saved CV in Supabase while this editor tab is inactive.
  // Reload only clean local state; never discard pending edits or an in-flight save.
  useEffect(() => {
    if (previewMode) return;
    let checking = false;
    let disposed = false;
    const checkExternalUpdates = async () => {
      if (checking || window.document.visibilityState === "hidden") return;
      checking = true;
      try {
        const response = await fetch(`/api/resumes/${initialResume.id}`, { cache: "no-store" });
        if (!response.ok || disposed) return;
        const payload = await response.json() as { resume?: Pick<ResumeRecord, "lockVersion"> };
        if (!payload.resume || payload.resume.lockVersion <= versionRef.current || disposed) return;
        if (hasPendingChanges()) {
          setExternalChangeWarning("A newer CV is saved in another tab or ChatGPT. Your local edits were not replaced. Copy them before refreshing.");
        } else {
          window.location.reload();
        }
      } catch {
        // A transient network failure must not interfere with editing.
      } finally {
        checking = false;
      }
    };
    const onVisibility = () => { if (window.document.visibilityState === "visible") void checkExternalUpdates(); };
    window.addEventListener("focus", checkExternalUpdates);
    window.document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.removeEventListener("focus", checkExternalUpdates);
      window.document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [initialResume.id, previewMode, hasPendingChanges, versionRef]);

  const updateFittedPreviewScale = useCallback(() => {
    if (previewZoomMode !== "fit-width" && previewZoomMode !== "fit-page") return;

    const viewport = previewWorkspaceRef.current;
    const surface = previewSurfaceRef.current;
    const scaleTarget = previewScaleRef.current;
    const firstPage = scaleTarget?.querySelector<HTMLElement>("[data-resume-page]");
    if (!viewport || !surface || !firstPage || viewport.clientWidth === 0) return;

    const surfaceStyles = window.getComputedStyle(surface);
    const horizontalPadding = Number.parseFloat(surfaceStyles.paddingLeft) + Number.parseFloat(surfaceStyles.paddingRight);
    const verticalPadding = Number.parseFloat(surfaceStyles.paddingTop) + Number.parseFloat(surfaceStyles.paddingBottom);
    const availableWidth = Math.max(1, viewport.clientWidth - horizontalPadding);
    const widthScale = availableWidth / firstPage.offsetWidth;

    if (previewZoomMode === "fit-width") {
      setPreviewScale(clamp(widthScale, MIN_PREVIEW_SCALE, MAX_PREVIEW_SCALE));
      return;
    }

    const toolbarHeight = previewToolbarRef.current?.offsetHeight ?? 0;
    const availableHeight = Math.max(1, viewport.clientHeight - toolbarHeight - verticalPadding);
    const heightScale = availableHeight / firstPage.offsetHeight;
    setPreviewScale(clamp(Math.min(widthScale, heightScale), MIN_PREVIEW_SCALE, MAX_PREVIEW_SCALE));
  }, [previewZoomMode]);

  useLayoutEffect(() => {
    updateFittedPreviewScale();
    const viewport = previewWorkspaceRef.current;
    if (!viewport) return;

    const handleResize = () => updateFittedPreviewScale();
    window.addEventListener("resize", handleResize);
    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [design.document.pageFormat, editorPercent, mobilePane, updateFittedPreviewScale]);

  const selectZoomMode = (nextMode: Exclude<PreviewZoomMode, "custom">) => {
    setPreviewZoomMode(nextMode);
    if (nextMode === "actual") setPreviewScale(1);
  };

  const stepPreviewZoom = (direction: -1 | 1) => {
    setPreviewZoomMode("custom");
    setPreviewScale((current) => clamp(Math.round((current + direction * 0.1) * 100) / 100, MIN_PREVIEW_SCALE, MAX_PREVIEW_SCALE));
  };

  const resizePanels = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.type === "pointermove" && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const bounds = workspace.getBoundingClientRect();
    const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
    setEditorPercent(clamp(nextPercent, MIN_EDITOR_PERCENT, MAX_EDITOR_PERCENT));
  };

  const beginPanelResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
    resizePanels(event);
  };

  const endPanelResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizing(false);
  };

  const resizePanelsWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const step = event.shiftKey ? 4 : 1;
    setEditorPercent((current) => clamp(current + direction * step, MIN_EDITOR_PERCENT, MAX_EDITOR_PERCENT));
  };

  const goBack = async () => {
    if (previewMode) {
      router.push("/resumes");
      return;
    }
    if (await autosave.flush()) router.push("/resumes");
  };

  const uploadPhoto = async (file: File) => {
    setActionError(undefined);
    if (previewMode) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return previewUrl;
      });
      setDocument((current) => ({ ...current, personal: { ...current.personal, photo: { storagePath: "preview/photo", alt: `${current.personal.fullName || "Resume"} profile` } } }));
      return;
    }
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`/api/resumes/${initialResume.id}/photo`, { method: "POST", body: form });
    if (!response.ok) throw await responseError(response, "The photo could not be uploaded.");
    const payload = await response.json() as { storagePath: string; signedUrl: string };
    setPhotoUrl(payload.signedUrl);
    setDocument((current) => ({ ...current, personal: { ...current.personal, photo: { storagePath: payload.storagePath, alt: `${current.personal.fullName || "Resume"} profile` } } }));
  };

  const download = async () => {
    if (previewMode) {
      window.print();
      return;
    }
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

  const duplicateForJob = async () => {
    const responseTitle = window.prompt("Company and job title for the new CV:", `${title} — Job application`);
    if (responseTitle === null) return;
    const newTitle = responseTitle.trim();
    if (!newTitle || newTitle.length > 300) throw new Error("Enter a CV title between 1 and 300 characters.");
    if (!(await autosave.flush())) throw new Error("Save or resolve your pending changes before duplicating.");
    const response = await fetch(`/api/resumes/${initialResume.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, expectedVersion: autosave.versionRef.current }),
    });
    if (!response.ok) throw await responseError(response, "Could not create a job-specific copy.");
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

  const moveSection = (from: number, to: number) => {
    setDocument((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.sections.length || to >= current.sections.length) return current;
      const sections = [...current.sections];
      const [moved] = sections.splice(from, 1);
      if (!moved) return current;
      sections.splice(to, 0, moved);
      return { ...current, sections };
    });
  };

  const updateSectionStructure = (sectionId: string, patch: { column?: "primary" | "secondary" | "full"; visible?: boolean }) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section),
    }));
  };

  return (
    <div className={styles.editor}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarStart}>
          <button type="button" className={styles.backButton} onClick={() => void goBack()} aria-label="Back to My Resumes">
            <span aria-hidden="true">&#8592;</span>
            <span>Overview</span>
          </button>
          <div className={styles.modeTabs} role="tablist" aria-label="Editor mode">
            <button type="button" role="tab" aria-selected={mode === "content"} onClick={() => { setMode("content"); setMobilePane("edit"); }}>Content</button>
            <button type="button" role="tab" aria-selected={mode === "customize"} onClick={() => { setMode("customize"); setMobilePane("edit"); }}>Customize</button>
          </div>
        </div>
        <div className={styles.toolbarCenter}>
          <label htmlFor="resume-title">Resume title</label>
          <input id="resume-title" value={title} maxLength={300} onChange={(event) => setTitle(event.target.value)} />
          <div className={styles.saveState} data-state={autosave.status} role="status">
            <span className={styles.saveDot} aria-hidden="true" />
            {previewMode ? "Preview mode" : autosave.status === "saving" ? "Saving…" : autosave.status === "error" ? "Save failed" : "Saved"}
            {autosave.status === "error" ? <button type="button" onClick={() => void autosave.retry().catch(() => undefined)}>Retry</button> : null}
          </div>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.downloadButton} disabled={downloading} onClick={() => void download()}>{previewMode ? "Print preview" : downloading ? "Generating…" : "Download PDF"}</button>
          {!previewMode ? <div className={styles.menuWrap}>
            <button type="button" className={styles.menuButton} aria-label="Resume actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>&#8230;</button>
            {menuOpen ? <div className={styles.menu} role="menu">
              <button type="button" role="menuitem" onClick={() => runAction(duplicateForJob)}>Create job-specific copy</button>
              <button type="button" role="menuitem" onClick={() => runAction(duplicate)}>Duplicate</button>
              <button type="button" role="menuitem" className={styles.danger} onClick={() => runAction(remove)}>Delete</button>
            </div> : null}
          </div> : null}
        </div>
      </header>

      {autosave.error || actionError || externalChangeWarning ? <div className={styles.errorBanner} role="alert">{actionError || autosave.error || externalChangeWarning}</div> : null}

      <div
        ref={workspaceRef}
        className={styles.workspace}
        data-mode={mode}
        data-mobile-pane={mobilePane}
        data-resizing={resizing ? "true" : "false"}
        style={{ "--editor-pane-width": `${editorPercent}%` } as CSSProperties}
      >
        <div className={styles.mobilePaneTabs} role="tablist" aria-label="Mobile workspace view">
          <button type="button" role="tab" aria-selected={mobilePane === "edit"} onClick={() => setMobilePane("edit")}>Edit</button>
          <button type="button" role="tab" aria-selected={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Preview</button>
        </div>
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
              sections={document.sections.map((section) => ({ id: section.id, label: section.heading, type: section.type, column: section.column, visible: section.visible }))}
              onSectionMove={moveSection}
              onSectionColumnChange={(sectionId, column) => updateSectionStructure(sectionId, { column })}
              onSectionVisibilityChange={(sectionId, visible) => updateSectionStructure(sectionId, { visible })}
              photoAsset={{ present: Boolean(document.personal.photo), previewUrl: photoUrl, alt: document.personal.photo?.alt }}
              onPhotoUpload={uploadPhoto}
              onPhotoRemove={() => { setPhotoUrl(undefined); setDocument((current) => ({ ...current, personal: { ...current.personal, photo: undefined } })); }}
            />
          )}
          <input ref={uploadRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file).catch((cause) => setActionError(cause instanceof Error ? cause.message : "Photo upload failed.")); event.currentTarget.value = ""; }} />
        </section>
        <button
          type="button"
          className={styles.panelDivider}
          role="separator"
          aria-label="Resize editor and preview panels"
          aria-orientation="vertical"
          aria-valuemin={MIN_EDITOR_PERCENT}
          aria-valuemax={MAX_EDITOR_PERCENT}
          aria-valuenow={Math.round(editorPercent)}
          title="Drag to resize panels. Double-click to reset."
          onDoubleClick={() => setEditorPercent(45)}
          onKeyDown={resizePanelsWithKeyboard}
          onPointerDown={beginPanelResize}
          onPointerMove={resizePanels}
          onPointerUp={endPanelResize}
          onPointerCancel={endPanelResize}
        >
          <span aria-hidden="true" />
        </button>
        <section
          ref={previewWorkspaceRef}
          className={styles.previewWorkspace}
          data-preview-workspace="true"
          data-zoom-mode={previewZoomMode}
          aria-label="Live resume preview"
        >
          <div ref={previewToolbarRef} className={styles.previewToolbar} aria-label="Preview zoom controls">
            <div className={styles.previewToolbarLabel}>
              <span>Preview</span>
              <span className={styles.previewZoomValue} aria-live="polite">{Math.round(previewScale * 100)}%</span>
            </div>
            <div className={styles.zoomControls}>
              <button type="button" aria-pressed={previewZoomMode === "fit-width"} onClick={() => selectZoomMode("fit-width")}>Fit width</button>
              <button type="button" aria-pressed={previewZoomMode === "fit-page"} onClick={() => selectZoomMode("fit-page")}>Fit page</button>
              <button type="button" aria-pressed={previewZoomMode === "actual"} onClick={() => selectZoomMode("actual")}>100%</button>
              <span className={styles.zoomStepper}>
                <button type="button" aria-label="Zoom out" disabled={previewScale <= MIN_PREVIEW_SCALE} onClick={() => stepPreviewZoom(-1)}>&minus;</button>
                <button type="button" aria-label="Zoom in" disabled={previewScale >= MAX_PREVIEW_SCALE} onClick={() => stepPreviewZoom(1)}>+</button>
              </span>
            </div>
          </div>
          <div ref={previewSurfaceRef} className={styles.previewSurface} data-preview-viewport="true">
            <div
              ref={previewScaleRef}
              className={styles.previewScale}
              data-preview-scale="true"
              data-page-format={design.document.pageFormat}
              data-zoom-mode={previewZoomMode}
              style={{ "--preview-scale": previewScale } as CSSProperties}
            >
              <ResumeRenderer document={document} design={design} pageFormat={design.document.pageFormat} mode="editor" assetUrls={assetUrls} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
