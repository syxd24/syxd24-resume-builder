import {
  resumeDocumentSchema,
  type DateRange,
  type ResumeDate,
  type ResumeDocument,
  type ResumeSection,
  type RichText,
  type SectionType,
} from "@/domain/resume";

type ParsedLine = { text: string; bullet: boolean };
type ClassifiedBlock = { type: SectionType | "unknown"; heading: string; lines: ParsedLine[] };

const headingAliases: Array<[RegExp, SectionType]> = [
  [/^(summary|profile|professional summary|personal profile|career profile|objective|career objective)$/i, "summary"],
  [/^(experience|employment|employment history|work history|work experience|professional experience)$/i, "experience"],
  [/^(education|academic background|academic history|qualifications)$/i, "education"],
  [/^(skills|key skills|professional skills|technical skills|core competencies|competencies)$/i, "skills"],
  [/^(languages?|language skills)$/i, "languages"],
  [/^(projects?|selected projects?)$/i, "projects"],
  [/^(certificates?|certifications?|licences?|licenses?)$/i, "certificates"],
  [/^(courses?|training|professional training)$/i, "courses"],
  [/^(awards?|honours?|honors?|achievements?)$/i, "awards"],
  [/^(organisations?|organizations?|volunteer(?:ing)?|volunteer experience)$/i, "organisations"],
  [/^(publications?)$/i, "publications"],
  [/^(references?)$/i, "references"],
  [/^(interests?|hobbies)$/i, "interests"],
  [/^(declaration)$/i, "declaration"],
];

const monthPattern = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const dateTokenPattern = `(?:\\d{1,2}[./-]\\d{4}|${monthPattern}\\s+\\d{4}|\\d{4})`;
const dateRangePattern = new RegExp(`(${dateTokenPattern})\\s*(?:[\\u2013\\u2014-]|\\bto\\b)\\s*(present|current|${dateTokenPattern})`, "i");
const currentOnlyPattern = /(present|current)(?=\s*(?:\||$))/i;
const proficiencyPattern = /^(?:native(?:\s*\/\s*bilingual)?|bilingual|fluent|professional(?: working)? proficiency|full professional proficiency|working proficiency|conversational|intermediate|elementary|basic|beginner|advanced|limited working proficiency|[abc][12])$/i;

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanSpacing(value: string): string {
  return value.replace(/[\t\u00a0]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseLine(rawLine: string): ParsedLine | undefined {
  const trimmed = cleanSpacing(rawLine);
  if (!trimmed) return { text: "", bullet: false };
  if (/^[|\u00a6]+$/.test(trimmed)) return undefined;

  const bullet = trimmed.match(/^[\u2022\u00b7\u25aa\u25e6*-]\s*(.+)$/u);
  return bullet ? { text: cleanSpacing(bullet[1] ?? ""), bullet: true } : { text: trimmed, bullet: false };
}

function detectHeading(line: string): SectionType | undefined {
  const candidate = line.replace(/[:\uFF1A]\s*$/, "").trim();
  return headingAliases.find(([pattern]) => pattern.test(candidate))?.[1];
}

function isLikelyUnknownHeading(line: ParsedLine): boolean {
  if (line.bullet || line.text.length < 2 || line.text.length > 80 || /[.!?]$/.test(line.text)) return false;
  const letters = line.text.match(/\p{L}/gu) ?? [];
  return letters.length >= 2 && letters.every((letter) => letter === letter.toLocaleUpperCase());
}

function splitBlocks(text: string): { preamble: ParsedLine[]; blocks: ClassifiedBlock[] } {
  const parsedLines = text.replace(/\r\n?/g, "\n").split("\n").map(parseLine).filter((line): line is ParsedLine => Boolean(line));
  const preamble: ParsedLine[] = [];
  const blocks: ClassifiedBlock[] = [];
  let current: ClassifiedBlock | undefined;

  for (const line of parsedLines) {
    const knownType = line.text && !line.bullet ? detectHeading(line.text) : undefined;
    if (knownType || (line.text && isLikelyUnknownHeading(line))) {
      current = {
        type: knownType ?? "unknown",
        heading: line.text.replace(/[:\uFF1A]\s*$/, ""),
        lines: [],
      };
      blocks.push(current);
      continue;
    }

    if (!current) {
      if (line.text) preamble.push(line);
      continue;
    }
    current.lines.push(line);
  }

  if (!blocks.length && preamble.length) {
    return { preamble: [], blocks: [{ type: "unknown", heading: "Imported Content", lines: preamble }] };
  }
  return { preamble, blocks };
}

function appendWrappedText(previous: string, next: string): string {
  if (!previous) return next;
  if (!next) return previous;
  return `${previous} ${next}`.replace(/\s+/g, " ").trim();
}

function richText(lines: ParsedLine[]): RichText {
  const result: RichText = [];
  let separated = true;

  for (const line of lines) {
    if (!line.text) {
      separated = true;
      continue;
    }
    if (line.bullet) {
      result.push({ type: "bullet", text: line.text });
      separated = false;
      continue;
    }

    const previous = result.at(-1);
    if (!separated && previous) previous.text = appendWrappedText(previous.text, line.text);
    else result.push({ type: "paragraph", text: line.text });
    separated = false;
  }
  return result;
}

function groups(lines: ParsedLine[]): ParsedLine[][] {
  const result: ParsedLine[][] = [];
  let current: ParsedLine[] = [];
  for (const line of lines) {
    if (!line.text) {
      if (current.length) result.push(current);
      current = [];
    } else current.push(line);
  }
  if (current.length) result.push(current);
  return result;
}

function listValues(lines: ParsedLine[]): string[] {
  return richText(lines)
    .flatMap((block) => block.text.split(/[,;|]/))
    .map(cleanSpacing)
    .filter(Boolean);
}

function parseResumeDate(rawValue: string): ResumeDate {
  const raw = cleanSpacing(rawValue);
  const numeric = raw.match(/^(\d{1,2})[./-](\d{4})$/);
  if (numeric) return { month: Number(numeric[1]), year: Number(numeric[2]), raw };

  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) return { year: Number(yearOnly[1]), raw };

  const monthYear = raw.match(new RegExp(`^(${monthPattern})\\s+(\\d{4})$`, "i"));
  if (monthYear) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.findIndex((name) => monthYear[1]?.toLowerCase().startsWith(name)) + 1;
    return { month: month || undefined, year: Number(monthYear[2]), raw };
  }
  return { raw };
}

function parseDateMetadata(value: string): { before: string; dateRange?: DateRange; location?: string } {
  const rangeMatch = dateRangePattern.exec(value);
  const currentMatch = rangeMatch ? undefined : currentOnlyPattern.exec(value);
  const match = rangeMatch ?? currentMatch;
  if (!match || match.index === undefined) return { before: cleanSpacing(value) };

  const before = cleanSpacing(value.slice(0, match.index).replace(/[|\u2022\u00b7\u2013\u2014-]+\s*$/, ""));
  const after = cleanSpacing(value.slice(match.index + match[0].length).replace(/^\s*[|\u2022\u00b7\u2013\u2014,-]+\s*/, ""));
  const dateRange: DateRange = rangeMatch
    ? {
        start: parseResumeDate(rangeMatch[1] ?? ""),
        end: /^(present|current)$/i.test(rangeMatch[2] ?? "") ? undefined : parseResumeDate(rangeMatch[2] ?? ""),
        current: /^(present|current)$/i.test(rangeMatch[2] ?? ""),
      }
    : { current: true };
  return { before, dateRange, location: after || undefined };
}

function containsDateMetadata(value: string): boolean {
  return dateRangePattern.test(value) || currentOnlyPattern.test(value);
}

function splitPrimarySecondary(value: string): [string, string] {
  const lines = value.split("\n").map(cleanSpacing).filter(Boolean);
  if (lines.length > 1) return [lines[0] ?? "", lines.slice(1).join(" ")];

  const single = lines[0] ?? "";
  const atMatch = single.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) return [cleanSpacing(atMatch[1] ?? ""), cleanSpacing(atMatch[2] ?? "")];

  const lastComma = single.lastIndexOf(",");
  if (lastComma > 0 && lastComma < single.length - 1) {
    return [cleanSpacing(single.slice(0, lastComma)), cleanSpacing(single.slice(lastComma + 1))];
  }
  return [single, ""];
}

function splitDatedEntries(lines: ParsedLine[]): ParsedLine[][] {
  const result: ParsedLine[][] = [];
  for (const group of groups(lines)) {
    if (group[0]?.bullet && result.length) {
      result.at(-1)?.push(...group);
      continue;
    }
    let current: ParsedLine[] = [];
    for (const line of group) {
      if (!line.bullet && containsDateMetadata(line.text) && current.some((item) => item.bullet)) {
        result.push(current);
        current = [];
      }
      current.push(line);
    }
    if (current.length) result.push(current);
  }
  return result;
}

function parseDatedEntry(row: ParsedLine[]) {
  const firstBullet = row.findIndex((line) => line.bullet);
  const headerLines = (firstBullet >= 0 ? row.slice(0, firstBullet) : row.slice(0, 1)).filter((line) => line.text);
  const descriptionLines = firstBullet >= 0 ? row.slice(firstBullet) : row.slice(headerLines.length);
  const headerValue = headerLines.map((line) => line.text).join("\n");
  const metadataLineIndex = headerLines.findIndex((line) => containsDateMetadata(line.text));
  const metadata = metadataLineIndex >= 0 ? parseDateMetadata(headerLines[metadataLineIndex]?.text ?? "") : { before: headerValue };
  const identityLines = headerLines.map((line, index) => index === metadataLineIndex ? metadata.before : line.text).filter(Boolean);
  const [primary, secondary] = splitPrimarySecondary(identityLines.join("\n"));
  return { primary, secondary, dateRange: metadata.dateRange, location: metadata.location, description: richText(descriptionLines) };
}

function parseSkills(lines: ParsedLine[]) {
  const categorized: Array<{ name: string; description?: string }> = [];
  const uncategorized: ParsedLine[] = [];
  let current: { name: string; description: string } | undefined;

  const flush = () => {
    if (!current) return;
    categorized.push({ name: current.name, description: cleanSpacing(current.description) || undefined });
    current = undefined;
  };

  for (const line of lines) {
    if (!line.text) {
      flush();
      continue;
    }
    const category = line.text.match(/^([^:]{2,100}):\s*(.*)$/);
    if (category) {
      flush();
      current = { name: cleanSpacing(category[1] ?? ""), description: cleanSpacing(category[2] ?? "") };
    } else if (current) current.description = appendWrappedText(current.description, line.text);
    else uncategorized.push(line);
  }
  flush();

  return [
    ...categorized.map((entry) => ({ id: id("skill"), visible: true, ...entry })),
    ...listValues(uncategorized).map((name) => ({ id: id("skill"), visible: true, name })),
  ];
}

function splitLanguageLine(value: string): [string, string] | undefined {
  const explicit = value.match(/^(.+?)\s*(?::|\s[\u2013\u2014-]\s)\s*(.+)$/);
  if (explicit) return [cleanSpacing(explicit[1] ?? ""), cleanSpacing(explicit[2] ?? "")];

  const suffix = value.match(new RegExp(`^(.+?)\\s+(${proficiencyPattern.source.slice(1, -1)})$`, "i"));
  return suffix ? [cleanSpacing(suffix[1] ?? ""), cleanSpacing(suffix[2] ?? "")] : undefined;
}

function parseLanguages(lines: ParsedLine[]) {
  const values = lines.filter((line) => line.text).map((line) => line.text);
  const entries: Array<{ id: string; visible: true; name: string; proficiency: string }> = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? "";
    const split = splitLanguageLine(value);
    if (split) {
      entries.push({ id: id("language"), visible: true, name: split[0], proficiency: split[1] });
      continue;
    }

    const next = values[index + 1];
    if (next && proficiencyPattern.test(next)) {
      entries.push({ id: id("language"), visible: true, name: value, proficiency: next });
      index += 1;
    } else entries.push({ id: id("language"), visible: true, name: value, proficiency: "" });
  }
  return entries;
}

function parseCertificates(lines: ParsedLine[]) {
  const certificateGroups: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line.text) {
      if (current.length) certificateGroups.push(current);
      current = [];
      continue;
    }
    const startsEntry = /^[\u2013\u2014]\s*/.test(line.text);
    if (startsEntry && current.length) {
      certificateGroups.push(current);
      current = [];
    }
    current.push(startsEntry ? line.text.replace(/^[\u2013\u2014]\s*/, "") : line.text);
  }
  if (current.length) certificateGroups.push(current);

  return certificateGroups.map((row) => {
    const first = row[0] ?? "";
    const pieces = first.split(/\s+[\u2013\u2014]\s+/);
    const title = cleanSpacing(pieces.shift() ?? first);
    const issuer = cleanSpacing(pieces.join(" \u2014 ")) || undefined;
    const remainder = row.slice(1).join(" ").trim();
    const date = remainder && /(?:\b\d{4}\b|\bQ[1-4]\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i.test(remainder)
      ? { raw: remainder }
      : undefined;
    const extra = remainder && !date ? remainder : undefined;
    return {
      id: id("certificate"),
      visible: true,
      title,
      issuer: [issuer, extra].filter(Boolean).join(" \u00b7 ") || undefined,
      date,
    };
  });
}

function customEntries(lines: ParsedLine[]) {
  const blocks = richText(lines);
  if (!blocks.length) return [];
  return blocks.map((block) => ({ id: id("custom"), visible: true, title: block.text, description: [] }));
}

function sectionFromBlock(block: ClassifiedBlock): ResumeSection {
  const base = { id: id(block.type), heading: block.heading, visible: true, column: "full" as const };
  const rows = groups(block.lines);
  switch (block.type) {
    case "summary": return { ...base, type: "summary", content: richText(block.lines) };
    case "experience": return { ...base, type: "experience", entries: splitDatedEntries(block.lines).map((row) => {
      const parsed = parseDatedEntry(row);
      return { id: id("experience"), visible: true, position: parsed.primary, employer: parsed.secondary, location: parsed.location, dateRange: parsed.dateRange, description: parsed.description };
    }) };
    case "education": return { ...base, type: "education", entries: splitDatedEntries(block.lines).map((row) => {
      const parsed = parseDatedEntry(row);
      return { id: id("education"), visible: true, degree: parsed.primary, institution: parsed.secondary, location: parsed.location, dateRange: parsed.dateRange, description: parsed.description };
    }) };
    case "skills": return { ...base, type: "skills", entries: parseSkills(block.lines) };
    case "languages": return { ...base, type: "languages", entries: parseLanguages(block.lines) };
    case "projects": return { ...base, type: "projects", entries: rows.map((row) => ({ id: id("project"), visible: true, title: row[0]?.text ?? "", subtitle: row[1]?.text, description: richText(row.slice(2)) })) };
    case "certificates": return { ...base, type: "certificates", entries: parseCertificates(block.lines) };
    case "courses": return { ...base, type: "courses", entries: rows.map((row) => ({ id: id("course"), visible: true, title: row[0]?.text ?? "", provider: row[1]?.text, description: richText(row.slice(2)) })) };
    case "awards": return { ...base, type: "awards", entries: rows.map((row) => ({ id: id("award"), visible: true, title: row[0]?.text ?? "", issuer: row[1]?.text, description: richText(row.slice(2)) })) };
    case "organisations": return { ...base, type: "organisations", entries: rows.map((row) => ({ id: id("organisation"), visible: true, name: row[0]?.text ?? "", role: row[1]?.text, description: richText(row.slice(2)) })) };
    case "publications": return { ...base, type: "publications", entries: rows.map((row) => ({ id: id("publication"), visible: true, title: row[0]?.text ?? "", publisher: row[1]?.text, description: richText(row.slice(2)) })) };
    case "references": return { ...base, type: "references", entries: rows.map((row) => ({ id: id("reference"), visible: true, name: row[0]?.text ?? "", jobTitle: row[1]?.text, organisation: row[2]?.text, note: row.slice(3).map((line) => line.text).join(" \u00b7 ") || undefined })) };
    case "interests": return { ...base, type: "interests", entries: listValues(block.lines).map((name) => ({ id: id("interest"), visible: true, name })) };
    case "declaration": return { ...base, type: "declaration", text: richText(block.lines) };
    case "custom":
    case "unknown": return { ...base, type: "custom", heading: block.heading || "Imported Content", entries: customEntries(block.lines) };
  }
}

function extractPersonal(preamble: ParsedLine[]) {
  const remaining: string[] = [];
  let email: string | undefined;
  let phone: string | undefined;
  let website: string | undefined;
  let location: string | undefined;

  for (const line of preamble) {
    const segments = line.text.split(/\s+[|\u2022\u00b7]\s+/).map(cleanSpacing).filter(Boolean);
    for (const segment of segments) {
      const emailMatch = segment.match(/[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/u);
      if (!email && emailMatch) {
        email = emailMatch[0];
        continue;
      }
      const urlMatch = segment.match(/(?:https?:\/\/|www\.)[^\s]+/i);
      if (!website && urlMatch) {
        website = urlMatch[0].startsWith("www.") ? `https://${urlMatch[0]}` : urlMatch[0];
        continue;
      }
      const phoneMatch = segment.match(/\+?\d[\d ()-]{5,}\d/);
      if (!phone && phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
        phone = cleanSpacing(phoneMatch[0]);
        continue;
      }
      if (!location && /^[\p{L}.' -]+,\s*[\p{L}.' -]+$/u.test(segment) && segment.length <= 120) {
        location = segment;
        continue;
      }
      remaining.push(segment);
    }
  }

  const fullName = remaining.shift() ?? "";
  const jobTitle = remaining.shift();
  return {
    personal: { fullName, jobTitle, email, phone, location, website, links: [] },
    remainder: remaining,
  };
}

export function classifyResumeText(text: string): { document: ResumeDocument; unclassifiedText: string[]; warnings: string[] } {
  const normalized = text.trim();
  if (!normalized) throw new Error("No text was available to classify.");
  const { preamble, blocks } = splitBlocks(normalized);
  const { personal, remainder } = extractPersonal(preamble);
  const unknownText = blocks.filter((block) => block.type === "unknown").flatMap((block) => block.lines.filter((line) => line.text).map((line) => line.text));
  const unclassifiedText = [...remainder, ...unknownText];
  const sections = blocks.map(sectionFromBlock);
  if (remainder.length) {
    sections.unshift(sectionFromBlock({
      type: "unknown",
      heading: "Imported Content",
      lines: remainder.map((text) => ({ text, bullet: false })),
    }));
  }
  const warnings = unclassifiedText.length ? ["Some text could not be classified confidently and was preserved in a custom section for review."] : [];
  return { document: resumeDocumentSchema.parse({ version: 1, personal, sections }), unclassifiedText, warnings };
}
