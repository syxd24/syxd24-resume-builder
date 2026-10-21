import type {
  PersonalDetail,
  PersonalDetailKind,
  PersonalDetails,
  ResumeDocument,
  ResumeLink,
  ResumeSection,
  SectionColumn,
  SectionType,
} from "@/domain/resume/schema";
import { createEditorId, moveItem, replaceSection } from "./editor-utils";
import { createEntry, createSection, duplicateEntry } from "./factories";
import type { EntrySection, ResumeEntry } from "./types";

export type SectionSettingsPatch = Partial<
  Pick<ResumeSection, "heading" | "visible" | "column">
>;

export function updatePersonalDetails(
  document: ResumeDocument,
  patch: Partial<PersonalDetails>,
): ResumeDocument {
  return { ...document, personal: { ...document.personal, ...patch } };
}

export function addPersonalLink(document: ResumeDocument): ResumeDocument {
  const link: ResumeLink = {
    id: createEditorId("link"),
    label: "",
    url: "",
    visible: true,
  };
  return updatePersonalDetails(document, {
    links: [...document.personal.links, link],
  });
}

export function updatePersonalLink(
  document: ResumeDocument,
  linkId: string,
  patch: Partial<ResumeLink>,
): ResumeDocument {
  return updatePersonalDetails(document, {
    links: document.personal.links.map((link) =>
      link.id === linkId ? { ...link, ...patch } : link,
    ),
  });
}

export function removePersonalLink(
  document: ResumeDocument,
  linkId: string,
): ResumeDocument {
  return updatePersonalDetails(document, {
    links: document.personal.links.filter((link) => link.id !== linkId),
  });
}

export function movePersonalLink(
  document: ResumeDocument,
  from: number,
  to: number,
): ResumeDocument {
  return updatePersonalDetails(document, {
    links: moveItem(document.personal.links, from, to),
  });
}

export const PERSONAL_DETAIL_PRESETS = [
  { kind: "visa-status", label: "Visa Status" },
  { kind: "work-authorization", label: "Work Authorization" },
  { kind: "nationality", label: "Nationality" },
  { kind: "date-of-birth", label: "Date of Birth" },
  { kind: "additional", label: "Additional contact information" },
] as const satisfies ReadonlyArray<{
  kind: Exclude<PersonalDetailKind, "custom">;
  label: string;
}>;

export function addPersonalDetail(
  document: ResumeDocument,
  kind: PersonalDetailKind,
): { document: ResumeDocument; detail: PersonalDetail } {
  const preset = PERSONAL_DETAIL_PRESETS.find((candidate) => candidate.kind === kind);
  const detail: PersonalDetail = {
    id: createEditorId("detail"),
    kind,
    label: preset?.label ?? "Custom detail",
    value: "",
    visible: true,
  };

  return {
    detail,
    document: updatePersonalDetails(document, {
      details: [...document.personal.details, detail],
    }),
  };
}

export function updatePersonalDetail(
  document: ResumeDocument,
  detailId: string,
  patch: Partial<PersonalDetail>,
): ResumeDocument {
  return updatePersonalDetails(document, {
    details: document.personal.details.map((detail) =>
      detail.id === detailId ? { ...detail, ...patch } : detail,
    ),
  });
}

export function removePersonalDetail(
  document: ResumeDocument,
  detailId: string,
): ResumeDocument {
  return updatePersonalDetails(document, {
    details: document.personal.details.filter((detail) => detail.id !== detailId),
  });
}

export function movePersonalDetail(
  document: ResumeDocument,
  from: number,
  to: number,
): ResumeDocument {
  return updatePersonalDetails(document, {
    details: moveItem(document.personal.details, from, to),
  });
}

export function appendSection(
  document: ResumeDocument,
  type: Exclude<SectionType, "summary">,
): { document: ResumeDocument; section: ResumeSection } {
  const section = createSection(type);
  return {
    section,
    document: { ...document, sections: [...document.sections, section] },
  };
}

export function updateSectionSettings(
  document: ResumeDocument,
  sectionId: string,
  patch: SectionSettingsPatch,
): ResumeDocument {
  const section = document.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return document;
  return replaceSection(document, { ...section, ...patch } as ResumeSection);
}

export function removeSection(
  document: ResumeDocument,
  sectionId: string,
): ResumeDocument {
  return {
    ...document,
    sections: document.sections.filter((section) => section.id !== sectionId),
  };
}

export function moveSection(
  document: ResumeDocument,
  from: number,
  to: number,
): ResumeDocument {
  return { ...document, sections: moveItem(document.sections, from, to) };
}

function findEntrySection(
  document: ResumeDocument,
  sectionId: string,
): EntrySection | undefined {
  const section = document.sections.find((candidate) => candidate.id === sectionId);
  return section && "entries" in section ? section : undefined;
}

function replaceEntries(
  document: ResumeDocument,
  section: EntrySection,
  entries: ResumeEntry[],
): ResumeDocument {
  return replaceSection(document, { ...section, entries } as ResumeSection);
}

export function appendEntry(
  document: ResumeDocument,
  sectionId: string,
): { document: ResumeDocument; entry?: ResumeEntry } {
  const section = findEntrySection(document, sectionId);
  if (!section) return { document };
  const entry = createEntry(section.type);
  return {
    entry,
    document: replaceEntries(document, section, [...section.entries, entry]),
  };
}

export function updateEntry(
  document: ResumeDocument,
  sectionId: string,
  entry: ResumeEntry,
): ResumeDocument {
  const section = findEntrySection(document, sectionId);
  if (!section) return document;
  return replaceEntries(
    document,
    section,
    section.entries.map((candidate) =>
      candidate.id === entry.id ? entry : candidate,
    ),
  );
}

export function removeEntry(
  document: ResumeDocument,
  sectionId: string,
  entryId: string,
): ResumeDocument {
  const section = findEntrySection(document, sectionId);
  if (!section) return document;
  return replaceEntries(
    document,
    section,
    section.entries.filter((entry) => entry.id !== entryId),
  );
}

export function copyEntry(
  document: ResumeDocument,
  sectionId: string,
  entryId: string,
): { document: ResumeDocument; entry?: ResumeEntry } {
  const section = findEntrySection(document, sectionId);
  if (!section) return { document };
  const sourceIndex = section.entries.findIndex((entry) => entry.id === entryId);
  const source = section.entries[sourceIndex];
  if (!source) return { document };
  const copy = duplicateEntry(source);
  const entries = [...section.entries];
  entries.splice(sourceIndex + 1, 0, copy);
  return { entry: copy, document: replaceEntries(document, section, entries) };
}

export function moveEntry(
  document: ResumeDocument,
  sectionId: string,
  from: number,
  to: number,
): ResumeDocument {
  const section = findEntrySection(document, sectionId);
  if (!section) return document;
  return replaceEntries(
    document,
    section,
    moveItem<ResumeEntry>(section.entries as readonly ResumeEntry[], from, to),
  );
}

export function createSummarySection(): ResumeSection {
  return {
    id: createEditorId("summary"),
    type: "summary",
    heading: "Profile",
    visible: true,
    column: "full" satisfies SectionColumn,
    content: [],
  };
}
