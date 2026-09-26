"use client";

import type { ResumeSection } from "@/domain/resume/schema";
import { DateEditor, DateRangeEditor, LevelField, TextField, UrlField } from "./FieldControls";
import { RichTextEditor } from "./RichTextEditor";
import type { EntrySection, ResumeEntry } from "./types";
import styles from "./content-editor.module.css";

type EntryOf<T extends EntrySection["type"]> = Extract<ResumeSection, { type: T }>["entries"][number];

type EntryEditorProps = {
  sectionType: EntrySection["type"];
  entry: ResumeEntry;
  onChange: (entry: ResumeEntry) => void;
};

function ExperienceFields({ entry, onChange }: { entry: EntryOf<"experience">; onChange: (entry: EntryOf<"experience">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Position" value={entry.position} onChange={(position) => onChange({ ...entry, position })} />
        <TextField label="Employer" value={entry.employer} onChange={(employer) => onChange({ ...entry, employer })} />
        <UrlField label="Employer website" value={entry.employerUrl} onChange={(employerUrl) => onChange({ ...entry, employerUrl })} />
        <TextField label="Location" value={entry.location} onChange={(location) => onChange({ ...entry, location })} />
      </div>
      <DateRangeEditor value={entry.dateRange} currentLabel="I currently work here" onChange={(dateRange) => onChange({ ...entry, dateRange })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function EducationFields({ entry, onChange }: { entry: EntryOf<"education">; onChange: (entry: EntryOf<"education">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Degree or programme" value={entry.degree} onChange={(degree) => onChange({ ...entry, degree })} />
        <TextField label="School or institution" value={entry.institution} onChange={(institution) => onChange({ ...entry, institution })} />
        <UrlField label="Institution website" value={entry.institutionUrl} onChange={(institutionUrl) => onChange({ ...entry, institutionUrl })} />
        <TextField label="Location" value={entry.location} onChange={(location) => onChange({ ...entry, location })} />
      </div>
      <DateRangeEditor value={entry.dateRange} currentLabel="I currently study here" onChange={(dateRange) => onChange({ ...entry, dateRange })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function SkillFields({ entry, onChange }: { entry: EntryOf<"skills">; onChange: (entry: EntryOf<"skills">) => void }) {
  return (
    <div className={styles.formGrid}>
      <TextField label="Skill" value={entry.name} onChange={(name) => onChange({ ...entry, name })} />
      <TextField label="Category" value={entry.category} onChange={(category) => onChange({ ...entry, category })} />
      <TextField label="Description" value={entry.description} multiline onChange={(description) => onChange({ ...entry, description })} />
      <LevelField value={entry.level} onChange={(level) => onChange({ ...entry, level })} />
    </div>
  );
}

function LanguageFields({ entry, onChange }: { entry: EntryOf<"languages">; onChange: (entry: EntryOf<"languages">) => void }) {
  return (
    <div className={styles.formGrid}>
      <TextField label="Language" value={entry.name} onChange={(name) => onChange({ ...entry, name })} />
      <TextField label="Proficiency" value={entry.proficiency} placeholder="Native, fluent, B2…" onChange={(proficiency) => onChange({ ...entry, proficiency })} />
      <TextField label="Detail" value={entry.detail} onChange={(detail) => onChange({ ...entry, detail })} />
      <LevelField value={entry.level} onChange={(level) => onChange({ ...entry, level })} />
    </div>
  );
}

function ProjectFields({ entry, onChange }: { entry: EntryOf<"projects">; onChange: (entry: EntryOf<"projects">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Project title" value={entry.title} onChange={(title) => onChange({ ...entry, title })} />
        <TextField label="Subtitle or role" value={entry.subtitle} onChange={(subtitle) => onChange({ ...entry, subtitle })} />
        <UrlField label="Project URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateRangeEditor value={entry.dateRange} onChange={(dateRange) => onChange({ ...entry, dateRange })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function CertificateFields({ entry, onChange }: { entry: EntryOf<"certificates">; onChange: (entry: EntryOf<"certificates">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Certificate" value={entry.title} onChange={(title) => onChange({ ...entry, title })} />
        <TextField label="Issuer" value={entry.issuer} onChange={(issuer) => onChange({ ...entry, issuer })} />
        <UrlField label="Credential URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateEditor label="Date" value={entry.date} onChange={(date) => onChange({ ...entry, date })} />
    </>
  );
}

function CourseFields({ entry, onChange }: { entry: EntryOf<"courses">; onChange: (entry: EntryOf<"courses">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Course" value={entry.title} onChange={(title) => onChange({ ...entry, title })} />
        <TextField label="Provider" value={entry.provider} onChange={(provider) => onChange({ ...entry, provider })} />
        <UrlField label="Course URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateRangeEditor value={entry.dateRange} onChange={(dateRange) => onChange({ ...entry, dateRange })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function AwardFields({ entry, onChange }: { entry: EntryOf<"awards">; onChange: (entry: EntryOf<"awards">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Award" value={entry.title} onChange={(title) => onChange({ ...entry, title })} />
        <TextField label="Issuer" value={entry.issuer} onChange={(issuer) => onChange({ ...entry, issuer })} />
        <UrlField label="Award URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateEditor label="Date" value={entry.date} onChange={(date) => onChange({ ...entry, date })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function OrganisationFields({ entry, onChange }: { entry: EntryOf<"organisations">; onChange: (entry: EntryOf<"organisations">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Organisation" value={entry.name} onChange={(name) => onChange({ ...entry, name })} />
        <TextField label="Role" value={entry.role} onChange={(role) => onChange({ ...entry, role })} />
        <TextField label="Location" value={entry.location} onChange={(location) => onChange({ ...entry, location })} />
        <UrlField label="Organisation URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateRangeEditor value={entry.dateRange} onChange={(dateRange) => onChange({ ...entry, dateRange })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function PublicationFields({ entry, onChange }: { entry: EntryOf<"publications">; onChange: (entry: EntryOf<"publications">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Publication title" value={entry.title} onChange={(title) => onChange({ ...entry, title })} />
        <TextField label="Publisher or source" value={entry.publisher} onChange={(publisher) => onChange({ ...entry, publisher })} />
        <UrlField label="Publication URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateEditor label="Date" value={entry.date} onChange={(date) => onChange({ ...entry, date })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

function InterestFields({ entry, onChange }: { entry: EntryOf<"interests">; onChange: (entry: EntryOf<"interests">) => void }) {
  return (
    <div className={styles.formGrid}>
      <TextField label="Interest" value={entry.name} onChange={(name) => onChange({ ...entry, name })} />
      <UrlField label="Related URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      <TextField label="Description" value={entry.description} multiline onChange={(description) => onChange({ ...entry, description })} />
    </div>
  );
}

function ReferenceFields({ entry, onChange }: { entry: EntryOf<"references">; onChange: (entry: EntryOf<"references">) => void }) {
  return (
    <div className={styles.formGrid}>
      <TextField label="Name" value={entry.name} onChange={(name) => onChange({ ...entry, name })} />
      <TextField label="Job title" value={entry.jobTitle} onChange={(jobTitle) => onChange({ ...entry, jobTitle })} />
      <TextField label="Organisation" value={entry.organisation} onChange={(organisation) => onChange({ ...entry, organisation })} />
      <TextField label="Email" type="email" value={entry.email} onChange={(email) => onChange({ ...entry, email })} />
      <TextField label="Phone" type="tel" value={entry.phone} onChange={(phone) => onChange({ ...entry, phone })} />
      <TextField label="Note" value={entry.note} multiline onChange={(note) => onChange({ ...entry, note })} />
    </div>
  );
}

function CustomFields({ entry, onChange }: { entry: EntryOf<"custom">; onChange: (entry: EntryOf<"custom">) => void }) {
  return (
    <>
      <div className={styles.formGrid}>
        <TextField label="Title" value={entry.title} onChange={(title) => onChange({ ...entry, title })} />
        <TextField label="Subtitle" value={entry.subtitle} onChange={(subtitle) => onChange({ ...entry, subtitle })} />
        <TextField label="Location" value={entry.location} onChange={(location) => onChange({ ...entry, location })} />
        <UrlField label="URL" value={entry.url} onChange={(url) => onChange({ ...entry, url })} />
      </div>
      <DateRangeEditor value={entry.dateRange} onChange={(dateRange) => onChange({ ...entry, dateRange })} />
      <RichTextEditor label="Description" value={entry.description} onChange={(description) => onChange({ ...entry, description })} />
    </>
  );
}

export function EntryEditor({ sectionType, entry, onChange }: EntryEditorProps) {
  switch (sectionType) {
    case "experience":
      return <ExperienceFields entry={entry as EntryOf<"experience">} onChange={onChange} />;
    case "education":
      return <EducationFields entry={entry as EntryOf<"education">} onChange={onChange} />;
    case "skills":
      return <SkillFields entry={entry as EntryOf<"skills">} onChange={onChange} />;
    case "languages":
      return <LanguageFields entry={entry as EntryOf<"languages">} onChange={onChange} />;
    case "projects":
      return <ProjectFields entry={entry as EntryOf<"projects">} onChange={onChange} />;
    case "certificates":
      return <CertificateFields entry={entry as EntryOf<"certificates">} onChange={onChange} />;
    case "courses":
      return <CourseFields entry={entry as EntryOf<"courses">} onChange={onChange} />;
    case "awards":
      return <AwardFields entry={entry as EntryOf<"awards">} onChange={onChange} />;
    case "organisations":
      return <OrganisationFields entry={entry as EntryOf<"organisations">} onChange={onChange} />;
    case "publications":
      return <PublicationFields entry={entry as EntryOf<"publications">} onChange={onChange} />;
    case "interests":
      return <InterestFields entry={entry as EntryOf<"interests">} onChange={onChange} />;
    case "references":
      return <ReferenceFields entry={entry as EntryOf<"references">} onChange={onChange} />;
    case "custom":
      return <CustomFields entry={entry as EntryOf<"custom">} onChange={onChange} />;
  }
}
