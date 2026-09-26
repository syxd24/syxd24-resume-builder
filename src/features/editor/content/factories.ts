import type { ResumeSection, SectionType } from "@/domain/resume/schema";
import { createEditorId } from "./editor-utils";
import type { EntrySection, ResumeEntry } from "./types";

export const SECTION_CATALOG = [
  { type: "education", title: "Education", description: "Degrees, schools and academic achievements" },
  { type: "experience", title: "Professional Experience", description: "Roles, employers and key accomplishments" },
  { type: "skills", title: "Skills", description: "Technical, professional and specialist skills" },
  { type: "languages", title: "Languages", description: "Languages and proficiency levels" },
  { type: "certificates", title: "Certificates", description: "Licences and professional credentials" },
  { type: "interests", title: "Interests", description: "Relevant interests and activities" },
  { type: "projects", title: "Projects", description: "Selected work and personal projects" },
  { type: "courses", title: "Courses", description: "Training and continuing education" },
  { type: "awards", title: "Awards", description: "Honours, awards and recognition" },
  { type: "organisations", title: "Organisations", description: "Memberships and community involvement" },
  { type: "publications", title: "Publications", description: "Articles, papers and published work" },
  { type: "references", title: "References", description: "Professional referees and contact details" },
  { type: "declaration", title: "Declaration", description: "A signed or dated declaration" },
  { type: "custom", title: "Custom", description: "A flexible section for anything else" },
] as const satisfies ReadonlyArray<{ type: Exclude<SectionType, "summary">; title: string; description: string }>;

export function createSection(type: Exclude<SectionType, "summary">): ResumeSection {
  const base = { id: createEditorId(type), type, heading: SECTION_CATALOG.find((item) => item.type === type)?.title ?? "Section", visible: true, column: "full" as const };
  switch (type) {
    case "declaration": return { ...base, type, text: [] };
    case "experience":
    case "education":
    case "skills":
    case "languages":
    case "certificates":
    case "interests":
    case "projects":
    case "courses":
    case "awards":
    case "organisations":
    case "publications":
    case "references":
    case "custom": return { ...base, type, entries: [] } as ResumeSection;
  }
}

export function createEntry(type: EntrySection["type"]): ResumeEntry {
  const base = { id: createEditorId(type), visible: true };
  switch (type) {
    case "experience": return { ...base, position: "", employer: "", description: [] };
    case "education": return { ...base, degree: "", institution: "", description: [] };
    case "skills": return { ...base, name: "" };
    case "languages": return { ...base, name: "", proficiency: "" };
    case "certificates": return { ...base, title: "" };
    case "interests": return { ...base, name: "" };
    case "projects": return { ...base, title: "", description: [] };
    case "courses": return { ...base, title: "", description: [] };
    case "awards": return { ...base, title: "", description: [] };
    case "organisations": return { ...base, name: "", description: [] };
    case "publications": return { ...base, title: "", description: [] };
    case "references": return { ...base, name: "" };
    case "custom": return { ...base, title: "", description: [] };
  }
}

export function duplicateEntry<T extends ResumeEntry>(entry: T): T {
  return structuredClone({ ...entry, id: createEditorId("entry-copy") });
}
