import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function filesBelow(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

describe("Supabase browser boundary and migration hardening", () => {
  it("does not expose secret configuration through public environment variables or client imports", () => {
    const environment = readFileSync(resolve("src/config/env.ts"), "utf8");
    expect(environment).toContain("SUPABASE_SECRET_KEY");
    expect(environment).not.toMatch(/NEXT_PUBLIC_.*SUPABASE|VITE_.*SUPABASE|PUBLIC_.*SUPABASE/);

    const clientFiles = filesBelow(resolve("src"))
      .filter((path) => /\.(ts|tsx)$/.test(path))
      .filter((path) => readFileSync(path, "utf8").includes('"use client"'));
    for (const path of clientFiles) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toMatch(/@\/data\/supabase|@\/config\/env|SUPABASE_SECRET_KEY|service_role|sb_secret_/i);
    }
  });

  it("finds no Supabase secret markers in the built browser chunks", () => {
    const chunks = filesBelow(resolve(".next/static")).filter((path) => /\.(js|json)$/.test(path));
    expect(chunks.length).toBeGreaterThan(0);
    const browserBundle = chunks.map((path) => readFileSync(path, "utf8")).join("\n");
    expect(browserBundle).not.toMatch(/SUPABASE_SECRET_KEY|service_role|sb_secret_|nfivvjwpxyelnrdayhbf/i);
    expect(browserBundle).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/);
  });

  it("reproduces RLS, revoked browser grants, private buckets, and hardened function grants", () => {
    const initial = readFileSync(resolve("supabase/migrations/0001_initial_resume_builder.sql"), "utf8");
    const hardening = readFileSync(resolve("supabase/migrations/0002_harden_function_grants.sql"), "utf8");
    expect(initial).toMatch(/alter table public\.resumes enable row level security/i);
    expect(initial).toMatch(/alter table public\.resume_imports enable row level security/i);
    expect(initial).toMatch(/revoke all on table public\.resumes from anon, authenticated/i);
    expect(initial).toMatch(/revoke all on table public\.resume_imports from anon, authenticated/i);
    expect(initial).toMatch(/'resume-assets', 'resume-assets', false, 5242880/i);
    expect(initial).toMatch(/'resume-imports', 'resume-imports', false, 15728640/i);
    expect(initial).not.toMatch(/create policy/i);
    expect(hardening).toMatch(/revoke execute on function public\.set_updated_at\(\) from public, anon, authenticated/i);
  });
});
