"use client";

import { useState } from "react";
import type { PersonalDetails, ResumeDocument, ResumeLink } from "@/domain/resume/schema";
import {
  addPersonalLink,
  movePersonalLink,
  removePersonalLink,
  updatePersonalDetails,
  updatePersonalLink,
} from "./document-operations";
import { TextField, UrlField } from "./FieldControls";
import type { ContentEditorChangeMeta } from "./types";
import styles from "./content-editor.module.css";

type PersonalDetailsCardProps = {
  document: ResumeDocument;
  onChange: (document: ResumeDocument, meta: ContentEditorChangeMeta) => void;
  onRequestPhotoUpload?: () => void;
};

export function PersonalDetailsCard({ document, onChange, onRequestPhotoUpload }: PersonalDetailsCardProps) {
  const [expanded, setExpanded] = useState(true);
  const personal = document.personal;

  const update = (patch: Partial<PersonalDetails>) => {
    onChange(updatePersonalDetails(document, patch), { reason: "personal" });
  };

  const updateLink = (link: ResumeLink, patch: Partial<ResumeLink>) => {
    onChange(updatePersonalLink(document, link.id, patch), {
      reason: "personal-link",
      entryId: link.id,
    });
  };

  const summary = [personal.email, personal.phone, personal.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className={styles.card} aria-labelledby="personal-details-heading">
      <header className={styles.cardHeader}>
        <div className={styles.sectionIdentity}>
          <span className={styles.sectionIcon} aria-hidden="true">PD</span>
          <div>
            <h2 id="personal-details-heading">Personal details</h2>
            <p>{summary || "Name, contact details, links and photo"}</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-expanded={expanded}
          aria-controls="personal-details-fields"
          aria-label={`${expanded ? "Collapse" : "Expand"} personal details`}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "⌃" : "⌄"}
        </button>
      </header>

      {expanded ? (
        <div id="personal-details-fields" className={styles.cardBody}>
          <div className={styles.photoRow}>
            <div className={styles.photoPlaceholder} aria-label={personal.photo ? "Profile photo attached" : "No profile photo"}>
              {personal.photo ? "Photo" : personal.fullName.trim().slice(0, 1).toUpperCase() || "+"}
            </div>
            <div>
              <strong>{personal.photo ? "Profile photo attached" : "Add a profile photo"}</strong>
              <p>Photo crop and presentation are controlled in Customize.</p>
              <div className={styles.inlineActions}>
                {onRequestPhotoUpload ? (
                  <button type="button" className={styles.secondaryButton} onClick={onRequestPhotoUpload}>
                    {personal.photo ? "Replace photo" : "Upload photo"}
                  </button>
                ) : null}
                {personal.photo ? (
                  <button type="button" className={styles.dangerTextButton} onClick={() => update({ photo: undefined })}>
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.formGrid}>
            <TextField label="Full name" value={personal.fullName} required onChange={(fullName) => update({ fullName })} />
            <TextField label="Job title" value={personal.jobTitle} onChange={(jobTitle) => update({ jobTitle })} />
            <TextField label="Email" type="email" value={personal.email} onChange={(email) => update({ email })} />
            <TextField label="Phone" type="tel" value={personal.phone} onChange={(phone) => update({ phone })} />
            <TextField label="Location" value={personal.location} onChange={(location) => update({ location })} />
            <TextField label="Address" value={personal.address} onChange={(address) => update({ address })} />
            <UrlField label="Website" value={personal.website} onChange={(website) => update({ website })} />
          </div>

          <div className={styles.subsectionHeader}>
            <div>
              <h3>Links</h3>
              <p>Add LinkedIn, GitHub, portfolios or any named link.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onChange(addPersonalLink(document), { reason: "personal-link" })}
            >
              Add link
            </button>
          </div>

          {personal.links.length ? (
            <div className={styles.linkList}>
              {personal.links.map((link, index) => (
                <article key={link.id} className={`${styles.linkRow} ${link.visible ? "" : styles.muted}`}>
                  <div className={styles.rowControls}>
                    <span className={styles.dragHandle} aria-hidden="true">⠿</span>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={index === 0}
                      onClick={() => onChange(movePersonalLink(document, index, index - 1), { reason: "personal-link", entryId: link.id })}
                      aria-label={`Move ${link.label || "link"} up`}
                    >↑</button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={index === personal.links.length - 1}
                      onClick={() => onChange(movePersonalLink(document, index, index + 1), { reason: "personal-link", entryId: link.id })}
                      aria-label={`Move ${link.label || "link"} down`}
                    >↓</button>
                  </div>
                  <div className={styles.linkFields}>
                    <TextField label="Label" value={link.label} placeholder="LinkedIn" onChange={(label) => updateLink(link, { label })} />
                    <UrlField label="URL" value={link.url} onChange={(url) => updateLink(link, { url })} />
                  </div>
                  <label className={styles.checkField}>
                    <input type="checkbox" checked={link.visible} onChange={(event) => updateLink(link, { visible: event.target.checked })} />
                    <span>Show</span>
                  </label>
                  <button
                    type="button"
                    className={styles.dangerTextButton}
                    onClick={() => onChange(removePersonalLink(document, link.id), { reason: "personal-link", entryId: link.id })}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyHint}>No additional links yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
