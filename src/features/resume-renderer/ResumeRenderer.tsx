import type { CSSProperties, ReactNode } from "react";

import type { ResumeDesign, ResumeDocument, ResumeSection } from "@/domain/resume";

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
  assetUrls?: ResumeAssetUrls;
  className?: string;
}>;

type RendererVariables = CSSProperties & Record<`--${string}`, string | number>;

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
    "--resume-rule-thickness": `${design.headings.ruleThicknessPt}pt`,
    "--resume-description-indent": design.entries.descriptionIndent ? `${design.entries.descriptionIndentMm}mm` : "0mm",
    "--resume-footer-gap": `${design.footer.gapMm}mm`,
    "--resume-photo-size": `${design.photo.sizeMm}mm`,
    "--resume-photo-x": `${design.photo.x * 100}%`,
    "--resume-photo-y": `${design.photo.y * 100}%`,
    "--resume-photo-zoom": design.photo.zoom,
  };
}

function ContactItem({ icon, href, children }: { icon: string; href?: string; children: ReactNode }) {
  const safeUrl = safeHref(href);
  const content = <>{icon ? <span className={styles.contactIcon} aria-hidden="true">{icon}</span> : null}<span>{children}</span></>;
  return safeUrl ? <a href={safeUrl} rel="noreferrer">{content}</a> : <span>{content}</span>;
}

function Header({ document, design, assetUrls }: Pick<ResumeRendererProps, "document" | "design" | "assetUrls">) {
  const personal = document.personal;
  const photoUrl = personal.photo?.storagePath ? assetUrls?.[personal.photo.storagePath] : undefined;
  const icon = (value: string) => design.header.showIcons && design.links.showIcons ? value : "";
  const contacts: ReactNode[] = [];

  if (personal.email) contacts.push(<ContactItem key="email" icon={icon("@") } href={emailHref(personal.email)}>{personal.email}</ContactItem>);
  if (personal.phone) contacts.push(<ContactItem key="phone" icon={icon("☎") } href={phoneHref(personal.phone)}>{personal.phone}</ContactItem>);
  if (personal.location || personal.address) contacts.push(<ContactItem key="location" icon={icon("⌖")}>{personal.location || personal.address}</ContactItem>);
  if (personal.website) contacts.push(<ContactItem key="website" icon={icon("↗") } href={personal.website}>{personal.website.replace(/^https?:\/\//, "")}</ContactItem>);
  for (const link of personal.links.filter((item) => item.visible && item.url)) {
    contacts.push(<ContactItem key={link.id} icon={icon("↗") } href={link.url}>{link.label || link.url}</ContactItem>);
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

export function ResumeRenderer({ document, design, pageFormat, mode = "editor", assetUrls, className }: ResumeRendererProps) {
  const format = pageFormat ?? design.document.pageFormat;
  const sections = document.sections.filter((section) => section.visible);
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
      {paginateResume({ ...document, sections }, design, format).map((page) => (
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
