"use client";

import { useCallback, useState } from "react";
import type { SectionType } from "@/domain/resume/schema";
import { AddContentModal } from "./AddContentModal";
import { appendSection } from "./document-operations";
import { PersonalDetailsCard } from "./PersonalDetailsCard";
import { SectionCard } from "./SectionCard";
import type { ContentEditorProps } from "./types";
import styles from "./content-editor.module.css";

export function ContentEditor({
  document,
  onChange,
  onRequestImport,
  onRequestPhotoUpload,
  className,
}: ContentEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newSectionId, setNewSectionId] = useState<string>();
  const closeAdd = useCallback(() => setAddOpen(false), []);

  const addSection = (type: Exclude<SectionType, "summary">) => {
    const result = appendSection(document, type);
    setNewSectionId(result.section.id);
    onChange(result.document, { reason: "section-add", sectionId: result.section.id });
    setAddOpen(false);
  };

  return (
    <div className={`${styles.editor} ${className ?? ""}`}>
      <div className={styles.editorIntro}>
        <div>
          <p className={styles.eyebrow}>Content</p>
          <h1>Build your resume</h1>
          <p>Edit details, structure sections and arrange the information shown in your resume.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setAddOpen(true)}>
          + Add content
        </button>
      </div>

      <PersonalDetailsCard
        document={document}
        onChange={onChange}
        onRequestPhotoUpload={onRequestPhotoUpload}
      />

      <div className={styles.sectionList} aria-label="Resume sections">
        {document.sections.map((section) => (
          <SectionCard
            key={section.id}
            document={document}
            section={section}
            onChange={onChange}
            initiallyExpanded={newSectionId === section.id}
          />
        ))}
      </div>

      <button type="button" className={styles.addContentFooter} onClick={() => setAddOpen(true)}>
        <span aria-hidden="true">+</span>
        <span><strong>Add content</strong><small>Education, experience, projects and more</small></span>
      </button>

      <AddContentModal
        open={addOpen}
        onClose={closeAdd}
        onAdd={addSection}
        onRequestImport={onRequestImport}
      />
    </div>
  );
}
