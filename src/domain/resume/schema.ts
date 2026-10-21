import { z } from "zod";

const optionalText = z.string().max(10_000).optional();
const optionalUrl = z.union([z.string().url(), z.literal("")]).optional();

export const resumeDateSchema = z
  .object({
    year: z.number().int().min(1900).max(2200).optional(),
    month: z.number().int().min(1).max(12).optional(),
    raw: z.string().max(200).optional(),
  })
  .strict();

export const dateRangeSchema = z
  .object({
    start: resumeDateSchema.optional(),
    end: resumeDateSchema.optional(),
    current: z.boolean().default(false),
  })
  .strict();

export const resumeLinkSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().max(200),
    url: z.union([z.string().url(), z.literal("")]),
    visible: z.boolean().default(true),
  })
  .strict();

export const personalDetailKindSchema = z.enum([
  "visa-status",
  "work-authorization",
  "nationality",
  "date-of-birth",
  "additional",
  "custom",
]);

export const personalDetailSchema = z
  .object({
    id: z.string().min(1),
    kind: personalDetailKindSchema.default("custom"),
    label: z.string().max(200),
    value: z.string().max(10_000),
    visible: z.boolean().default(true),
  })
  .strict();

export const richTextMarkSchema = z.enum(["bold", "italic", "underline"]);

export const richTextSpanSchema = z
  .object({
    text: z.string().max(50_000),
    marks: z.array(richTextMarkSchema).default([]),
    href: z.string().url().optional(),
  })
  .strict();

export const richTextBlockSchema = z
  .object({
    type: z.enum(["paragraph", "bullet", "ordered-item"]),
    text: z.string().max(50_000).default(""),
    spans: z.array(richTextSpanSchema).optional(),
  })
  .strict();

export const richTextSchema = z.array(richTextBlockSchema).max(2_000);

export type RichText = z.infer<typeof richTextSchema>;

export function richTextToPlainText(value: RichText): string {
  return value
    .map((block) => block.spans?.map((span) => span.text).join("") ?? block.text)
    .join("\n");
}

export const personalDetailsSchema = z
  .object({
    fullName: z.string().max(300).default(""),
    jobTitle: optionalText,
    email: optionalText,
    phone: optionalText,
    location: optionalText,
    address: optionalText,
    website: optionalUrl,
    links: z.array(resumeLinkSchema).max(100).default([]),
    details: z.array(personalDetailSchema).max(100).default([]),
    photo: z
      .object({
        storagePath: z.string().min(1).max(1_000),
        alt: z.string().max(500).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const sectionTypeSchema = z.enum([
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "certificates",
  "interests",
  "projects",
  "courses",
  "awards",
  "organisations",
  "publications",
  "references",
  "declaration",
  "custom",
]);

export const sectionColumnSchema = z.enum(["primary", "secondary", "full"]);

const entryBase = {
  id: z.string().min(1),
  visible: z.boolean().default(true),
};

const sectionBase = {
  id: z.string().min(1),
  heading: z.string().min(1).max(300),
  visible: z.boolean().default(true),
  column: sectionColumnSchema.default("full"),
};

export const experienceEntrySchema = z
  .object({
    ...entryBase,
    position: z.string().max(500).default(""),
    employer: z.string().max(500).default(""),
    employerUrl: optionalUrl,
    location: optionalText,
    dateRange: dateRangeSchema.optional(),
    description: richTextSchema.default([]),
  })
  .strict();

export const educationEntrySchema = z
  .object({
    ...entryBase,
    degree: z.string().max(500).default(""),
    institution: z.string().max(500).default(""),
    institutionUrl: optionalUrl,
    location: optionalText,
    dateRange: dateRangeSchema.optional(),
    description: richTextSchema.default([]),
  })
  .strict();

export const skillEntrySchema = z
  .object({
    ...entryBase,
    name: z.string().max(500).default(""),
    level: z.number().min(0).max(100).optional(),
    description: optionalText,
    category: optionalText,
  })
  .strict();

export const languageEntrySchema = z
  .object({
    ...entryBase,
    name: z.string().max(500).default(""),
    proficiency: z.string().max(500).default(""),
    level: z.number().min(0).max(100).optional(),
    detail: optionalText,
  })
  .strict();

export const projectEntrySchema = z
  .object({
    ...entryBase,
    title: z.string().max(500).default(""),
    url: optionalUrl,
    subtitle: optionalText,
    dateRange: dateRangeSchema.optional(),
    description: richTextSchema.default([]),
  })
  .strict();

export const certificateEntrySchema = z
  .object({
    ...entryBase,
    title: z.string().max(500).default(""),
    issuer: optionalText,
    url: optionalUrl,
    date: resumeDateSchema.optional(),
  })
  .strict();

export const courseEntrySchema = z
  .object({
    ...entryBase,
    title: z.string().max(500).default(""),
    provider: optionalText,
    url: optionalUrl,
    dateRange: dateRangeSchema.optional(),
    description: richTextSchema.default([]),
  })
  .strict();

export const awardEntrySchema = z
  .object({
    ...entryBase,
    title: z.string().max(500).default(""),
    issuer: optionalText,
    date: resumeDateSchema.optional(),
    url: optionalUrl,
    description: richTextSchema.default([]),
  })
  .strict();

export const organisationEntrySchema = z
  .object({
    ...entryBase,
    name: z.string().max(500).default(""),
    role: optionalText,
    location: optionalText,
    url: optionalUrl,
    dateRange: dateRangeSchema.optional(),
    description: richTextSchema.default([]),
  })
  .strict();

export const publicationEntrySchema = z
  .object({
    ...entryBase,
    title: z.string().max(500).default(""),
    publisher: optionalText,
    date: resumeDateSchema.optional(),
    url: optionalUrl,
    description: richTextSchema.default([]),
  })
  .strict();

export const interestEntrySchema = z
  .object({
    ...entryBase,
    name: z.string().max(500).default(""),
    description: optionalText,
    url: optionalUrl,
  })
  .strict();

export const referenceEntrySchema = z
  .object({
    ...entryBase,
    name: z.string().max(500).default(""),
    jobTitle: optionalText,
    organisation: optionalText,
    email: optionalText,
    phone: optionalText,
    note: optionalText,
  })
  .strict();

export const customEntrySchema = z
  .object({
    ...entryBase,
    title: z.string().max(500).default(""),
    subtitle: optionalText,
    url: optionalUrl,
    location: optionalText,
    dateRange: dateRangeSchema.optional(),
    description: richTextSchema.default([]),
  })
  .strict();

export const summarySectionSchema = z.object({ ...sectionBase, type: z.literal("summary"), content: richTextSchema.default([]) }).strict();
export const experienceSectionSchema = z.object({ ...sectionBase, type: z.literal("experience"), entries: z.array(experienceEntrySchema).default([]) }).strict();
export const educationSectionSchema = z.object({ ...sectionBase, type: z.literal("education"), entries: z.array(educationEntrySchema).default([]) }).strict();
export const skillsSectionSchema = z.object({ ...sectionBase, type: z.literal("skills"), entries: z.array(skillEntrySchema).default([]) }).strict();
export const languagesSectionSchema = z.object({ ...sectionBase, type: z.literal("languages"), entries: z.array(languageEntrySchema).default([]) }).strict();
export const certificatesSectionSchema = z.object({ ...sectionBase, type: z.literal("certificates"), entries: z.array(certificateEntrySchema).default([]) }).strict();
export const interestsSectionSchema = z.object({ ...sectionBase, type: z.literal("interests"), entries: z.array(interestEntrySchema).default([]) }).strict();
export const projectsSectionSchema = z.object({ ...sectionBase, type: z.literal("projects"), entries: z.array(projectEntrySchema).default([]) }).strict();
export const coursesSectionSchema = z.object({ ...sectionBase, type: z.literal("courses"), entries: z.array(courseEntrySchema).default([]) }).strict();
export const awardsSectionSchema = z.object({ ...sectionBase, type: z.literal("awards"), entries: z.array(awardEntrySchema).default([]) }).strict();
export const organisationsSectionSchema = z.object({ ...sectionBase, type: z.literal("organisations"), entries: z.array(organisationEntrySchema).default([]) }).strict();
export const publicationsSectionSchema = z.object({ ...sectionBase, type: z.literal("publications"), entries: z.array(publicationEntrySchema).default([]) }).strict();
export const referencesSectionSchema = z.object({ ...sectionBase, type: z.literal("references"), entries: z.array(referenceEntrySchema).default([]) }).strict();
export const declarationSectionSchema = z
  .object({
    ...sectionBase,
    type: z.literal("declaration"),
    text: richTextSchema.default([]),
    place: optionalText,
    date: resumeDateSchema.optional(),
    signatureStoragePath: optionalText,
  })
  .strict();
export const customSectionSchema = z.object({ ...sectionBase, type: z.literal("custom"), entries: z.array(customEntrySchema).default([]) }).strict();

export const resumeSectionSchema = z.discriminatedUnion("type", [
  summarySectionSchema,
  experienceSectionSchema,
  educationSectionSchema,
  skillsSectionSchema,
  languagesSectionSchema,
  certificatesSectionSchema,
  interestsSectionSchema,
  projectsSectionSchema,
  coursesSectionSchema,
  awardsSectionSchema,
  organisationsSectionSchema,
  publicationsSectionSchema,
  referencesSectionSchema,
  declarationSectionSchema,
  customSectionSchema,
]);

export const resumeDocumentSchema = z
  .object({
    version: z.literal(1),
    personal: personalDetailsSchema,
    sections: z.array(resumeSectionSchema).max(200),
  })
  .strict()
  .superRefine((document, context) => {
    const ids = new Set<string>();
    for (const section of document.sections) {
      if (ids.has(section.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate section id: ${section.id}`, path: ["sections"] });
      }
      ids.add(section.id);
    }
  });

export type ResumeDate = z.infer<typeof resumeDateSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type ResumeLink = z.infer<typeof resumeLinkSchema>;
export type PersonalDetailKind = z.infer<typeof personalDetailKindSchema>;
export type PersonalDetail = z.infer<typeof personalDetailSchema>;
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type SectionColumn = z.infer<typeof sectionColumnSchema>;
export type ResumeSection = z.infer<typeof resumeSectionSchema>;
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;

export function createDefaultResumeDocument(): ResumeDocument {
  return resumeDocumentSchema.parse({
    version: 1,
    personal: { fullName: "", links: [] },
    sections: [
      { id: crypto.randomUUID(), type: "summary", heading: "Profile", visible: true, column: "full", content: [] },
      { id: crypto.randomUUID(), type: "experience", heading: "Professional Experience", visible: true, column: "full", entries: [] },
      { id: crypto.randomUUID(), type: "education", heading: "Education", visible: true, column: "full", entries: [] },
      { id: crypto.randomUUID(), type: "skills", heading: "Skills", visible: true, column: "full", entries: [] },
    ],
  });
}
