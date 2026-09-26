import { z } from "zod";

import { resumeDesignSchema, resumeDocumentSchema } from "@/domain/resume";

export const resumeIdSchema = z.string().uuid();

export const createResumeRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    content: resumeDocumentSchema.optional(),
    design: resumeDesignSchema.optional(),
  })
  .strict();

export const updateResumeRequestSchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    patch: z
      .object({
        title: z.string().trim().min(1).max(300).optional(),
        content: resumeDocumentSchema.optional(),
        design: resumeDesignSchema.optional(),
        sortOrder: z.number().int().optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, "At least one resume field is required."),
  })
  .strict();

export const renameResumeRequestSchema = z.object({ title: z.string().trim().min(1).max(300) }).strict();

export const exportResumeRequestSchema = z
  .object({
    resumeId: resumeIdSchema,
    expectedVersion: z.number().int().nonnegative().optional(),
  })
  .strict();

export const importSourceSchema = z
  .object({
    originalName: z.string().trim().min(1).max(500),
    mimeType: z.enum([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]),
    size: z.number().int().positive().max(15 * 1024 * 1024),
  })
  .strict();

export type CreateResumeRequest = z.infer<typeof createResumeRequestSchema>;
export type UpdateResumeRequest = z.infer<typeof updateResumeRequestSchema>;
export type ExportResumeRequest = z.infer<typeof exportResumeRequestSchema>;
export type ImportSource = z.infer<typeof importSourceSchema>;
