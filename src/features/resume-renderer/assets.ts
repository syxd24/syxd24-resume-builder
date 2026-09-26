import "server-only";

import type { ResumeDocument } from "@/domain/resume";
import { getServerSupabaseClient } from "@/data/supabase/server";

export function collectResumeAssetPaths(document: ResumeDocument): string[] {
  const paths = new Set<string>();
  if (document.personal.photo?.storagePath) paths.add(document.personal.photo.storagePath);
  for (const section of document.sections) {
    if (section.type === "declaration" && section.signatureStoragePath) paths.add(section.signatureStoragePath);
  }
  return [...paths];
}

export async function createResumeAssetUrls(document: ResumeDocument): Promise<Record<string, string>> {
  const paths = collectResumeAssetPaths(document);
  if (!paths.length) return {};
  const { data, error } = await getServerSupabaseClient().storage.from("resume-assets").createSignedUrls(paths, 5 * 60);
  if (error) throw new Error("Resume assets could not be loaded.", { cause: error });
  return Object.fromEntries(data.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}
