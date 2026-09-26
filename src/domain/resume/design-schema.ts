import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-F]{6}$/i, "Expected a six-digit hex color");
const fontFamily = z.string().trim().min(1).max(100);

export const resumeDesignSchema = z
  .object({
    version: z.literal(1).default(1),
    document: z
      .object({
        language: z.enum(["en-GB", "de-DE", "pl-PL"]).default("en-GB"),
        dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "MMM YYYY", "MM/YYYY"]).default("DD/MM/YYYY"),
        pageFormat: z.enum(["A4", "Letter"]).default("A4"),
      })
      .strict()
      .default({}),
    layout: z
      .object({
        mode: z.enum(["one-column", "two-column", "mixed"]).default("one-column"),
        secondaryWidthPct: z.number().min(25).max(45).default(32),
        columnGapMm: z.number().min(2).max(15).default(6),
      })
      .strict()
      .default({}),
    typography: z
      .object({
        bodyFont: fontFamily.default("Alegreya"),
        nameFont: z.union([fontFamily, z.literal("inherit")]).default("inherit"),
        baseSizePt: z.number().min(7).max(14).default(10.5),
        nameOffsetPt: z.number().min(4).max(20).default(11),
        sectionHeadingOffsetPt: z.number().min(0).max(8).default(3),
        entryHeaderOffsetPt: z.number().min(-2).max(5).default(0),
        lineHeight: z.number().min(1).max(1.8).default(1.15),
      })
      .strict()
      .default({}),
    spacing: z
      .object({
        marginTopMm: z.number().min(5).max(30).default(12),
        marginRightMm: z.number().min(5).max(30).default(12),
        marginBottomMm: z.number().min(5).max(30).default(12),
        marginLeftMm: z.number().min(5).max(30).default(12),
        headerGapMm: z.number().min(0).max(15).default(4),
        sectionGapMm: z.number().min(0).max(15).default(4),
        headingGapMm: z.number().min(0).max(10).default(2),
        entryGapMm: z.number().min(0).max(12).default(2.5),
        paragraphGapMm: z.number().min(0).max(8).default(1.5),
      })
      .strict()
      .default({}),
    entries: z
      .object({
        metadataAlign: z.enum(["left", "right", "inline"]).default("right"),
        metadataSeparator: z.string().max(10).default(" • "),
        descriptionIndent: z.boolean().default(false),
        descriptionIndentMm: z.number().min(0).max(12).default(0),
        experienceTitleFirst: z.boolean().default(true),
        educationDegreeFirst: z.boolean().default(true),
      })
      .strict()
      .default({}),
    headings: z
      .object({
        style: z.enum(["simple", "rule", "underline", "boxed"]).default("rule"),
        alignment: z.enum(["left", "center", "right"]).default("left"),
        iconMode: z.enum(["none", "outline", "filled"]).default("none"),
        ruleThicknessPt: z.number().min(0.25).max(3).default(0.75),
      })
      .strict()
      .default({}),
    colors: z
      .object({
        body: hexColor.default("#171717"),
        secondary: hexColor.default("#4B5563"),
        accent: hexColor.default("#244E64"),
        heading: hexColor.default("#171717"),
        border: hexColor.default("#244E64"),
        headerBackground: hexColor.default("#FFFFFF"),
        link: hexColor.default("#244E64"),
        accentTargets: z
          .object({
            name: z.boolean().default(true),
            jobTitle: z.boolean().default(false),
            headings: z.boolean().default(false),
            icons: z.boolean().default(true),
            links: z.boolean().default(true),
            skillIndicators: z.boolean().default(true),
            rules: z.boolean().default(true),
          })
          .strict()
          .default({}),
      })
      .strict()
      .default({}),
    header: z
      .object({
        alignment: z.enum(["left", "center", "right"]).default("center"),
        detailsArrangement: z.enum(["inline-wrap", "stacked", "split"]).default("inline-wrap"),
        lineStyle: z.enum(["none", "full", "short", "accent"]).default("none"),
        showIcons: z.boolean().default(true),
        nameFirst: z.boolean().default(true),
      })
      .strict()
      .default({}),
    photo: z
      .object({
        visible: z.boolean().default(false),
        shape: z.enum(["circle", "square", "rounded"]).default("circle"),
        placement: z.enum(["left", "right", "above"]).default("left"),
        sizeMm: z.number().min(12).max(50).default(24),
        grayscale: z.boolean().default(false),
        zoom: z.number().min(1).max(4).default(1),
        x: z.number().min(0).max(1).default(0.5),
        y: z.number().min(0).max(1).default(0.5),
      })
      .strict()
      .default({}),
    links: z
      .object({
        underline: z.boolean().default(false),
        colorMode: z.enum(["inherit", "accent", "standard"]).default("inherit"),
        showIcons: z.boolean().default(true),
      })
      .strict()
      .default({}),
    footer: z
      .object({
        pageNumbers: z.boolean().default(false),
        showName: z.boolean().default(false),
        showEmail: z.boolean().default(false),
        alignment: z.enum(["left", "center", "right"]).default("center"),
        gapMm: z.number().min(2).max(15).default(5),
      })
      .strict()
      .default({}),
    sections: z
      .record(
        z.string(),
        z
          .object({
            headingStyle: z.enum(["inherit", "simple", "rule", "underline", "boxed"]).default("inherit"),
            skillDisplay: z.enum(["text", "list", "level"]).default("text"),
          })
          .strict(),
      )
      .default({}),
  })
  .strict();

export type ResumeDesign = z.infer<typeof resumeDesignSchema>;

export const defaultResumeDesign: ResumeDesign = resumeDesignSchema.parse({});

function deepMerge(base: unknown, override: unknown): unknown {
  if (!base || typeof base !== "object" || Array.isArray(base) || !override || typeof override !== "object" || Array.isArray(override)) {
    return override ?? base;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }
  return result;
}

export function normalizeResumeDesign(input: unknown): ResumeDesign {
  const merged = deepMerge(defaultResumeDesign, input);
  const parsed = resumeDesignSchema.safeParse(merged);
  return parsed.success ? parsed.data : structuredClone(defaultResumeDesign);
}
