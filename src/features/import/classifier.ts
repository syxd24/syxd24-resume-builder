import { resumeDocumentSchema, type ResumeDocument, type ResumeSection, type RichText, type SectionType } from "@/domain/resume";

type ClassifiedBlock = { type: SectionType | "unknown"; heading: string; lines: string[] };

const headingAliases: Array<[RegExp, SectionType]> = [
  [/^(summary|profile|professional summary|objective)$/i, "summary"],
  [/^(experience|employment|work experience|professional experience)$/i, "experience"],
  [/^(education|academic background|qualifications)$/i, "education"],
  [/^(skills|technical skills|core competencies)$/i, "skills"],
  [/^(languages?)$/i, "languages"],
  [/^(projects?)$/i, "projects"],
  [/^(certificates?|certifications?)$/i, "certificates"],
  [/^(courses?|training)$/i, "courses"],
  [/^(awards?|honours?|honors?)$/i, "awards"],
  [/^(organisations?|organizations?|volunteer(?:ing)?)$/i, "organisations"],
  [/^(publications?)$/i, "publications"],
  [/^(references?)$/i, "references"],
  [/^(interests?|hobbies)$/i, "interests"],
  [/^(declaration)$/i, "declaration"],
];

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeLine(line: string): string {
  return line.replace(/[\t\u00a0]+/g, " ").replace(/^\s*[•·▪◦*-]\s*/, "").trim();
}

function detectHeading(line: string): SectionType | undefined {
  const candidate = line.replace(/[:：]\s*$/, "").trim();
  return headingAliases.find(([pattern]) => pattern.test(candidate))?.[1];
}

function splitBlocks(text: string): { preamble: string[]; blocks: ClassifiedBlock[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map(normalizeLine);
  const preamble: string[] = [];
  const blocks: ClassifiedBlock[] = [];
  let current: ClassifiedBlock | undefined;
  for (const line of lines) {
    const type = line ? detectHeading(line) : undefined;
    if (type) {
      current = { type, heading: line.replace(/[:：]\s*$/, ""), lines: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      if (line) preamble.push(line);
      continue;
    }
    current.lines.push(line);
  }
  if (!blocks.length && preamble.length) return { preamble: [], blocks: [{ type: "unknown", heading: "Imported Content", lines: preamble }] };
  return { preamble, blocks };
}

function richText(lines: string[]): RichText {
  return lines.filter(Boolean).map((text) => ({ type: "paragraph" as const, text }));
}

function groups(lines: string[]): string[][] {
  const result: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) result.push(current);
      current = [];
    } else current.push(line);
  }
  if (current.length) result.push(current);
  return result.length ? result : [lines.filter(Boolean)];
}

function listValues(lines: string[]): string[] {
  return lines.flatMap((line) => line.split(/[,;|]/)).map(normalizeLine).filter(Boolean);
}

function sectionFromBlock(block: ClassifiedBlock): ResumeSection {
  const base = { id: id(block.type), heading: block.heading, visible: true, column: "full" as const };
  const rows = groups(block.lines);
  switch (block.type) {
    case "summary": return { ...base, type: "summary", content: richText(block.lines) };
    case "experience": return { ...base, type: "experience", entries: rows.map((row) => ({ id: id("experience"), visible: true, position: row[0] ?? "", employer: row[1] ?? "", description: richText(row.slice(2)) })) };
    case "education": return { ...base, type: "education", entries: rows.map((row) => ({ id: id("education"), visible: true, degree: row[0] ?? "", institution: row[1] ?? "", description: richText(row.slice(2)) })) };
    case "skills": return { ...base, type: "skills", entries: listValues(block.lines).map((name) => ({ id: id("skill"), visible: true, name })) };
    case "languages": return { ...base, type: "languages", entries: listValues(block.lines).map((line) => { const [name, ...detail] = line.split(/\s*[-–—:]\s*/); return { id: id("language"), visible: true, name: name ?? line, proficiency: detail.join(" - ") }; }) };
    case "projects": return { ...base, type: "projects", entries: rows.map((row) => ({ id: id("project"), visible: true, title: row[0] ?? "", subtitle: row[1], description: richText(row.slice(2)) })) };
    case "certificates": return { ...base, type: "certificates", entries: rows.map((row) => ({ id: id("certificate"), visible: true, title: row[0] ?? "", issuer: row.slice(1).join(" · ") })) };
    case "courses": return { ...base, type: "courses", entries: rows.map((row) => ({ id: id("course"), visible: true, title: row[0] ?? "", provider: row[1], description: richText(row.slice(2)) })) };
    case "awards": return { ...base, type: "awards", entries: rows.map((row) => ({ id: id("award"), visible: true, title: row[0] ?? "", issuer: row[1], description: richText(row.slice(2)) })) };
    case "organisations": return { ...base, type: "organisations", entries: rows.map((row) => ({ id: id("organisation"), visible: true, name: row[0] ?? "", role: row[1], description: richText(row.slice(2)) })) };
    case "publications": return { ...base, type: "publications", entries: rows.map((row) => ({ id: id("publication"), visible: true, title: row[0] ?? "", publisher: row[1], description: richText(row.slice(2)) })) };
    case "references": return { ...base, type: "references", entries: rows.map((row) => ({ id: id("reference"), visible: true, name: row[0] ?? "", jobTitle: row[1], organisation: row[2], note: row.slice(3).join(" · ") })) };
    case "interests": return { ...base, type: "interests", entries: listValues(block.lines).map((name) => ({ id: id("interest"), visible: true, name })) };
    case "declaration": return { ...base, type: "declaration", text: richText(block.lines) };
    case "custom":
    case "unknown": return { ...base, type: "custom", heading: block.heading || "Imported Content", entries: rows.map((row) => ({ id: id("custom"), visible: true, title: row[0] ?? "Imported content", description: richText(row.slice(1)) })) };
  }
}

function extractPersonal(preamble: string[]) {
  const emailIndex = preamble.findIndex((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line));
  const urlIndex = preamble.findIndex((line) => /^https?:\/\//i.test(line));
  const phoneIndex = preamble.findIndex((line) => /^\+?[\d ()-]{7,}$/.test(line));
  const used = new Set([emailIndex, urlIndex, phoneIndex].filter((value) => value >= 0));
  const identity = preamble.map((line, index) => ({ line, index })).filter(({ index }) => !used.has(index));
  const fullName = identity[0]?.line ?? "";
  const jobTitle = identity[1]?.line;
  const remainder = identity.slice(2).map(({ line }) => line);
  return {
    personal: {
      fullName,
      jobTitle,
      email: emailIndex >= 0 ? preamble[emailIndex] : undefined,
      phone: phoneIndex >= 0 ? preamble[phoneIndex] : undefined,
      website: urlIndex >= 0 ? preamble[urlIndex] : undefined,
      links: [],
    },
    remainder,
  };
}

export function classifyResumeText(text: string): { document: ResumeDocument; unclassifiedText: string[]; warnings: string[] } {
  const normalized = text.trim();
  if (!normalized) throw new Error("No text was available to classify.");
  const { preamble, blocks } = splitBlocks(normalized);
  const { personal, remainder } = extractPersonal(preamble);
  const unclassifiedText = [...remainder];
  const sections = blocks.map(sectionFromBlock);
  if (remainder.length) sections.unshift(sectionFromBlock({ type: "unknown", heading: "Imported Content", lines: remainder }));
  const warnings = unclassifiedText.length ? ["Some header text was preserved in Imported Content for review."] : [];
  return { document: resumeDocumentSchema.parse({ version: 1, personal, sections }), unclassifiedText, warnings };
}
