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

function PersonalContactIcon({ kind }: { kind: "email" | "phone" | "location" }) {
  if (kind === "email") return <svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m5 8 7 5 7-5" /></svg>;
  if (kind === "phone") return <svg viewBox="0 0 24 24"><path d="M8 4 5.5 5.2c-.9.5-.9 1.7-.6 2.7 1.5 5 5.2 8.7 10.2 10.2 1 .3 2.2.3 2.7-.6L19 15l-4-2-1.3 1.7a13 13 0 0 1-4.4-4.4L11 9 8 4Z" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
}

export function PersonalDetailsCard({ document, onChange, onRequestPhotoUpload }: PersonalDetailsCardProps) {
  const [expanded, setExpanded] = useState(false);
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
      {!expanded ? (
        <header className={styles.personalSummary}>
          <div className={styles.personalSummaryText}>
            <h2 id="personal-details-heading">{personal.fullName.trim() || "Your Name"}</h2>
            <div className={styles.personalContacts}>
              {personal.email ? <span><span aria-hidden="true"><PersonalContactIcon kind="email" /></span>{personal.email}</span> : null}
              {personal.phone ? <span><span aria-hidden="true"><PersonalContactIcon kind="phone" /></span>{personal.phone}</span> : null}
              {personal.location ? <span><span aria-hidden="true"><PersonalContactIcon kind="location" /></span>{personal.location}</span> : null}
              {!summary ? <span>Name, contact details, links and photo</span> : null}
            </div>
          </div>
          <div
            className={styles.personalPhotoPreview}
            aria-label={personal.photo ? "Profile photo attached" : "No profile photo"}
          >
            {personal.photo ? "Photo" : personal.fullName.trim().slice(0, 1).toUpperCase() || "+"}
          </div>
          <button
            type="button"
            className={styles.personalEditButton}
            aria-label="Edit personal details"
            onClick={() => setExpanded(true)}
          >
            ✎
          </button>
        </header>
      ) : <header className={styles.cardHeader}>
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
      </header>}

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
