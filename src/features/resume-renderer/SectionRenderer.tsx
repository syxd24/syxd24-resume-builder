import Image from "next/image";
import type { ReactNode } from "react";

import type { ResumeDesign, ResumeSection, SectionType } from "@/domain/resume";

import { formatDateRange, formatResumeDate, joinMetadata, safeHref } from "./format";
import { RichTextContent } from "./RichText";
import styles from "./resume-renderer.module.css";

export type ResumeAssetUrls = Readonly<Record<string, string | undefined>>;

type SectionRendererProps = {
  section: ResumeSection;
  design: ResumeDesign;
  assetUrls?: ResumeAssetUrls;
};

type EntryHeaderProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  metadata?: string;
  design: ResumeDesign;
};

function ExternalLink({ href, children }: { href?: string; children: ReactNode }) {
  const safeUrl = safeHref(href);
  if (!safeUrl) return <>{children}</>;
  return (
    <a href={safeUrl} rel="noreferrer" data-resume-link="entry">
      {children}
    </a>
  );
}

function EntryHeader({ primary, secondary, metadata, design }: EntryHeaderProps) {
  return (
    <div className={styles.entryHeader} data-metadata-align={design.entries.metadataAlign}>
      <div className={styles.entryTitles}>
        <div className={styles.entryPrimary}>{primary}</div>
        {secondary ? <div className={styles.entrySecondary}>{secondary}</div> : null}
      </div>
      {metadata ? <div className={styles.entryMetadata}>{metadata}</div> : null}
    </div>
  );
}

function Entry({ children }: { children: ReactNode }) {
  return <article className={styles.entry}>{children}</article>;
}

function Description({ children }: { children: ReactNode }) {
  return <div className={styles.entryDescription}>{children}</div>;
}

function sectionHeadingStyle(section: ResumeSection, design: ResumeDesign) {
  const override = design.sections[section.id]?.headingStyle;
  return override && override !== "inherit" ? override : design.headings.style;
}

function SectionShell({ section, design, children }: SectionRendererProps & { children: ReactNode }) {
  const headingStyle = sectionHeadingStyle(section, design);
  return (
    <section
      className={styles.section}
      data-section-id={section.id}
      data-section-type={section.type}
      data-section-column={section.column}
      data-heading-style={headingStyle}
    >
      <div className={styles.sectionHeading} data-heading-alignment={design.headings.alignment}>
        {design.headings.iconMode !== "none" ? (
          <span className={styles.sectionIcon} data-icon-mode={design.headings.iconMode} aria-hidden="true">
            {design.headings.iconMode === "filled" ? "◆" : "◇"}
          </span>
        ) : null}
        <h2>{section.heading}</h2>
        {headingStyle === "rule" ? <span className={styles.headingRule} aria-hidden="true" /> : null}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function ExperienceSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "experience" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => {
          const employer = <ExternalLink href={entry.employerUrl}>{entry.employer}</ExternalLink>;
          return (
            <Entry key={entry.id}>
              <EntryHeader
                primary={design.entries.experienceTitleFirst ? entry.position : employer}
                secondary={design.entries.experienceTitleFirst ? employer : entry.position}
                metadata={joinMetadata([formatDateRange(entry.dateRange, design), entry.location], design.entries.metadataSeparator)}
                design={design}
              />
              {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
            </Entry>
          );
        })}
      </div>
    </SectionShell>
  );
}

function EducationSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "education" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => {
          const institution = <ExternalLink href={entry.institutionUrl}>{entry.institution}</ExternalLink>;
          return (
            <Entry key={entry.id}>
              <EntryHeader
                primary={design.entries.educationDegreeFirst ? entry.degree : institution}
                secondary={design.entries.educationDegreeFirst ? institution : entry.degree}
                metadata={joinMetadata([formatDateRange(entry.dateRange, design), entry.location], design.entries.metadataSeparator)}
                design={design}
              />
              {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
            </Entry>
          );
        })}
      </div>
    </SectionShell>
  );
}

function SkillsSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "skills" }> }) {
  const display = design.sections[section.id]?.skillDisplay ?? "text";
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.competencies} data-skill-display={display}>
        {section.entries.filter((entry) => entry.visible).map((entry) => {
          const detail = [entry.category, entry.description].filter(Boolean).join(design.entries.metadataSeparator);
          return (
            <div className={styles.competency} key={entry.id}>
              <div className={styles.competencyText}>
                <strong>{entry.name}</strong>
                {detail ? <span>{detail}</span> : null}
              </div>
              {display === "level" && entry.level !== undefined ? (
                <div className={styles.levelWrap} aria-label={`${entry.name}: ${entry.level}%`}>
                  <span className={styles.levelTrack} aria-hidden="true">
                    <span className={styles.levelFill} style={{ width: `${entry.level}%` }} />
                  </span>
                  <span className={styles.levelValue}>{entry.level}%</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function LanguagesSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "languages" }> }) {
  const display = design.sections[section.id]?.skillDisplay ?? "text";
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.competencies} data-skill-display={display}>
        {section.entries.filter((entry) => entry.visible).map((entry) => {
          const detail = [entry.proficiency, entry.detail].filter(Boolean).join(design.entries.metadataSeparator);
          return (
            <div className={styles.competency} key={entry.id}>
              <div className={styles.competencyText}>
                <strong>{entry.name}</strong>
                {detail ? <span>{detail}</span> : null}
              </div>
              {display === "level" && entry.level !== undefined ? (
                <div className={styles.levelWrap} aria-label={`${entry.name}: ${entry.level}%`}>
                  <span className={styles.levelTrack} aria-hidden="true">
                    <span className={styles.levelFill} style={{ width: `${entry.level}%` }} />
                  </span>
                  <span className={styles.levelValue}>{entry.level}%</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function ProjectsSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "projects" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.title}</ExternalLink>}
              secondary={entry.subtitle}
              metadata={formatDateRange(entry.dateRange, design)}
              design={design}
            />
            {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function CertificatesSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "certificates" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.compactEntries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.title}</ExternalLink>}
              secondary={entry.issuer}
              metadata={formatResumeDate(entry.date, design)}
              design={design}
            />
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function CoursesSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "courses" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.title}</ExternalLink>}
              secondary={entry.provider}
              metadata={formatDateRange(entry.dateRange, design)}
              design={design}
            />
            {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function AwardsSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "awards" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.title}</ExternalLink>}
              secondary={entry.issuer}
              metadata={formatResumeDate(entry.date, design)}
              design={design}
            />
            {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function OrganisationsSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "organisations" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.name}</ExternalLink>}
              secondary={entry.role}
              metadata={joinMetadata([formatDateRange(entry.dateRange, design), entry.location], design.entries.metadataSeparator)}
              design={design}
            />
            {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function PublicationsSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "publications" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.title}</ExternalLink>}
              secondary={entry.publisher}
              metadata={formatResumeDate(entry.date, design)}
              design={design}
            />
            {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function InterestsSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "interests" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <ul className={styles.interests}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <li key={entry.id}>
            <ExternalLink href={entry.url}><strong>{entry.name}</strong></ExternalLink>
            {entry.description ? <span>{entry.description}</span> : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function ReferencesSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "references" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.referenceGrid}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={entry.name}
              secondary={joinMetadata([entry.jobTitle, entry.organisation], design.entries.metadataSeparator)}
              design={design}
            />
            <div className={styles.referenceContacts}>
              {entry.email ? <a href={`mailto:${entry.email}`}>{entry.email}</a> : null}
              {entry.phone ? <a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}>{entry.phone}</a> : null}
              {entry.note ? <span>{entry.note}</span> : null}
            </div>
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function CustomSection({ section, design }: SectionRendererProps & { section: Extract<ResumeSection, { type: "custom" }> }) {
  return (
    <SectionShell section={section} design={design}>
      <div className={styles.entries}>
        {section.entries.filter((entry) => entry.visible).map((entry) => (
          <Entry key={entry.id}>
            <EntryHeader
              primary={<ExternalLink href={entry.url}>{entry.title}</ExternalLink>}
              secondary={entry.subtitle}
              metadata={joinMetadata([formatDateRange(entry.dateRange, design), entry.location], design.entries.metadataSeparator)}
              design={design}
            />
            {entry.description.length ? <Description><RichTextContent value={entry.description} /></Description> : null}
          </Entry>
        ))}
      </div>
    </SectionShell>
  );
}

function DeclarationSection({ section, design, assetUrls }: SectionRendererProps & { section: Extract<ResumeSection, { type: "declaration" }> }) {
  const signatureUrl = section.signatureStoragePath ? assetUrls?.[section.signatureStoragePath] : undefined;
  return (
    <SectionShell section={section} design={design}>
      <RichTextContent value={section.text} />
      {(section.place || section.date) ? (
        <p className={styles.declarationMeta}>
          {joinMetadata([section.place, formatResumeDate(section.date, design)], design.entries.metadataSeparator)}
        </p>
      ) : null}
      {signatureUrl ? <Image className={styles.signature} src={signatureUrl} alt="Signature" width={144} height={64} unoptimized /> : null}
    </SectionShell>
  );
}

export function SectionRenderer({ section, design, assetUrls }: SectionRendererProps) {
  switch (section.type) {
    case "summary":
      return <SectionShell section={section} design={design}><RichTextContent value={section.content} /></SectionShell>;
    case "experience":
      return <ExperienceSection section={section} design={design} />;
    case "education":
      return <EducationSection section={section} design={design} />;
    case "skills":
      return <SkillsSection section={section} design={design} />;
    case "languages":
      return <LanguagesSection section={section} design={design} />;
    case "projects":
      return <ProjectsSection section={section} design={design} />;
    case "certificates":
      return <CertificatesSection section={section} design={design} />;
    case "courses":
      return <CoursesSection section={section} design={design} />;
    case "awards":
      return <AwardsSection section={section} design={design} />;
    case "organisations":
      return <OrganisationsSection section={section} design={design} />;
    case "publications":
      return <PublicationsSection section={section} design={design} />;
    case "interests":
      return <InterestsSection section={section} design={design} />;
    case "references":
      return <ReferencesSection section={section} design={design} />;
    case "declaration":
      return <DeclarationSection section={section} design={design} assetUrls={assetUrls} />;
    case "custom":
      return <CustomSection section={section} design={design} />;
  }
}

export function sectionTypeLabel(type: SectionType): string {
  return type.replace(/(^|-)(\w)/g, (_, separator: string, character: string) => `${separator ? " " : ""}${character.toUpperCase()}`);
}
