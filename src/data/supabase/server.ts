import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/config/env";

import type { Database } from "./database.types";

let serverClient: SupabaseClient<Database> | undefined;

export function getServerSupabaseClient(): SupabaseClient<Database> {
  if (!serverClient) {
    const env = getServerEnv();
    serverClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return serverClient;
}
