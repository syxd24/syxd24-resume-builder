import type { ResumeDesign, ResumeDocument, ResumeSection, RichText } from "@/domain/resume";

import { formatDateRange, formatResumeDate, PAGE_DIMENSIONS, type PageFormat } from "./format";

export type ResumePageModel = Readonly<{
  number: number;
  showHeader: boolean;
  sections: ResumeSection[];
}>;

function textLength(value: RichText): number {
  return value.reduce((total, block) => total + (block.spans?.reduce((sum, span) => sum + span.text.length, 0) ?? block.text.length), 0);
}

function lineHeightMm(design: ResumeDesign): number {
  return design.typography.baseSizePt * 0.3528 * design.typography.lineHeight;
}

function blockText(block: RichText[number]): string {
  return block.spans?.map((span) => span.text).join("") ?? block.text;
}

function wrappedLineCount(text: string, chars: number): number {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / chars)), 0);
}

function charsPerLine(section: ResumeSection, design: ResumeDesign): number {
  const base = Math.max(32, Math.floor(1150 / design.typography.baseSizePt));
  if (design.layout.mode === "one-column" || section.column === "full") return base;
  const width = section.column === "secondary" ? design.layout.secondaryWidthPct : 100 - design.layout.secondaryWidthPct;
  return Math.max(22, Math.floor(base * width / 100));
}

function richTextHeight(value: RichText, chars: number, design: ResumeDesign): number {
  const line = lineHeightMm(design);
  let height = 0;
  let index = 0;
  while (index < value.length) {
    const block = value[index]!;
    if (block.type === "paragraph") {
      height += wrappedLineCount(blockText(block), chars) * line;
      if (index < value.length - 1) height += design.spacing.paragraphGapMm;
      index += 1;
      continue;
    }

    const listType = block.type;
    const listChars = Math.max(8, chars - 4);
    let itemCount = 0;
    while (index < value.length && value[index]!.type === listType) {
      const item = value[index]!;
      if (itemCount) height += 0.2;
      height += wrappedLineCount(blockText(item), listChars) * line;
      itemCount += 1;
      index += 1;
    }
    if (index < value.length) height += design.spacing.paragraphGapMm;
  }
  return height;
}

function entryHeight(section: Exclude<ResumeSection, { type: "summary" | "declaration" }>, index: number, design: ResumeDesign): number {
  const chars = charsPerLine(section, design);
  const line = lineHeightMm(design);
  if (section.type === "skills") {
    const entry = section.entries[index]!;
    const detail = [entry.category, entry.description].filter(Boolean).join(design.entries.metadataSeparator);
    const lines = Math.max(1, Math.ceil(`${entry.name} ${detail}`.length / chars));
    return lines * line + (design.sections[section.id]?.skillDisplay === "level" ? line : 0);
  }
  if (section.type === "languages") {
    const entry = section.entries[index]!;
    const detail = [entry.proficiency, entry.detail].filter(Boolean).join(design.entries.metadataSeparator);
    const columnChars = Math.max(14, Math.floor(chars / 4));
    const lines = Math.max(1, Math.ceil(entry.name.length / columnChars)) + (detail ? Math.max(1, Math.ceil(detail.length / columnChars)) : 0);
    return lines * line + (design.sections[section.id]?.skillDisplay === "level" ? line : 0);
  }
  if (section.type === "interests") {
    const entry = section.entries[index]!;
    return line * Math.max(1, Math.ceil(`${entry.name} ${entry.description ?? ""}`.length / chars));
  }
  if (section.type === "references") {
    const entry = section.entries[index]!;
    const contactLines = [entry.email, entry.phone, entry.note].filter(Boolean).length;
    return line * (2 + contactLines);
  }

  if (section.type === "certificates") {
    const entry = section.entries[index]!;
    const text = [entry.title, entry.issuer, formatResumeDate(entry.date, design)].filter(Boolean).join(" ");
    return line * Math.max(1, Math.ceil(text.length / chars));
  }

  let headerText = "";
  switch (section.type) {
    case "experience": {
      const entry = section.entries[index]!;
      headerText = [entry.position, entry.employer, entry.location, formatDateRange(entry.dateRange, design)].join(" ");
      break;
    }
    case "education": {
      const entry = section.entries[index]!;
      headerText = [entry.degree, entry.institution, entry.location, formatDateRange(entry.dateRange, design)].join(" ");
      break;
    }
    case "projects": {
      const entry = section.entries[index]!;
      headerText = [entry.title, entry.subtitle, formatDateRange(entry.dateRange, design)].join(" ");
      break;
    }
    case "courses": {
      const entry = section.entries[index]!;
      headerText = [entry.title, entry.provider, formatDateRange(entry.dateRange, design)].join(" ");
      break;
    }
    case "awards": {
      const entry = section.entries[index]!;
      headerText = [entry.title, entry.issuer, formatResumeDate(entry.date, design)].filter(Boolean).join(" ");
      break;
    }
    case "organisations": {
      const entry = section.entries[index]!;
      headerText = [entry.name, entry.role, entry.location, formatDateRange(entry.dateRange, design)].join(" ");
      break;
    }
    case "publications": {
      const entry = section.entries[index]!;
      headerText = [entry.title, entry.publisher, formatResumeDate(entry.date, design)].filter(Boolean).join(" ");
      break;
    }
    case "custom": {
      const entry = section.entries[index]!;
      headerText = [entry.title, entry.subtitle, entry.location, formatDateRange(entry.dateRange, design)].join(" ");
      break;
    }
  }
  const entry = section.entries[index]!;
  let height = line * Math.max(1, Math.ceil(headerText.length / chars));
  if ("description" in entry && Array.isArray(entry.description) && entry.description.length) {
    height += 0.65 + richTextHeight(entry.description, chars, design);
  }
  return height;
}

function entrySpacing(section: Exclude<ResumeSection, { type: "summary" | "declaration" }>, design: ResumeDesign): number {
  if (section.type === "certificates") return 0.75;
  if (section.type === "skills" || section.type === "languages" || section.type === "interests") return 1.1;
  return design.spacing.entryGapMm;
}

function entriesHeight(
  section: Exclude<ResumeSection, { type: "summary" | "declaration" }>,
  itemHeights: number[],
  design: ResumeDesign,
): number {
  const line = lineHeightMm(design);
  if (section.type === "skills" && (design.sections[section.id]?.skillDisplay ?? "text") === "text") {
    const entries = section.entries;
    const allPlain = entries.every((entry) => !entry.category && !entry.description);
    if (allPlain) {
      const length = entries.reduce((total, entry) => total + entry.name.length + 3, 0);
      return Math.max(1, Math.ceil(length / charsPerLine(section, design))) * line;
    }
  }

  if (section.type === "languages" && itemHeights.length) {
    const fullWidth = design.layout.mode === "one-column" || section.column === "full";
    const columns = Math.min(itemHeights.length, fullWidth ? 4 : 2);
    let height = 0;
    for (let index = 0; index < itemHeights.length; index += columns) {
      height += Math.max(...itemHeights.slice(index, index + columns));
      if (index + columns < itemHeights.length) height += 1.5;
    }
    return height;
  }

  return itemHeights.reduce((total, height) => total + height, 0) + entrySpacing(section, design) * Math.max(0, itemHeights.length - 1);
}

function headingHeight(design: ResumeDesign): number {
  return (design.typography.baseSizePt + design.typography.sectionHeadingOffsetPt) * 0.3528 * 1.05 + 0.6 + design.spacing.headingGapMm;
}

function headerHeight(document: ResumeDocument, design: ResumeDesign): number {
  const standardContacts = [document.personal.email, document.personal.phone, document.personal.location, document.personal.website]
    .filter(Boolean).length;
  const address = document.personal.address && document.personal.address !== document.personal.location ? 1 : 0;
  const links = document.personal.links.filter((link) => link.visible && link.url).length;
  const details = document.personal.details.filter((detail) => detail.visible && detail.value.trim()).length;
  const contacts = standardContacts + address + links + details;
  const contactLines = design.header.detailsArrangement === "stacked"
    ? contacts
    : design.header.detailsArrangement === "split"
      ? Math.ceil(contacts / 2)
      : Math.max(contacts ? 1 : 0, Math.ceil(contacts / 6));
  const nameHeight = (design.typography.baseSizePt + design.typography.nameOffsetPt) * 0.3528;
  const photoHeight = design.photo.visible && document.personal.photo ? design.photo.sizeMm : 0;
  return Math.max(nameHeight + (document.personal.jobTitle ? 4.5 : 0) + contactLines * 3.8, photoHeight) + design.spacing.headerGapMm + 2;
}

function pageCapacity(document: ResumeDocument, design: ResumeDesign, format: PageFormat, first: boolean): number {
  const page = PAGE_DIMENSIONS[format];
  const footer = design.footer.pageNumbers || design.footer.showEmail || design.footer.showName ? design.footer.gapMm + 5 : 0;
  return Math.max(40, page.heightMm - design.spacing.marginTopMm - design.spacing.marginBottomMm - footer - (first ? headerHeight(document, design) : 0));
}

function withEntries(section: ResumeSection, entries: unknown[]): ResumeSection {
  return { ...section, entries } as ResumeSection;
}

function withRichText(section: Extract<ResumeSection, { type: "summary" | "declaration" }>, value: RichText): ResumeSection {
  return section.type === "summary" ? { ...section, content: value } : { ...section, text: value };
}

export function paginateResume(document: ResumeDocument, design: ResumeDesign, format: PageFormat): ResumePageModel[] {
  const visible = document.sections.filter((section) => section.visible);
  const pages: ResumeSection[][] = [[]];
  let pageIndex = 0;
  let used = 0;

  const capacity = () => pageCapacity(document, design, format, pageIndex === 0);
  const startPage = () => {
    pages.push([]);
    pageIndex += 1;
    used = 0;
  };
  const addFragment = (section: ResumeSection, height: number) => {
    const spacing = pages[pageIndex]!.length ? design.spacing.sectionGapMm : 0;
    if (pages[pageIndex]!.length && used + spacing + height > capacity()) startPage();
    pages[pageIndex]!.push(section);
    used += (pages[pageIndex]!.length > 1 ? spacing : 0) + height;
  };
  const ensureFragmentFits = (height: number) => {
    const spacing = pages[pageIndex]!.length ? design.spacing.sectionGapMm : 0;
    if (pages[pageIndex]!.length && used + spacing + height > capacity()) startPage();
  };

  for (const section of visible) {
    const heading = headingHeight(design);
    if (section.type === "summary" || section.type === "declaration") {
      const blocks = section.type === "summary" ? section.content : section.text;
      let chunk: RichText = [];
      let chunkHeight = heading;
      for (const block of blocks) {
        const blockHeight = richTextHeight([block], charsPerLine(section, design), design);
        const spacing = pages[pageIndex]!.length ? design.spacing.sectionGapMm : 0;
        if (chunk.length && used + spacing + chunkHeight + blockHeight > capacity()) {
          addFragment(withRichText(section, chunk), chunkHeight);
          chunk = [];
          chunkHeight = heading;
        }
        ensureFragmentFits(chunkHeight + blockHeight);
        chunk.push(block);
        chunkHeight += blockHeight;
      }
      const metadataHeight = section.type === "declaration" && (section.place || section.date || section.signatureStoragePath) ? 12 : 0;
      addFragment(withRichText(section, chunk), chunkHeight + metadataHeight);
      continue;
    }

    const visibleEntries = section.entries.filter((entry) => entry.visible);
    if (!visibleEntries.length) {
      addFragment(section, heading + lineHeightMm(design));
      continue;
    }

    const visibleSection = withEntries(section, visibleEntries);
    const typedVisibleSection = visibleSection as Exclude<ResumeSection, { type: "summary" | "declaration" }>;
    const itemHeights = visibleEntries.map((_, index) => entryHeight(typedVisibleSection, index, design));
    const totalHeight = heading + entriesHeight(typedVisibleSection, itemHeights, design);
    const currentSpacing = pages[pageIndex]!.length ? design.spacing.sectionGapMm : 0;
    if (used + currentSpacing + totalHeight <= capacity()) {
      addFragment(visibleSection, totalHeight);
      continue;
    }
    if (totalHeight <= pageCapacity(document, design, format, false)) {
      startPage();
      addFragment(visibleSection, totalHeight);
      continue;
    }

    let entries: typeof visibleEntries = [];
    let fragmentHeight = heading;
    for (let index = 0; index < visibleEntries.length; index += 1) {
      const height = itemHeights[index]!;
      const entryGap = entries.length ? entrySpacing(typedVisibleSection, design) : 0;
      const spacing = pages[pageIndex]!.length ? design.spacing.sectionGapMm : 0;
      if (entries.length && used + spacing + fragmentHeight + entryGap + height > capacity()) {
        addFragment(withEntries(section, entries), fragmentHeight);
        entries = [];
        fragmentHeight = heading;
      }
      ensureFragmentFits(fragmentHeight + height);
      const nextGap = entries.length ? entrySpacing(typedVisibleSection, design) : 0;
      entries = [...entries, visibleEntries[index]!] as typeof visibleEntries;
      fragmentHeight += nextGap + height;
    }
    addFragment(withEntries(section, entries), fragmentHeight);
  }

  const populatedPages = pages.filter((sections, index) => sections.length > 0 || index === 0);
  for (let index = populatedPages.length - 1; index > 0; index -= 1) {
    const previous = populatedPages[index - 1]!;
    const current = populatedPages[index]!;
    if (previous.length !== 1 || current.length !== 1) continue;
    const previousSection = previous[0]!;
    const currentSection = current[0]!;
    if (previousSection.id !== currentSection.id || !("entries" in previousSection) || !("entries" in currentSection)) continue;
    if (currentSection.entries.length >= 3 || previousSection.entries.length <= currentSection.entries.length + 1) continue;

    const combined = [...previousSection.entries, ...currentSection.entries];
    const splitAt = Math.ceil(combined.length / 2);
    previous[0] = withEntries(previousSection, combined.slice(0, splitAt));
    current[0] = withEntries(currentSection, combined.slice(splitAt));
  }

  return populatedPages
    .map((sections, index) => ({ number: index + 1, showHeader: index === 0, sections }));
}

export function estimateResumeTextLength(document: ResumeDocument): number {
  return document.sections.reduce((total, section) => {
    if (section.type === "summary") return total + textLength(section.content);
    if (section.type === "declaration") return total + textLength(section.text);
    return total + section.entries.reduce((entryTotal, entry) => entryTotal + JSON.stringify(entry).length, 0);
  }, document.personal.fullName.length);
}
