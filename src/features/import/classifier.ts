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
  [/^(summary|profile|professional summary|personal profile|career profile|objective|career objective|about me)$/i, "summary"],
  [/^(experience|employment|employment experience|employment history|work|work history|work experience|professional experience|career history)$/i, "experience"],
  [/^(education|academic background|academic history|academic qualifications|qualifications)$/i, "education"],
  [/^(skills|key skills|professional skills|technical skills|core competencies|competencies|areas of expertise)$/i, "skills"],
  [/^(languages?|language skills)$/i, "languages"],
  [/^(projects?|selected projects?|professional projects?|personal projects?)$/i, "projects"],
  [/^(certificates?|certifications?|licences?|licenses?|licences? (?:and|&) certifications?|licenses? (?:and|&) certifications?)$/i, "certificates"],
  [/^(courses?|training|professional training)$/i, "courses"],
  [/^(awards?|honours?|honors?|achievements?)$/i, "awards"],
  [/^(organisations?|organizations?|volunteer(?:ing)?|volunteer experience|community involvement)$/i, "organisations"],
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
const rolePattern = /\b(?:account(?: manager| executive)?|administrator|analyst|architect|associate|consultant|coordinator|designer|developer|director|engineer|executive|founder|graduate|intern|lead|manager|officer|owner|product|programmer|project|recruiter|representative|researcher|sales|scientist|specialist|student|support|teacher|technician|writer)\b/i;
const emailPattern = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const urlPattern = /(?:https?:\/\/|www\.)[^\s|\u2022\u00b7]+|(?:linkedin\.com\/in|github\.com\/)[^\s|\u2022\u00b7]+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:app|co|com|dev|io|me|net|org|site)(?:\/[^\s|\u2022\u00b7]*)?/giu;
const phonePattern = /(?<![\p{L}\p{N}-])\+?\d(?:[\d(). -]{5,}\d)(?![\p{L}\p{N}-])/gu;

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

function detectHeadingLine(line: string): { type: SectionType; heading: string; remainder?: string } | undefined {
  const exactType = detectHeading(line);
  if (exactType) return { type: exactType, heading: line.replace(/[:\uFF1A]\s*$/, "").trim() };

  const separator = line.match(/^(.{2,60}?)[\s]*[:\uFF1A][\s]*(.+)$/);
  if (!separator) return undefined;
  const type = detectHeading(separator[1] ?? "");
  if (!type) return undefined;
  return { type, heading: cleanSpacing(separator[1] ?? ""), remainder: cleanSpacing(separator[2] ?? "") };
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
    const knownHeading = line.text && !line.bullet ? detectHeadingLine(line.text) : undefined;
    const unknownHeading = Boolean(blocks.length && line.text && isLikelyUnknownHeading(line));
    if (knownHeading || unknownHeading) {
      current = {
        type: knownHeading?.type ?? "unknown",
        heading: knownHeading?.heading ?? line.text.replace(/[:\uFF1A]\s*$/, ""),
        lines: knownHeading?.remainder ? [{ text: knownHeading.remainder, bullet: false }] : [],
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

function looksLikeLocation(value: string): boolean {
  const cleaned = cleanSpacing(value).replace(/^location\s*:\s*/i, "");
  if (!cleaned || cleaned.length > 140 || /https?:|@|\d{4}/i.test(cleaned) || rolePattern.test(cleaned)) return false;
  const pieces = cleaned.split(",").map(cleanSpacing).filter(Boolean);
  return pieces.length >= 2 && pieces.length <= 4 && pieces.every((piece) => /^[\p{L}.' -]+$/u.test(piece));
}

function looksLikeEntryHeader(line: ParsedLine): boolean {
  if (line.bullet || line.text.length > 180 || /[.!?]$/.test(line.text)) return false;
  return rolePattern.test(line.text) || /,|\s(?:at|@)\s/i.test(line.text);
}

function splitPrimarySecondary(value: string): [string, string] {
  const lines = value.split("\n").map(cleanSpacing).filter(Boolean);
  if (lines.length > 1) return [lines[0] ?? "", lines.slice(1).join(" ")];

  const single = lines[0] ?? "";
  const atMatch = single.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) return [cleanSpacing(atMatch[1] ?? ""), cleanSpacing(atMatch[2] ?? "")];

  const dashMatch = single.match(/^(.+?)\s+[\u2013\u2014]\s+(.+)$/);
  if (dashMatch) return [cleanSpacing(dashMatch[1] ?? ""), cleanSpacing(dashMatch[2] ?? "")];

  const lastComma = single.lastIndexOf(",");
  if (lastComma > 0 && lastComma < single.length - 1) {
    return [cleanSpacing(single.slice(0, lastComma)), cleanSpacing(single.slice(lastComma + 1))];
  }
  return [single, ""];
}

function splitDatedEntries(lines: ParsedLine[]): ParsedLine[][] {
  const result: ParsedLine[][] = [];
  for (const group of groups(lines)) {
    let current: ParsedLine[] = [];
    for (const line of group) {
      const hasBullets = current.some((item) => item.bullet);
      if (!line.bullet && containsDateMetadata(line.text) && hasBullets) {
        const metadata = parseDateMetadata(line.text);
        if (!metadata.before || looksLikeLocation(metadata.before)) {
          current.push(line);
          result.push(current);
          current = [];
          continue;
        }
        result.push(current);
        current = [line];
        continue;
      }
      if (hasBullets && looksLikeEntryHeader(line)) {
        result.push(current);
        current = [line];
        continue;
      }
      current.push(line);
    }
    if (current.length) result.push(current);
  }
  return result;
}

function parseDatedEntry(row: ParsedLine[]) {
  const firstBullet = row.findIndex((line) => line.bullet);
  const metadataIndex = row.findIndex((line) => !line.bullet && containsDateMetadata(line.text));
  const metadata = metadataIndex >= 0 ? parseDateMetadata(row[metadataIndex]?.text ?? "") : undefined;
  let location = metadata?.location;
  const identityLines: string[] = [];
  const descriptionLines: ParsedLine[] = [];

  for (let index = 0; index < row.length; index += 1) {
    const line = row[index];
    if (!line?.text) continue;
    if (line.bullet) {
      descriptionLines.push(line);
      continue;
    }

    let value = index === metadataIndex ? metadata?.before ?? "" : line.text;
    if (value && !location && looksLikeLocation(value) && (identityLines.length > 0 || firstBullet >= 0)) {
      location = cleanSpacing(value.replace(/^location\s*:\s*/i, ""));
      value = "";
    }
    if (!value) continue;

    const beforeBullets = firstBullet < 0 || index < firstBullet;
    const firstIdentityHasBoth = identityLines.length === 1 && splitPrimarySecondary(identityLines[0] ?? "")[1] !== "";
    if (beforeBullets && identityLines.length < 2 && !firstIdentityHasBoth) identityLines.push(value);
    else descriptionLines.push({ text: value, bullet: false });
  }

  const [primary, secondary] = splitPrimarySecondary(identityLines.join("\n"));
  return { primary, secondary, dateRange: metadata?.dateRange, location, description: richText(descriptionLines) };
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

function parseProjects(lines: ParsedLine[]) {
  return splitDatedEntries(lines).map((row) => {
    const parsed = parseDatedEntry(row);
    const description = parsed.location
      ? [{ type: "paragraph" as const, text: parsed.location }, ...parsed.description]
      : parsed.description;
    return {
      id: id("project"),
      visible: true,
      title: parsed.primary,
      subtitle: parsed.secondary || undefined,
      dateRange: parsed.dateRange,
      description,
    };
  });
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
    case "projects": return { ...base, type: "projects", entries: parseProjects(block.lines) };
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

function normalizeUrl(value: string): string | undefined {
  const cleaned = value.replace(/^[<(\[]+|[>)\],.;:]+$/g, "");
  const candidate = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned.replace(/^www\./i, "")}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return undefined;
  }
}

function isLikelyName(value: string): boolean {
  const words = cleanSpacing(value).split(" ");
  if (words.length < 2 || words.length > 6 || rolePattern.test(value) || /\d|[,:;@/]/.test(value)) return false;
  return words.every((word) => /^[\p{Lu}][\p{L}'-]*$/u.test(word) || /^\p{Lu}{2,}$/u.test(word));
}

function cleanHeaderRemainder(value: string): string {
  return cleanSpacing(value)
    .replace(/^(?:e-?mail|phone|mobile|tel(?:ephone)?|linkedin|github|website|portfolio)\s*:?\s*/i, "")
    .replace(/^[|\u2022\u00b7,;:\s]+|[|\u2022\u00b7,;:\s]+$/g, "")
    .trim();
}

function takePersonalDetail(value: string): { remainder: string; kind?: "visa-status" | "work-authorization" | "nationality" | "date-of-birth"; detail?: string } {
  const labelledDetail = value.match(/\b(nationality|date of birth|dob)\s*:\s*([^|\u2022\u00b7]+)/iu);
  if (labelledDetail?.index !== undefined) {
    return {
      remainder: cleanHeaderRemainder(`${value.slice(0, labelledDetail.index)} ${value.slice(labelledDetail.index + labelledDetail[0].length)}`),
      kind: /^nationality$/i.test(labelledDetail[1] ?? "") ? "nationality" : "date-of-birth",
      detail: cleanSpacing(labelledDetail[2] ?? ""),
    };
  }

  const visaMatch = value.match(/\b(?:visa status\s*:?\s*[^|\u2022\u00b7]+|(?:[\p{L}-]+\s+)?(?:residence|work) permit(?:\s+holder)?)\b/iu);
  if (visaMatch?.index !== undefined) {
    const detail = cleanSpacing(visaMatch[0].replace(/^visa status\s*:?\s*/i, ""));
    return { remainder: cleanHeaderRemainder(`${value.slice(0, visaMatch.index)} ${value.slice(visaMatch.index + visaMatch[0].length)}`), kind: "visa-status", detail };
  }

  const authorizationMatch = value.match(/\b(?:(?:fully\s+)?authori[sz]ed to work[^|\u2022\u00b7]*|eligible to work[^|\u2022\u00b7]*|right to work[^|\u2022\u00b7]*|(?:no|without) sponsorship required|sponsorship (?:is )?not required)\b/iu);
  if (authorizationMatch?.index !== undefined) {
    return {
      remainder: cleanHeaderRemainder(`${value.slice(0, authorizationMatch.index)} ${value.slice(authorizationMatch.index + authorizationMatch[0].length)}`),
      kind: "work-authorization",
      detail: cleanSpacing(authorizationMatch[0]),
    };
  }
  return { remainder: value };
}

function extractPersonal(preamble: ParsedLine[]) {
  const remaining: string[] = [];
  const emails: string[] = [];
  const phones: string[] = [];
  const urls: string[] = [];
  const workAuthorization: string[] = [];
  const visaStatuses: string[] = [];
  let fullName = "";
  let jobTitle: string | undefined;
  let website: string | undefined;
  let location: string | undefined;
  let address: string | undefined;

  for (const line of preamble) {
    let residue = line.text.replace(emailPattern, (match) => {
      emails.push(match);
      return "  ";
    });
    residue = residue.replace(urlPattern, (match) => {
      const normalized = normalizeUrl(match);
      if (normalized) urls.push(normalized);
      return "  ";
    });
    residue = residue.replace(phonePattern, (match) => {
      const digits = match.replace(/\D/g, "");
      const dateLike = /^\s*\d{4}\s*-\s*\d{4}\s*$/.test(match);
      if (digits.length >= 7 && digits.length <= 15 && !dateLike) {
        phones.push(cleanSpacing(match));
        return "  ";
      }
      return match;
    });

    const segments = residue.split(/\s*[|\u2022\u00b7]\s*|\s{2,}/).map(cleanHeaderRemainder).filter(Boolean);
    for (const originalSegment of segments) {
      let segment = originalSegment;
      for (let attempts = 0; attempts < 3; attempts += 1) {
        const extracted = takePersonalDetail(segment);
        if (!extracted.kind || !extracted.detail) break;
        if (extracted.kind === "visa-status") visaStatuses.push(extracted.detail);
        else if (extracted.kind === "work-authorization") workAuthorization.push(extracted.detail);
        else remaining.push(`${extracted.kind === "nationality" ? "Nationality" : "Date of Birth"}: ${extracted.detail}`);
        segment = extracted.remainder;
      }
      if (!segment) continue;

      const explicitName = segment.match(/^(?:full )?name\s*:\s*(.+)$/i);
      if (explicitName && !fullName) {
        fullName = cleanSpacing(explicitName[1] ?? "");
        continue;
      }
      const explicitTitle = segment.match(/^(?:job|professional) title\s*:\s*(.+)$/i);
      if (explicitTitle && !jobTitle) {
        jobTitle = cleanSpacing(explicitTitle[1] ?? "");
        continue;
      }
      const explicitAddress = segment.match(/^address\s*:\s*(.+)$/i);
      if (explicitAddress && !address) {
        address = cleanSpacing(explicitAddress[1] ?? "");
        continue;
      }
      const explicitLocation = segment.match(/^location\s*:\s*(.+)$/i);
      if (explicitLocation && !location) {
        location = cleanSpacing(explicitLocation[1] ?? "");
        continue;
      }
      if (!location && looksLikeLocation(segment)) {
        location = segment;
        continue;
      }
      remaining.push(segment);
    }
  }

  if (!fullName) {
    const nameIndex = remaining.findIndex(isLikelyName);
    if (nameIndex >= 0) fullName = remaining.splice(nameIndex, 1)[0] ?? "";
    else fullName = remaining.shift() ?? "";
  }
  if (!jobTitle) {
    const titleIndex = remaining.findIndex((value) => value.length <= 180 && rolePattern.test(value));
    if (titleIndex >= 0) jobTitle = remaining.splice(titleIndex, 1)[0];
  }

  const links: Array<{ id: string; label: string; url: string; visible: true }> = [];
  for (const url of [...new Set(urls)]) {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const label = host === "linkedin.com" || host.endsWith(".linkedin.com")
      ? "LinkedIn"
      : host === "github.com" || host.endsWith(".github.com")
        ? "GitHub"
        : undefined;
    if (label) links.push({ id: id("link"), label, url, visible: true });
    else if (!website) website = url;
    else links.push({ id: id("link"), label: host, url, visible: true });
  }

  const details: Array<{ id: string; kind: "visa-status" | "work-authorization" | "nationality" | "date-of-birth" | "additional"; label: string; value: string; visible: true }> = [];
  const uniqueVisaStatuses = [...new Set(visaStatuses)];
  const uniqueWorkAuthorization = [...new Set(workAuthorization)];
  if (uniqueVisaStatuses.length) details.push({ id: id("detail"), kind: "visa-status", label: "Visa Status", value: uniqueVisaStatuses.join(" | "), visible: true });
  if (uniqueWorkAuthorization.length) details.push({ id: id("detail"), kind: "work-authorization", label: "Work Authorization", value: uniqueWorkAuthorization.join(" | "), visible: true });
  for (const detail of remaining.filter((value) => /^(?:Nationality|Date of Birth): /i.test(value))) {
    const [label, ...value] = detail.split(": ");
    const kind = /^nationality$/i.test(label ?? "") ? "nationality" as const : "date-of-birth" as const;
    details.push({ id: id("detail"), kind, label: label ?? "Personal Detail", value: value.join(": "), visible: true });
  }
  for (const extraEmail of [...new Set(emails)].slice(1)) details.push({ id: id("detail"), kind: "additional", label: "Additional Email", value: extraEmail, visible: true });
  for (const extraPhone of [...new Set(phones)].slice(1)) details.push({ id: id("detail"), kind: "additional", label: "Additional Phone", value: extraPhone, visible: true });

  return {
    personal: {
      fullName,
      jobTitle,
      email: emails[0],
      phone: phones[0],
      location,
      address,
      website,
      links,
      details,
    },
    remainder: remaining.filter((value) => !/^(?:Nationality|Date of Birth): /i.test(value)),
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
