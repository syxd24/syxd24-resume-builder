"use client";

import { useId, useState } from "react";
import Image from "next/image";

import type { ResumeDesign, SectionType } from "@/domain/resume";

import {
  ColorControl,
  SegmentedControl,
  SelectControl,
  SettingsCard,
  StepperControl,
  SwitchControl,
  TextControl,
  type SelectOption,
} from "./controls";
import styles from "./customize.module.css";

const categories = [
  "document",
  "templates",
  "layout",
  "font-size",
  "spacing",
  "entries",
  "headings",
  "font",
  "colors",
  "header",
  "photo",
  "links",
  "footer",
  "sections",
] as const;

export type CustomizeCategory = (typeof categories)[number];

const categoryLabels: Record<CustomizeCategory, string> = {
  document: "Document",
  templates: "Templates",
  layout: "Layout",
  "font-size": "Font Size",
  spacing: "Spacing",
  entries: "Entries",
  headings: "Headings",
  font: "Font",
  colors: "Colors",
  header: "Header",
  photo: "Photo",
  links: "Links",
  footer: "Footer",
  sections: "Sections",
};

const fonts = [
  "Alegreya",
  "Arial",
  "Georgia",
  "Inter",
  "Source Sans 3",
  "Times New Roman",
] as const;

const accentPresets = ["#244E64", "#6C3FC5", "#9F1239", "#166534", "#1D4ED8", "#171717"] as const;

type SectionChoice = Readonly<{
  id: string;
  label: string;
  type: SectionType;
}>;

export type PhotoAssetState = Readonly<{
  present: boolean;
  previewUrl?: string;
  alt?: string;
}>;

export type CustomizePanelProps = Readonly<{
  design: ResumeDesign;
  onChange: (design: ResumeDesign) => void;
  sections?: readonly SectionChoice[];
  photoAsset?: PhotoAssetState;
  onPhotoUpload?: (file: File) => void | Promise<void>;
  onPhotoRemove?: () => void | Promise<void>;
  initialCategory?: CustomizeCategory;
}>;

type DesignGroup = Exclude<keyof ResumeDesign, "version">;

function replaceGroup<K extends DesignGroup>(
  design: ResumeDesign,
  group: K,
  patch: Partial<ResumeDesign[K]>,
): ResumeDesign {
  return {
    ...design,
    [group]: { ...design[group], ...patch },
  };
}

function formatNumber(value: number, unit: string) {
  return `${value}${unit}`;
}

function DocumentSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  return (
    <SettingsCard title="Document settings" description="Set the locale, date convention, and physical paper size.">
      <SelectControl
        label="Language"
        value={design.document.language}
        options={[
          { value: "en-GB", label: "English (UK)" },
          { value: "de-DE", label: "German" },
          { value: "pl-PL", label: "Polish" },
        ]}
        onChange={(language) => onChange(replaceGroup(design, "document", { language }))}
      />
      <SelectControl
        label="Date format"
        value={design.document.dateFormat}
        options={[
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
          { value: "MMM YYYY", label: "Mon YYYY" },
          { value: "MM/YYYY", label: "MM/YYYY" },
        ]}
        onChange={(dateFormat) => onChange(replaceGroup(design, "document", { dateFormat }))}
      />
      <SegmentedControl
        label="Page format"
        value={design.document.pageFormat}
        options={[
          { value: "A4", label: "A4" },
          { value: "Letter", label: "US Letter" },
        ]}
        onChange={(pageFormat) => onChange(replaceGroup(design, "document", { pageFormat }))}
      />
    </SettingsCard>
  );
}

function TemplateSettings() {
  return (
    <SettingsCard title="Design template" description="One carefully tuned template keeps preview and PDF output consistent.">
      <div className={styles.lockedTemplate}>
        <div className={styles.templateMark} aria-hidden="true">
          CV
        </div>
        <div>
          <p className={styles.lockedTitle}>Clarity</p>
          <p className={styles.lockedCopy}>Built-in template · ready to customize</p>
        </div>
      </div>
    </SettingsCard>
  );
}

function LayoutSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const usesColumns = design.layout.mode !== "one-column";
  return (
    <SettingsCard title="Layout" description="Choose the page structure and balance the content columns.">
      <SegmentedControl
        label="Page layout"
        value={design.layout.mode}
        options={[
          { value: "one-column", label: "One column" },
          { value: "two-column", label: "Two columns" },
          { value: "mixed", label: "Mixed" },
        ]}
        onChange={(mode) => onChange(replaceGroup(design, "layout", { mode }))}
      />
      {usesColumns ? (
        <>
          <StepperControl
            label="Secondary column width"
            value={design.layout.secondaryWidthPct}
            min={25}
            max={45}
            step={1}
            formatValue={(value) => formatNumber(value, "%")}
            onChange={(secondaryWidthPct) => onChange(replaceGroup(design, "layout", { secondaryWidthPct }))}
          />
          <StepperControl
            label="Column gap"
            value={design.layout.columnGapMm}
            min={2}
            max={15}
            step={0.5}
            formatValue={(value) => formatNumber(value, " mm")}
            onChange={(columnGapMm) => onChange(replaceGroup(design, "layout", { columnGapMm }))}
          />
        </>
      ) : null}
    </SettingsCard>
  );
}

function FontSizeSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["typography"]>) => onChange(replaceGroup(design, "typography", patch));
  return (
    <SettingsCard title="Font size" description="Use the stepped controls to keep type within print-safe limits.">
      <StepperControl label="Base font size" value={design.typography.baseSizePt} min={7} max={14} step={0.5} formatValue={(value) => formatNumber(value, " pt")} onChange={(baseSizePt) => update({ baseSizePt })} />
      <StepperControl label="Full name" value={design.typography.nameOffsetPt} min={4} max={20} step={0.5} formatValue={(value) => `+${value} pt`} onChange={(nameOffsetPt) => update({ nameOffsetPt })} />
      <StepperControl label="Section headings" value={design.typography.sectionHeadingOffsetPt} min={0} max={8} step={0.5} formatValue={(value) => `+${value} pt`} onChange={(sectionHeadingOffsetPt) => update({ sectionHeadingOffsetPt })} />
      <StepperControl label="Entry header" value={design.typography.entryHeaderOffsetPt} min={-2} max={5} step={0.5} formatValue={(value) => `${value >= 0 ? "+" : ""}${value} pt`} onChange={(entryHeaderOffsetPt) => update({ entryHeaderOffsetPt })} />
    </SettingsCard>
  );
}

function SpacingSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const updateSpacing = (patch: Partial<ResumeDesign["spacing"]>) => onChange(replaceGroup(design, "spacing", patch));
  return (
    <SettingsCard title="Spacing" description="Tune page density without shrinking text below readable sizes.">
      <StepperControl label="Line height" value={design.typography.lineHeight} min={1} max={1.8} step={0.05} onChange={(lineHeight) => onChange(replaceGroup(design, "typography", { lineHeight }))} />
      <div className={styles.subsection}>
        <h3>Page margins</h3>
        <StepperControl label="Top margin" value={design.spacing.marginTopMm} min={5} max={30} step={1} formatValue={(value) => formatNumber(value, " mm")} onChange={(marginTopMm) => updateSpacing({ marginTopMm })} />
        <StepperControl label="Right margin" value={design.spacing.marginRightMm} min={5} max={30} step={1} formatValue={(value) => formatNumber(value, " mm")} onChange={(marginRightMm) => updateSpacing({ marginRightMm })} />
        <StepperControl label="Bottom margin" value={design.spacing.marginBottomMm} min={5} max={30} step={1} formatValue={(value) => formatNumber(value, " mm")} onChange={(marginBottomMm) => updateSpacing({ marginBottomMm })} />
        <StepperControl label="Left margin" value={design.spacing.marginLeftMm} min={5} max={30} step={1} formatValue={(value) => formatNumber(value, " mm")} onChange={(marginLeftMm) => updateSpacing({ marginLeftMm })} />
      </div>
      <StepperControl label="Header gap" value={design.spacing.headerGapMm} min={0} max={15} step={0.5} formatValue={(value) => formatNumber(value, " mm")} onChange={(headerGapMm) => updateSpacing({ headerGapMm })} />
      <StepperControl label="Section gap" value={design.spacing.sectionGapMm} min={0} max={15} step={0.5} formatValue={(value) => formatNumber(value, " mm")} onChange={(sectionGapMm) => updateSpacing({ sectionGapMm })} />
      <StepperControl label="Heading to content gap" value={design.spacing.headingGapMm} min={0} max={10} step={0.5} formatValue={(value) => formatNumber(value, " mm")} onChange={(headingGapMm) => updateSpacing({ headingGapMm })} />
      <StepperControl label="Paragraph and list gap" value={design.spacing.paragraphGapMm} min={0} max={8} step={0.5} formatValue={(value) => formatNumber(value, " mm")} onChange={(paragraphGapMm) => updateSpacing({ paragraphGapMm })} />
    </SettingsCard>
  );
}

function EntrySettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["entries"]>) => onChange(replaceGroup(design, "entries", patch));
  return (
    <SettingsCard title="Entries" description="Set a consistent hierarchy for roles, schools, metadata, and descriptions.">
      <SwitchControl label="Experience title before employer" checked={design.entries.experienceTitleFirst} onChange={(experienceTitleFirst) => update({ experienceTitleFirst })} />
      <SwitchControl label="Education degree before institution" checked={design.entries.educationDegreeFirst} onChange={(educationDegreeFirst) => update({ educationDegreeFirst })} />
      <SegmentedControl
        label="Date and location alignment"
        value={design.entries.metadataAlign}
        options={[
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
          { value: "inline", label: "Inline" },
        ]}
        onChange={(metadataAlign) => update({ metadataAlign })}
      />
      <TextControl label="Metadata separator" value={design.entries.metadataSeparator} maxLength={10} hint="Used between compact date and location details." onChange={(metadataSeparator) => update({ metadataSeparator })} />
      <SwitchControl label="Indent descriptions" checked={design.entries.descriptionIndent} onChange={(descriptionIndent) => update({ descriptionIndent })} />
      <StepperControl label="Description indent" value={design.entries.descriptionIndentMm} min={0} max={12} step={0.5} disabled={!design.entries.descriptionIndent} formatValue={(value) => formatNumber(value, " mm")} onChange={(descriptionIndentMm) => update({ descriptionIndentMm })} />
      <StepperControl label="Gap between entries" value={design.spacing.entryGapMm} min={0} max={12} step={0.5} formatValue={(value) => formatNumber(value, " mm")} onChange={(entryGapMm) => onChange(replaceGroup(design, "spacing", { entryGapMm }))} />
    </SettingsCard>
  );
}

function HeadingSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["headings"]>) => onChange(replaceGroup(design, "headings", patch));
  return (
    <SettingsCard title="Headings" description="Apply one coherent section-heading treatment across the resume.">
      <SegmentedControl label="Heading style" value={design.headings.style} options={[
        { value: "simple", label: "Simple" }, { value: "rule", label: "Rule" }, { value: "underline", label: "Underline" }, { value: "boxed", label: "Boxed" },
      ]} onChange={(style) => update({ style })} />
      <SegmentedControl label="Text alignment" value={design.headings.alignment} options={[
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ]} onChange={(alignment) => update({ alignment })} />
      <SegmentedControl label="Section icons" value={design.headings.iconMode} options={[
        { value: "none", label: "None" }, { value: "outline", label: "Outline" }, { value: "filled", label: "Filled" },
      ]} onChange={(iconMode) => update({ iconMode })} />
      <StepperControl label="Rule thickness" value={design.headings.ruleThicknessPt} min={0.25} max={3} step={0.25} formatValue={(value) => formatNumber(value, " pt")} onChange={(ruleThicknessPt) => update({ ruleThicknessPt })} />
    </SettingsCard>
  );
}

function FontSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const bodyOptions: readonly SelectOption<string>[] = fonts.map((font) => ({ value: font, label: font }));
  const nameOptions: readonly SelectOption<string>[] = [{ value: "inherit", label: "Same as body font" }, ...bodyOptions];
  return (
    <SettingsCard title="Font" description="Curated print-safe families keep preview and PDF typography aligned.">
      <SelectControl label="Body font" value={design.typography.bodyFont} options={bodyOptions} onChange={(bodyFont) => onChange(replaceGroup(design, "typography", { bodyFont }))} />
      <SelectControl label="Name font" value={design.typography.nameFont} options={nameOptions} onChange={(nameFont) => onChange(replaceGroup(design, "typography", { nameFont }))} />
    </SettingsCard>
  );
}

function ColorSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["colors"]>) => onChange(replaceGroup(design, "colors", patch));
  const updateTarget = (patch: Partial<ResumeDesign["colors"]["accentTargets"]>) =>
    update({ accentTargets: { ...design.colors.accentTargets, ...patch } });
  return (
    <SettingsCard title="Colors" description="Define semantic colors, then choose where the accent is applied.">
      <ColorControl label="Accent" value={design.colors.accent} presets={accentPresets} onChange={(accent) => update({ accent })} />
      <div className={styles.subsection}>
        <h3>Full page</h3>
        <ColorControl label="Body text" value={design.colors.body} onChange={(body) => update({ body })} />
        <ColorControl label="Secondary text" value={design.colors.secondary} onChange={(secondary) => update({ secondary })} />
        <ColorControl label="Section headings" value={design.colors.heading} onChange={(heading) => update({ heading })} />
        <ColorControl label="Links" value={design.colors.link} onChange={(link) => update({ link })} />
      </div>
      <div className={styles.subsection}>
        <h3>Header and border</h3>
        <ColorControl label="Header background" value={design.colors.headerBackground} onChange={(headerBackground) => update({ headerBackground })} />
        <ColorControl label="Borders and rules" value={design.colors.border} onChange={(border) => update({ border })} />
      </div>
      <div className={styles.subsection}>
        <h3>Apply accent color</h3>
        <SwitchControl label="Name" checked={design.colors.accentTargets.name} onChange={(name) => updateTarget({ name })} />
        <SwitchControl label="Job title" checked={design.colors.accentTargets.jobTitle} onChange={(jobTitle) => updateTarget({ jobTitle })} />
        <SwitchControl label="Section headings" checked={design.colors.accentTargets.headings} onChange={(headings) => updateTarget({ headings })} />
        <SwitchControl label="Icons and markers" checked={design.colors.accentTargets.icons} onChange={(icons) => updateTarget({ icons })} />
        <SwitchControl label="Links" checked={design.colors.accentTargets.links} onChange={(links) => updateTarget({ links })} />
        <SwitchControl label="Skill indicators" checked={design.colors.accentTargets.skillIndicators} onChange={(skillIndicators) => updateTarget({ skillIndicators })} />
        <SwitchControl label="Decorative rules" checked={design.colors.accentTargets.rules} onChange={(rules) => updateTarget({ rules })} />
      </div>
    </SettingsCard>
  );
}

function HeaderSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["header"]>) => onChange(replaceGroup(design, "header", patch));
  return (
    <SettingsCard title="Header" description="Arrange the name, title, and contact details at the top of each resume.">
      <SegmentedControl label="Text alignment" value={design.header.alignment} options={[
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ]} onChange={(alignment) => update({ alignment })} />
      <SegmentedControl label="Details arrangement" value={design.header.detailsArrangement} options={[
        { value: "inline-wrap", label: "Inline" }, { value: "stacked", label: "Stacked" }, { value: "split", label: "Split" },
      ]} onChange={(detailsArrangement) => update({ detailsArrangement })} />
      <SegmentedControl label="Line style" value={design.header.lineStyle} options={[
        { value: "none", label: "None" }, { value: "full", label: "Full" }, { value: "short", label: "Short" }, { value: "accent", label: "Accent" },
      ]} onChange={(lineStyle) => update({ lineStyle })} />
      <SwitchControl label="Show contact icons" checked={design.header.showIcons} onChange={(showIcons) => update({ showIcons })} />
      <SwitchControl label="Place name before job title" checked={design.header.nameFirst} onChange={(nameFirst) => update({ nameFirst })} />
    </SettingsCard>
  );
}

function PhotoSettings({ design, onChange, photoAsset, onPhotoUpload, onPhotoRemove }: Pick<CustomizePanelProps, "design" | "onChange" | "photoAsset" | "onPhotoUpload" | "onPhotoRemove">) {
  const inputId = useId();
  const update = (patch: Partial<ResumeDesign["photo"]>) => onChange(replaceGroup(design, "photo", patch));
  const hasAsset = photoAsset?.present ?? false;

  return (
    <SettingsCard title="Photo" description="The original image stays unchanged; crop and presentation settings are non-destructive.">
      {photoAsset?.previewUrl ? <Image className={styles.photoPreview} src={photoAsset.previewUrl} alt={photoAsset.alt || "Current profile photo"} width={80} height={80} unoptimized /> : null}
      {onPhotoUpload || (hasAsset && onPhotoRemove) ? (
        <div className={styles.photoActions}>
          {onPhotoUpload ? (
            <>
              <label className={styles.fileLabel} htmlFor={inputId}>{hasAsset ? "Replace photo" : "Upload photo"}</label>
              <input id={inputId} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onPhotoUpload(file);
                event.currentTarget.value = "";
              }} />
            </>
          ) : null}
          {hasAsset && onPhotoRemove ? <button type="button" className={styles.secondaryButton} onClick={() => void onPhotoRemove()}>Remove photo</button> : null}
        </div>
      ) : null}
      <SwitchControl label="Show photo" checked={design.photo.visible} hint={hasAsset ? undefined : "Upload a photo in Personal Details before enabling it in the preview."} onChange={(visible) => update({ visible })} />
      <SegmentedControl label="Shape" value={design.photo.shape} options={[
        { value: "circle", label: "Circle" }, { value: "square", label: "Square" }, { value: "rounded", label: "Rounded" },
      ]} onChange={(shape) => update({ shape })} />
      <SegmentedControl label="Placement" value={design.photo.placement} options={[
        { value: "left", label: "Left" }, { value: "right", label: "Right" }, { value: "above", label: "Above" },
      ]} onChange={(placement) => update({ placement })} />
      <StepperControl label="Photo size" value={design.photo.sizeMm} min={12} max={50} step={1} formatValue={(value) => formatNumber(value, " mm")} onChange={(sizeMm) => update({ sizeMm })} />
      <SwitchControl label="Grayscale" checked={design.photo.grayscale} onChange={(grayscale) => update({ grayscale })} />
      <StepperControl label="Zoom" value={design.photo.zoom} min={1} max={4} step={0.1} formatValue={(value) => `${value.toFixed(1)}×`} onChange={(zoom) => update({ zoom })} />
      <StepperControl label="Horizontal crop position" value={design.photo.x} min={0} max={1} step={0.05} formatValue={(value) => `${Math.round(value * 100)}%`} onChange={(x) => update({ x })} />
      <StepperControl label="Vertical crop position" value={design.photo.y} min={0} max={1} step={0.05} formatValue={(value) => `${Math.round(value * 100)}%`} onChange={(y) => update({ y })} />
    </SettingsCard>
  );
}

function LinkSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["links"]>) => onChange(replaceGroup(design, "links", patch));
  return (
    <SettingsCard title="Link styling" description="These styles apply to contact links and URLs and remain clickable in PDF output.">
      <SwitchControl label="Underline links" checked={design.links.underline} onChange={(underline) => update({ underline })} />
      <SegmentedControl label="Link color" value={design.links.colorMode} options={[
        { value: "inherit", label: "Inherit" }, { value: "accent", label: "Accent" }, { value: "standard", label: "Blue" },
      ]} onChange={(colorMode) => update({ colorMode })} />
      <SwitchControl label="Show URL and contact icons" checked={design.links.showIcons} onChange={(showIcons) => update({ showIcons })} />
    </SettingsCard>
  );
}

function FooterSettings({ design, onChange }: Pick<CustomizePanelProps, "design" | "onChange">) {
  const update = (patch: Partial<ResumeDesign["footer"]>) => onChange(replaceGroup(design, "footer", patch));
  return (
    <SettingsCard title="Footer" description="Optional footer details are kept clear of the printable body area.">
      <SwitchControl label="Page numbers" checked={design.footer.pageNumbers} onChange={(pageNumbers) => update({ pageNumbers })} />
      <SwitchControl label="Name" checked={design.footer.showName} onChange={(showName) => update({ showName })} />
      <SwitchControl label="Email" checked={design.footer.showEmail} onChange={(showEmail) => update({ showEmail })} />
      <SegmentedControl label="Footer alignment" value={design.footer.alignment} options={[
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ]} onChange={(alignment) => update({ alignment })} />
      <StepperControl label="Footer spacing" value={design.footer.gapMm} min={2} max={15} step={0.5} formatValue={(value) => formatNumber(value, " mm")} onChange={(gapMm) => update({ gapMm })} />
    </SettingsCard>
  );
}

function SectionSettings({ design, onChange, sections = [] }: Pick<CustomizePanelProps, "design" | "onChange" | "sections">) {
  const updateSection = (sectionId: string, patch: Partial<ResumeDesign["sections"][string]>) => {
    const current = design.sections[sectionId] ?? { headingStyle: "inherit" as const, skillDisplay: "text" as const };
    onChange(replaceGroup(design, "sections", { [sectionId]: { ...current, ...patch } }));
  };

  return (
    <SettingsCard title="Section customizations" description="Override presentation only where a section needs different emphasis.">
      {sections.length ? sections.map((section) => {
        const override = design.sections[section.id] ?? { headingStyle: "inherit" as const, skillDisplay: "text" as const };
        return (
          <div className={styles.sectionCustomization} key={section.id}>
            <h3>{section.label}</h3>
            <SelectControl label={`${section.label} heading style`} value={override.headingStyle} options={[
              { value: "inherit", label: "Use global style" }, { value: "simple", label: "Simple" }, { value: "rule", label: "Rule" }, { value: "underline", label: "Underline" }, { value: "boxed", label: "Boxed" },
            ]} onChange={(headingStyle) => updateSection(section.id, { headingStyle })} />
            {section.type === "skills" ? <SelectControl label="Skill presentation" value={override.skillDisplay} options={[
              { value: "text", label: "Text" }, { value: "list", label: "List" }, { value: "level", label: "Level indicators" },
            ]} onChange={(skillDisplay) => updateSection(section.id, { skillDisplay })} /> : null}
          </div>
        );
      }) : <p className={styles.lockedCopy}>Add sections in Content to configure their presentation here.</p>}
      <p className={styles.fieldHint}>Rename, visibility, order, and column placement are content structure settings and remain editable in Content.</p>
    </SettingsCard>
  );
}

function CategoryContent(props: CustomizePanelProps & { category: CustomizeCategory }) {
  switch (props.category) {
    case "document": return <DocumentSettings {...props} />;
    case "templates": return <TemplateSettings />;
    case "layout": return <LayoutSettings {...props} />;
    case "font-size": return <FontSizeSettings {...props} />;
    case "spacing": return <SpacingSettings {...props} />;
    case "entries": return <EntrySettings {...props} />;
    case "headings": return <HeadingSettings {...props} />;
    case "font": return <FontSettings {...props} />;
    case "colors": return <ColorSettings {...props} />;
    case "header": return <HeaderSettings {...props} />;
    case "photo": return <PhotoSettings {...props} />;
    case "links": return <LinkSettings {...props} />;
    case "footer": return <FooterSettings {...props} />;
    case "sections": return <SectionSettings {...props} />;
  }
}

export function CustomizePanel(props: CustomizePanelProps) {
  const [category, setCategory] = useState<CustomizeCategory>(props.initialCategory ?? "document");
  const settingsTitleId = useId();

  return (
    <div className={styles.panel}>
      <nav className={styles.rail} aria-label="Customize resume">
        <ul className={styles.railList}>
          {categories.map((item) => (
            <li key={item}>
              <button type="button" className={item === category ? styles.railButtonActive : styles.railButton} aria-current={item === category ? "page" : undefined} onClick={() => setCategory(item)}>
                {categoryLabels[item]}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.settings} aria-labelledby={settingsTitleId}>
        <h1 className={styles.settingsTitle} id={settingsTitleId}>{categoryLabels[category]}</h1>
        <CategoryContent {...props} category={category} />
      </div>
    </div>
  );
}

export default CustomizePanel;
