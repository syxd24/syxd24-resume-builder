import "server-only";

import { getServerSupabaseClient } from "@/data/supabase/server";

const MANAGED_PHOTO_PATH = /^resumes\/[0-9a-f-]{36}\/photo\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i;

/**
 * Removes a photo only after its resume reference has changed and no other
 * resume (including a duplicate) still points at the same private object.
 */
export async function removePhotoIfUnreferenced(storagePath: string | undefined): Promise<boolean> {
  if (!storagePath || !MANAGED_PHOTO_PATH.test(storagePath)) return false;

  const client = getServerSupabaseClient();
  const reference = await client
    .from("resumes")
    .select("id")
    .contains("content", { personal: { photo: { storagePath } } })
    .limit(1)
    .maybeSingle();

  if (reference.error) throw new Error("The previous photo reference could not be checked.", { cause: reference.error });
  if (reference.data) return false;

  const removed = await client.storage.from("resume-assets").remove([storagePath]);
  if (removed.error) throw new Error("The previous photo could not be removed.", { cause: removed.error });
  return true;
}
