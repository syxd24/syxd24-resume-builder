import "server-only";

import { z } from "zod";

const serverEnvSchema = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    APP_ACCESS_SECRET: z.string().min(1).optional(),
    VERCEL_AUTOMATION_BYPASS_SECRET: z.string().min(1).optional(),
    APP_URL: z.string().url().default("http://localhost:3000"),
  })
  .strict();

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse({
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      APP_ACCESS_SECRET: process.env.APP_ACCESS_SECRET || undefined,
      VERCEL_AUTOMATION_BYPASS_SECRET: process.env.VERCEL_AUTOMATION_BYPASS_SECRET || undefined,
      APP_URL: process.env.APP_URL,
    });
  }

  return cachedEnv;
}
