"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { ResumeDocument, ResumeSection } from "@/domain/resume/schema";
import { legacySkillsToRichText } from "@/domain/resume/schema";
import {
  appendEntry,
  copyEntry,
  moveEntry,
  removeEntry,
  removeSection,
  updateEntry,
  updateSectionSettings,
} from "./document-operations";
import { hasSubstantialContent } from "./editor-utils";
import { DateEditor, TextField } from "./FieldControls";
import { EntryEditor } from "./EntryEditor";
import { RichTextEditor } from "./RichTextEditor";
import type { ContentEditorChangeMeta, EntrySection, ResumeEntry } from "./types";
import styles from "./content-editor.module.css";

type SectionCardProps = {
  document: ResumeDocument;
  section: ResumeSection;
  onChange: (document: ResumeDocument, meta: ContentEditorChangeMeta) => void;
  initiallyExpanded?: boolean;
};

function SectionIcon({ type }: { type: ResumeSection["type"] }) {
  if (type === "experience") return <svg viewBox="0 0 24 24"><path d="M4 8.5h16v10H4zM9 8.5V6h6v2.5M4 12.5h16M10 12.5v2h4v-2" /></svg>;
  if (type === "education") return <svg viewBox="0 0 24 24"><path d="m3 9 9-4 9 4-9 4-9-4Zm3 2.2V16c3.7 2.7 8.3 2.7 12 0v-4.8M21 9v6" /></svg>;
  if (type === "languages") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M4.5 12h15M12 4c2.8 3 2.8 13 0 16M12 4c-2.8 3-2.8 13 0 16" /></svg>;
  if (type === "skills") return <svg viewBox="0 0 24 24"><path d="M9 4.5v4H5a2 2 0 1 0 0 4h4v4h4v-4h4a2 2 0 1 1 0-4h-4v-4H9Z" /></svg>;
  if (type === "certificates" || type === "awards") return <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" /><path d="m9 13-1 7 4-2 4 2-1-7" /></svg>;
  if (type === "summary") return <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h6" /></svg>;
  return <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 9h6M9 13h6" /></svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24"><path d="m7 9.5 5 5 5-5" /></svg>;
}

function entryLabel(entry: ResumeEntry, index: number): string {
  if ("position" in entry) return entry.position || entry.employer || `Experience ${index + 1}`;
  if ("degree" in entry) return entry.degree || entry.institution || `Education ${index + 1}`;
  if ("name" in entry) return entry.name || `Entry ${index + 1}`;
  if ("title" in entry) return entry.title || `Entry ${index + 1}`;
  return `Entry ${index + 1}`;
}

function EntryCard({
  document,
  section,
  entry,
  index,
  expanded,
  onToggle,
  onChange,
  dragIndex,
  setDragIndex,
  shouldFocus,
  onFocused,
}: {
  document: ResumeDocument;
  section: EntrySection;
  entry: ResumeEntry;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (document: ResumeDocument, meta: ContentEditorChangeMeta) => void;
  dragIndex: number | null;
  setDragIndex: (index: number | null) => void;
  shouldFocus: boolean;
  onFocused: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const label = entryLabel(entry, index);
  const entryCount = section.entries.length;

  useEffect(() => {
    if (!expanded || !shouldFocus) return;
    bodyRef.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    onFocused();
  }, [expanded, onFocused, shouldFocus]);

  const changeEntry = (next: ResumeEntry) => {
    onChange(updateEntry(document, section.id, next), {
      reason: "entry-update",
      sectionId: section.id,
      entryId: next.id,
    });
  };

  const deleteEntry = () => {
    if (hasSubstantialContent(entry) && !window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    onChange(removeEntry(document, section.id, entry.id), {
      reason: "entry-delete",
      sectionId: section.id,
      entryId: entry.id,
    });
  };

  const duplicate = () => {
    const result = copyEntry(document, section.id, entry.id);
    onChange(result.document, {
      reason: "entry-duplicate",
      sectionId: section.id,
      entryId: result.entry?.id,
    });
  };

  const drop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onChange(moveEntry(document, section.id, dragIndex, index), {
      reason: "entry-reorder",
      sectionId: section.id,
      entryId: entry.id,
    });
    setDragIndex(null);
  };

  return (
    <article
      className={`${styles.entryCard} ${entry.visible ? "" : styles.muted}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
    >
      <header className={styles.entryHeader}>
        <button
          type="button"
          draggable
          className={styles.dragHandleButton}
          aria-label={`Drag ${label} to reorder`}
          title="Drag to reorder"
          onDragStart={() => setDragIndex(index)}
          onDragEnd={() => setDragIndex(null)}
        >⠿</button>
        <button
          type="button"
          className={styles.entryToggle}
          aria-expanded={expanded}
          aria-controls={`entry-${entry.id}`}
          onClick={onToggle}
        >
          <span>{label}</span>
          <small>{entry.visible ? "Visible" : "Hidden"}</small>
        </button>
        <div className={styles.rowControls}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={index === 0}
            aria-label={`Move ${label} up`}
            onClick={() => onChange(moveEntry(document, section.id, index, index - 1), { reason: "entry-reorder", sectionId: section.id, entryId: entry.id })}
          >↑</button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={index === entryCount - 1}
            aria-label={`Move ${label} down`}
            onClick={() => onChange(moveEntry(document, section.id, index, index + 1), { reason: "entry-reorder", sectionId: section.id, entryId: entry.id })}
          >↓</button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`${entry.visible ? "Hide" : "Show"} ${label}`}
            title={`${entry.visible ? "Hide" : "Show"} entry`}
            onClick={() => changeEntry({ ...entry, visible: !entry.visible } as ResumeEntry)}
          >{entry.visible ? "◉" : "○"}</button>
          <button type="button" className={styles.iconButton} aria-label={`Duplicate ${label}`} onClick={duplicate}>⧉</button>
          <button type="button" className={styles.dangerIconButton} aria-label={`Delete ${label}`} onClick={deleteEntry}>×</button>
        </div>
      </header>
      <div className={styles.collapse} data-expanded={expanded}>
        <div className={styles.collapseInner} aria-hidden={!expanded} inert={!expanded}>
          <div ref={bodyRef} id={`entry-${entry.id}`} className={styles.entryBody}>
            <div className={styles.entryEditHeading}>
              <div>
                <h3>Edit entry</h3>
                <p>Changes update your resume preview automatically.</p>
              </div>
            </div>
            <EntryEditor sectionType={section.type} entry={entry} onChange={changeEntry} />
            <footer className={styles.doneFooter}>
              <button type="button" className={styles.doneButton} onClick={onToggle}>
                <span aria-hidden="true">&#10003;</span>
                Done
              </button>
            </footer>
          </div>
        </div>
      </div>
    </article>
  );
}

export function SectionCard({
  document,
  section,
  onChange,
  initiallyExpanded = false,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [renaming, setRenaming] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [dragEntryIndex, setDragEntryIndex] = useState<number | null>(null);
  const [focusEntryId, setFocusEntryId] = useState<string>();
  const entrySection = "entries" in section ? section : undefined;
  const entryCount = entrySection?.entries.length ?? 0;
  const status = useMemo(() => {
    if (!section.visible) return "Hidden from resume";
    if (section.type === "skills") return "Rich text";
    if (entrySection) return `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`;
    return section.type === "summary" ? "Profile text" : "Declaration text";
  }, [entryCount, entrySection, section.type, section.visible]);

  const updateSettings = (patch: Parameters<typeof updateSectionSettings>[2]) => {
    onChange(updateSectionSettings(document, section.id, patch), {
      reason: "section-update",
      sectionId: section.id,
    });
  };

  const deleteSection = () => {
    if (!window.confirm(`Delete the “${section.heading}” section? This cannot be undone.`)) return;
    onChange(removeSection(document, section.id), {
      reason: "section-delete",
      sectionId: section.id,
    });
  };

  const addEntry = () => {
    const result = appendEntry(document, section.id);
    if (result.entry) {
      setExpandedEntries((current) => new Set(current).add(result.entry!.id));
      setFocusEntryId(result.entry.id);
    }
    onChange(result.document, {
      reason: "entry-add",
      sectionId: section.id,
      entryId: result.entry?.id,
    });
  };

  return (
    <section
      className={`${styles.card} ${section.visible ? "" : styles.muted}`}
      aria-labelledby={`section-title-${section.id}`}
    >
      <header className={styles.cardHeader}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={expanded}
          aria-controls={`section-body-${section.id}`}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className={styles.sectionIcon} aria-hidden="true"><SectionIcon type={section.type} /></span>
          <span className={styles.sectionHeadingText}>
            <strong id={`section-title-${section.id}`}>{section.heading}</strong>
            <small>{status}</small>
          </span>
          <span className={styles.chevron} aria-hidden="true"><ChevronIcon /></span>
        </button>
      </header>

      <div className={styles.collapse} data-expanded={expanded}>
        <div className={styles.collapseInner} aria-hidden={!expanded} inert={!expanded}>
          <div id={`section-body-${section.id}`} className={styles.cardBody}>
          <div className={styles.sectionSettings}>
            {renaming ? (
              <div className={styles.renameRow}>
                <TextField label="Section heading" value={section.heading} onChange={(heading) => {
                  if (heading.trim()) updateSettings({ heading });
                }} />
                <button type="button" className={styles.secondaryButton} onClick={() => setRenaming(false)}>Done</button>
              </div>
            ) : (
              <button type="button" className={styles.textButton} onClick={() => setRenaming(true)}>Edit heading</button>
            )}
            {section.type !== "summary" ? (
              <button type="button" className={styles.dangerTextButton} onClick={deleteSection}>Delete section</button>
            ) : null}
          </div>

          {section.type === "summary" ? (
            <RichTextEditor
              label="Profile summary"
              value={section.content}
              onChange={(content) => onChange(
                { ...document, sections: document.sections.map((candidate) => candidate.id === section.id ? { ...section, content } : candidate) },
                { reason: "section-update", sectionId: section.id },
              )}
            />
          ) : null}

          {section.type === "declaration" ? (
            <>
              <RichTextEditor
                label="Declaration"
                value={section.text}
                onChange={(text) => onChange(
                  { ...document, sections: document.sections.map((candidate) => candidate.id === section.id ? { ...section, text } : candidate) },
                  { reason: "section-update", sectionId: section.id },
                )}
              />
              <div className={styles.formGrid}>
                <TextField label="Place" value={section.place} onChange={(place) => onChange(
                  { ...document, sections: document.sections.map((candidate) => candidate.id === section.id ? { ...section, place } : candidate) },
                  { reason: "section-update", sectionId: section.id },
                )} />
                <DateEditor label="Date" value={section.date} onChange={(date) => onChange(
                  { ...document, sections: document.sections.map((candidate) => candidate.id === section.id ? { ...section, date } : candidate) },
                  { reason: "section-update", sectionId: section.id },
                )} />
              </div>
            </>
          ) : null}

          {section.type === "skills" ? (
            <RichTextEditor
              label="Skills"
              value={section.content ?? legacySkillsToRichText(section.entries)}
              onChange={(content) => onChange(
                { ...document, sections: document.sections.map((candidate) => candidate.id === section.id ? { ...section, content } : candidate) },
                { reason: "section-update", sectionId: section.id },
              )}
            />
          ) : null}

          {entrySection && entrySection.type !== "skills" ? (
            <div className={styles.entries}>
              {entrySection.entries.map((entry, entryIndex) => (
                <EntryCard
                  key={entry.id}
                  document={document}
                  section={entrySection}
                  entry={entry}
                  index={entryIndex}
                  expanded={expandedEntries.has(entry.id)}
                  onToggle={() => setExpandedEntries((current) => {
                    const next = new Set(current);
                    if (next.has(entry.id)) next.delete(entry.id);
                    else next.add(entry.id);
                    return next;
                  })}
                  onChange={onChange}
                  dragIndex={dragEntryIndex}
                  setDragIndex={setDragEntryIndex}
                  shouldFocus={focusEntryId === entry.id}
                  onFocused={() => setFocusEntryId(undefined)}
                />
              ))}
              {entrySection.entries.length === 0 ? <p className={styles.emptyHint}>No entries yet. Add the first one below.</p> : null}
              <button type="button" className={styles.addEntryButton} onClick={addEntry}>+ Add entry</button>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
