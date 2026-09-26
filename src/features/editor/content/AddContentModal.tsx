"use client";

import { useEffect, useRef } from "react";
import type { SectionType } from "@/domain/resume/schema";
import { SECTION_CATALOG } from "./factories";
import styles from "./content-editor.module.css";

type CatalogType = Exclude<SectionType, "summary">;

type AddContentModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (type: CatalogType) => void;
  onRequestImport?: () => void;
};

const TILE_ICONS: Record<CatalogType, string> = {
  education: "ED",
  experience: "EX",
  skills: "SK",
  languages: "LA",
  certificates: "CE",
  interests: "IN",
  projects: "PJ",
  courses: "CO",
  awards: "AW",
  organisations: "OR",
  publications: "PU",
  references: "RE",
  declaration: "DE",
  custom: "CU",
};

export function AddContentModal({ open, onClose, onAdd, onRequestImport }: AddContentModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-content-title">
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Resume sections</p>
            <h2 id="add-content-title">Add content</h2>
            <p>Choose a section to add. You can rename, move or hide it at any time.</p>
          </div>
          <button ref={closeButton} type="button" className={styles.modalClose} aria-label="Close add content" onClick={onClose}>×</button>
        </header>

        {onRequestImport ? (
          <button type="button" className={styles.importBanner} onClick={() => {
            onClose();
            onRequestImport();
          }}>
            <span className={styles.importIcon} aria-hidden="true">⇧</span>
            <span><strong>Already have a resume?</strong><small>Import a PDF, DOCX or TXT file and edit the result.</small></span>
            <span aria-hidden="true">→</span>
          </button>
        ) : null}

        <div className={styles.catalogGrid}>
          {SECTION_CATALOG.map((item) => (
            <button
              type="button"
              key={item.type}
              className={styles.catalogTile}
              onClick={() => onAdd(item.type)}
            >
              <span className={styles.catalogIcon} aria-hidden="true">{TILE_ICONS[item.type]}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className={styles.tileAdd} aria-hidden="true">+</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
