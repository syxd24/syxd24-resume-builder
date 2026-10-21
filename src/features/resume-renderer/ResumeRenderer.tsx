import type { CSSProperties, ReactNode } from "react";

import type { PersonalDetailKind, ResumeDesign, ResumeDocument, ResumeSection } from "@/domain/resume";

import { emailHref, fontStack, PAGE_DIMENSIONS, phoneHref, safeHref, type PageFormat } from "./format";
import { paginateResume } from "./pagination";
import { SectionRenderer, type ResumeAssetUrls } from "./SectionRenderer";
import styles from "./resume-renderer.module.css";

export type ResumeRenderMode = "editor" | "thumbnail" | "print";

export type ResumeRendererProps = Readonly<{
  document: ResumeDocument;
  design: ResumeDesign;
  pageFormat?: PageFormat;
  mode?: ResumeRenderMode;
  pageLimit?: number;
  assetUrls?: ResumeAssetUrls;
  className?: string;
}>;

type RendererVariables = CSSProperties & Record<`--${string}`, string | number>;

type ContactIconName = "email" | "phone" | "location" | "website" | "linkedin" | "github" | "work" | "identity" | "calendar" | "detail";

function rgbFromHex(color: string): [number, number, number] {
  const value = color.slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
}

function relativeLuminance(color: string): number {
  const channels = rgbFromHex(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function contactIconColor(design: ResumeDesign): string {
  const preferred = design.colors.accentTargets.icons ? design.colors.accent : design.colors.body;
  const candidates = [preferred, design.colors.body, "#171717", "#000000", "#FFFFFF"];
  const strongContrast = candidates.find((candidate) => contrastRatio(candidate, design.colors.headerBackground) >= 7);
  if (strongContrast) return strongContrast;
  return candidates.reduce((best, candidate) => (
    contrastRatio(candidate, design.colors.headerBackground) > contrastRatio(best, design.colors.headerBackground) ? candidate : best
  ), candidates[0]!);
}

function linkColor(design: ResumeDesign): string {
  switch (design.links.colorMode) {
    case "accent": return design.colors.accent;
    case "standard": return "#1756A9";
    case "inherit": return design.colors.link;
  }
}

function rendererVariables(design: ResumeDesign, pageFormat: PageFormat): RendererVariables {
  const dimensions = PAGE_DIMENSIONS[pageFormat];
  return {
    "--resume-page-width": dimensions.cssWidth,
    "--resume-page-height": dimensions.cssHeight,
    "--resume-margin-top": `${design.spacing.marginTopMm}mm`,
    "--resume-margin-right": `${design.spacing.marginRightMm}mm`,
    "--resume-margin-bottom": `${design.spacing.marginBottomMm}mm`,
    "--resume-margin-left": `${design.spacing.marginLeftMm}mm`,
    "--resume-header-gap": `${design.spacing.headerGapMm}mm`,
    "--resume-section-gap": `${design.spacing.sectionGapMm}mm`,
    "--resume-heading-gap": `${design.spacing.headingGapMm}mm`,
    "--resume-entry-gap": `${design.spacing.entryGapMm}mm`,
    "--resume-paragraph-gap": `${design.spacing.paragraphGapMm}mm`,
    "--resume-column-gap": `${design.layout.columnGapMm}mm`,
    "--resume-secondary-width": `${design.layout.secondaryWidthPct}%`,
    "--resume-body-font": fontStack(design.typography.bodyFont),
    "--resume-name-font": design.typography.nameFont === "inherit" ? fontStack(design.typography.bodyFont) : fontStack(design.typography.nameFont),
    "--resume-base-size": `${design.typography.baseSizePt}pt`,
    "--resume-name-size": `${design.typography.baseSizePt + design.typography.nameOffsetPt}pt`,
    "--resume-heading-size": `${design.typography.baseSizePt + design.typography.sectionHeadingOffsetPt}pt`,
    "--resume-entry-size": `${design.typography.baseSizePt + design.typography.entryHeaderOffsetPt}pt`,
    "--resume-line-height": design.typography.lineHeight,
    "--resume-body-color": design.colors.body,
    "--resume-secondary-color": design.colors.secondary,
    "--resume-accent-color": design.colors.accent,
    "--resume-heading-color": design.colors.accentTargets.headings ? design.colors.accent : design.colors.heading,
    "--resume-rule-color": design.colors.accentTargets.rules ? design.colors.accent : design.colors.border,
    "--resume-header-background": design.colors.headerBackground,
    "--resume-link-color": linkColor(design),
    "--resume-icon-color": contactIconColor(design),
    "--resume-rule-thickness": `${design.headings.ruleThicknessPt}pt`,
    "--resume-description-indent": design.entries.descriptionIndent ? `${design.entries.descriptionIndentMm}mm` : "0mm",
    "--resume-footer-gap": `${design.footer.gapMm}mm`,
    "--resume-photo-size": `${design.photo.sizeMm}mm`,
    "--resume-photo-x": `${design.photo.x * 100}%`,
    "--resume-photo-y": `${design.photo.y * 100}%`,
    "--resume-photo-zoom": design.photo.zoom,
  };
}

function ContactIcon({ name }: { name: ContactIconName }) {
  const paths: Record<ContactIconName, ReactNode> = {
    email: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m4 6 8 6 8-6" /></>,
    phone: <path d="M7.1 3.5 9.5 7.7 7.8 9.4a15.2 15.2 0 0 0 6.8 6.8l1.7-1.7 4.2 2.4-.8 3.1a2 2 0 0 1-2.1 1.5C9.5 20.8 3.2 14.5 2.5 6.4A2 2 0 0 1 4 4.3Z" />,
    location: <><path d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    website: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" /></>,
    linkedin: <><rect x="3" y="3" width="18" height="18" rx="1.5" /><path d="M8 10v7M8 7.2v.1M11.5 17v-4a3 3 0 0 1 6 0v4M11.5 10v7" /></>,
    github: <path className={styles.filledIcon} d="M12 2.6a9.6 9.6 0 0 0-3 18.7c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5.1 0-1.1.4-2 1-2.8-.1-.3-.4-1.3.1-2.8 0 0 .8-.3 2.9 1.1a9.8 9.8 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.5 1.5.2 2.5.1 2.8.6.8 1 1.7 1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.7 1 .7 1.9v2.7c0 .4.2.6.7.5A9.6 9.6 0 0 0 12 2.6Z" />,
    work: <><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" /></>,
    identity: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><circle cx="8" cy="11" r="2" /><path d="M5.5 16c.6-1.7 1.4-2.5 2.5-2.5s1.9.8 2.5 2.5M13 10h5M13 14h5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M7 3v4M17 3v4M3 9h18" /></>,
    detail: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  };

  return (
    <svg className={styles.contactIcon} data-contact-icon={name} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

function ContactItem({ icon, kind, href, children }: { icon?: ContactIconName; kind: string; href?: string; children: ReactNode }) {
  const safeUrl = safeHref(href);
  const content = <>{icon ? <ContactIcon name={icon} /> : null}<span className={styles.contactText}>{children}</span></>;
  return safeUrl
    ? <a className={styles.contactItem} data-contact-kind={kind} href={safeUrl} rel="noreferrer">{content}</a>
    : <span className={styles.contactItem} data-contact-kind={kind}>{content}</span>;
}

function iconForLink(label: string, url: string): ContactIconName {
  const descriptor = `${label} ${url}`.toLowerCase();
  if (descriptor.includes("linkedin.com") || descriptor.includes("linkedin")) return "linkedin";
  if (descriptor.includes("github.com") || descriptor.includes("github")) return "github";
  return "website";
}

function iconForDetail(kind: PersonalDetailKind): ContactIconName {
  switch (kind) {
    case "visa-status":
    case "work-authorization": return "work";
    case "nationality": return "identity";
    case "date-of-birth": return "calendar";
    case "additional":
    case "custom": return "detail";
  }
}

function Header({ document, design, assetUrls }: Pick<ResumeRendererProps, "document" | "design" | "assetUrls">) {
  const personal = document.personal;
  const photoUrl = personal.photo?.storagePath ? assetUrls?.[personal.photo.storagePath] : undefined;
  const icon = (value: ContactIconName) => design.header.showIcons && design.links.showIcons ? value : undefined;
  const contacts: ReactNode[] = [];

  if (personal.email) contacts.push(<ContactItem key="email" kind="email" icon={icon("email")} href={emailHref(personal.email)}>{personal.email}</ContactItem>);
  if (personal.phone) contacts.push(<ContactItem key="phone" kind="phone" icon={icon("phone")} href={phoneHref(personal.phone)}>{personal.phone}</ContactItem>);
  if (personal.location) contacts.push(<ContactItem key="location" kind="location" icon={icon("location")}>{personal.location}</ContactItem>);
  if (personal.address && personal.address !== personal.location) contacts.push(<ContactItem key="address" kind="address" icon={icon("location")}>{personal.address}</ContactItem>);
  if (personal.website) contacts.push(<ContactItem key="website" kind="website" icon={icon("website")} href={personal.website}>{personal.website.replace(/^https?:\/\//, "")}</ContactItem>);
  for (const link of personal.links.filter((item) => item.visible && item.url)) {
    const linkIcon = iconForLink(link.label, link.url);
    contacts.push(<ContactItem key={link.id} kind={linkIcon} icon={icon(linkIcon)} href={link.url}>{link.label || link.url}</ContactItem>);
  }
  for (const detail of personal.details.filter((item) => item.visible && item.value.trim())) {
    const label = detail.label.trim();
    contacts.push(
      <ContactItem key={detail.id} kind={`detail-${detail.kind}`} icon={icon(iconForDetail(detail.kind))}>
        {label ? <><strong className={styles.contactLabel}>{label}:</strong>{" "}</> : null}{detail.value.trim()}
      </ContactItem>,
    );
  }

  const photo = design.photo.visible && photoUrl ? (
    <div className={styles.photoFrame} data-photo-shape={design.photo.shape}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} alt={personal.photo?.alt || `${personal.fullName || "Resume"} profile`} />
    </div>
  ) : null;

  const text = (
    <div className={styles.headerText}>
      {design.header.nameFirst ? <h1>{personal.fullName || "Your Name"}</h1> : null}
      {personal.jobTitle ? <p className={styles.jobTitle}>{personal.jobTitle}</p> : null}
      {!design.header.nameFirst ? <h1>{personal.fullName || "Your Name"}</h1> : null}
      {contacts.length ? <div className={styles.contacts} data-arrangement={design.header.detailsArrangement}>{contacts}</div> : null}
    </div>
  );

  return (
    <header className={styles.header} data-alignment={design.header.alignment} data-photo-placement={design.photo.placement}>
      {photo && design.photo.placement !== "right" ? photo : null}
      {text}
      {photo && design.photo.placement === "right" ? photo : null}
      {design.header.lineStyle !== "none" ? <div className={styles.headerLine} data-line-style={design.header.lineStyle} aria-hidden="true" /> : null}
    </header>
  );
}

function Footer({ document, design, pageNumber }: Pick<ResumeRendererProps, "document" | "design"> & { pageNumber: number }) {
  if (!design.footer.pageNumbers && !design.footer.showName && !design.footer.showEmail) return null;
  return (
    <footer className={styles.footer} data-alignment={design.footer.alignment}>
      {design.footer.showName && document.personal.fullName ? <span>{document.personal.fullName}</span> : null}
      {design.footer.showEmail && document.personal.email ? <a href={emailHref(document.personal.email)}>{document.personal.email}</a> : null}
      {design.footer.pageNumbers ? <span>Page {pageNumber}</span> : null}
    </footer>
  );
}

function SectionLayout({ sections, design, assetUrls }: { sections: ResumeSection[]; design: ResumeDesign; assetUrls?: ResumeAssetUrls }) {
  if (design.layout.mode === "one-column") {
    return <main className={styles.singleColumn}>{sections.map((section, index) => <SectionRenderer key={`${section.id}-${index}`} section={section} design={design} assetUrls={assetUrls} />)}</main>;
  }

  const full = sections.filter((section) => section.column === "full");
  const primary = sections.filter((section) => section.column === "primary" || (section.column === "full" && false));
  const secondary = sections.filter((section) => section.column === "secondary");
  return (
    <main className={styles.columnLayout} data-layout-mode={design.layout.mode}>
      {full.length ? <div className={styles.fullColumn}>{full.map((section, index) => <SectionRenderer key={`${section.id}-${index}`} section={section} design={design} assetUrls={assetUrls} />)}</div> : null}
      <div className={styles.primaryColumn}>{primary.map((section, index) => <SectionRenderer key={`${section.id}-${index}`} section={section} design={design} assetUrls={assetUrls} />)}</div>
      <aside className={styles.secondaryColumn}>{secondary.map((section, index) => <SectionRenderer key={`${section.id}-${index}`} section={section} design={design} assetUrls={assetUrls} />)}</aside>
    </main>
  );
}

export function ResumeRenderer({ document, design, pageFormat, mode = "editor", pageLimit, assetUrls, className }: ResumeRendererProps) {
  const format = pageFormat ?? design.document.pageFormat;
  const sections = document.sections.filter((section) => section.visible);
  const pages = paginateResume({ ...document, sections }, design, format);
  const visiblePages = pageLimit === undefined ? pages : pages.slice(0, Math.max(0, pageLimit));
  return (
    <div
      className={`${styles.renderer} ${className ?? ""}`}
      data-render-mode={mode}
      data-page-format={format}
      data-link-underline={design.links.underline ? "true" : "false"}
      data-accent-name={design.colors.accentTargets.name ? "true" : "false"}
      data-accent-job-title={design.colors.accentTargets.jobTitle ? "true" : "false"}
      data-photo-grayscale={design.photo.grayscale ? "true" : "false"}
      style={rendererVariables(design, format)}
    >
      {mode === "print" ? <style>{`@page { size: ${format === "A4" ? "A4" : "Letter"}; margin: 0; }`}</style> : null}
      {visiblePages.map((page) => (
        <article className={styles.page} data-resume-page={page.number} key={page.number}>
          {page.showHeader ? <Header document={document} design={design} assetUrls={assetUrls} /> : null}
          <SectionLayout sections={page.sections} design={design} assetUrls={assetUrls} />
          <Footer document={document} design={design} pageNumber={page.number} />
        </article>
      ))}
    </div>
  );
}

export default ResumeRenderer;
