"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { ResumeRecord } from "@/data/resumes/types";

import { MoreIcon } from "./Icons";
import { formatEditedTime } from "./format";
import { ResumeThumbnail } from "./ResumeThumbnail";
import styles from "./dashboard.module.css";

type ResumeCardProps = {
  busyAction?: "delete" | "duplicate" | "download" | "rename";
  onDelete: (resume: ResumeRecord) => void;
  onDownload: (resume: ResumeRecord) => void;
  onDuplicate: (resume: ResumeRecord) => void;
  onRename: (resume: ResumeRecord) => void;
  resume: ResumeRecord;
};

export function ResumeCard({ busyAction, onDelete, onDownload, onDuplicate, onRename, resume }: ResumeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const act = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <article className={styles.resumeCard} aria-label={resume.title} aria-busy={Boolean(busyAction)}>
      <div className={styles.resumeLink}>
        <ResumeThumbnail resume={resume} />
        <Link className={styles.thumbnailAction} href={`/resumes/${resume.id}`} aria-label={`Edit ${resume.title}`} />
      </div>
      <div className={styles.cardFooter}>
        <div className={styles.cardText}>
          <Link href={`/resumes/${resume.id}`} className={styles.resumeTitle} title={resume.title}>
            {resume.title}
          </Link>
          <p>
            <span>{formatEditedTime(resume.updatedAt)}</span>
            <span aria-hidden="true"> · </span>
            <span>{resume.pageFormat}</span>
          </p>
        </div>
        <div className={styles.menuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.moreButton}
            aria-label={`Actions for ${resume.title}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MoreIcon />
          </button>
          {menuOpen ? (
            <div className={styles.actionMenu} role="menu" id={menuId} aria-label={`Actions for ${resume.title}`}>
              <Link role="menuitem" href={`/resumes/${resume.id}`} onClick={() => setMenuOpen(false)}>
                Edit
              </Link>
              <button role="menuitem" type="button" disabled={Boolean(busyAction)} onClick={() => act(() => onDownload(resume))}>
                {busyAction === "download" ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button role="menuitem" type="button" disabled={Boolean(busyAction)} onClick={() => act(() => onRename(resume))}>
                Rename
              </button>
              <button role="menuitem" type="button" disabled={Boolean(busyAction)} onClick={() => act(() => onDuplicate(resume))}>
                {busyAction === "duplicate" ? "Duplicating…" : "Duplicate"}
              </button>
              <div className={styles.menuDivider} role="separator" />
              <button className={styles.dangerAction} role="menuitem" type="button" disabled={Boolean(busyAction)} onClick={() => act(() => onDelete(resume))}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
