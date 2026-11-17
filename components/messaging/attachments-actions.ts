"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isUuid } from "@/lib/messaging/validate";

const BUCKET = "astra-hub-attachments";

/**
 * Files are uploaded straight from the browser to Storage (a server action cannot carry
 * 20 MB). This only records metadata; the database verifies the stored object itself.
 */
export async function registerAttachmentAction(input: {
  messageId: string;
  path: string;
  name: string;
  mime: string;
  size: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireProfile();
  if (!isUuid(input?.messageId)) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_register_attachment", {
    p_message_id: input.messageId,
    p_storage_path: String(input.path ?? ""),
    p_original_file_name: String(input.name ?? "").slice(0, 255),
    p_mime_type: String(input.mime ?? ""),
    p_file_size: Number(input.size) || 0,
  });
  if (error || !data?.ok) return { ok: false, error: data?.error ?? "register_failed" };
  return { ok: true };
}

/**
 * Short-lived signed URLs for inline image previews. Access is proven by RLS twice:
 * the attachment row (membership of the parent) and the storage object policy.
 */
export async function signAttachmentsAction(
  ids: string[],
): Promise<{ ok: true; urls: Record<string, string>; expiresIn: number } | { ok: false; error: string }> {
  await requireProfile();
  const clean = (ids ?? []).filter(isUuid).slice(0, 50);
  if (!clean.length) return { ok: true, urls: {}, expiresIn: 300 };

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("astra_hub_message_attachments")
    .select("id, storage_path")
    .in("id", clean);
  if (!rows?.length) return { ok: true, urls: {}, expiresIn: 300 };

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 300);
  if (error || !signed) return { ok: false, error: "sign_failed" };

  const byPath = new Map(rows.map((r) => [r.storage_path as string, r.id as string]));
  const urls: Record<string, string> = {};
  for (const s of signed) {
    const id = s.path ? byPath.get(s.path) : undefined;
    if (id && s.signedUrl) urls[id] = s.signedUrl;
  }
  return { ok: true, urls, expiresIn: 300 };
}

/** One-shot download link (forces Content-Disposition: attachment), valid 60 seconds. */
export async function signDownloadAction(
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireProfile();
  if (!isUuid(id)) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("astra_hub_message_attachments")
    .select("storage_path, original_file_name")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "not_found" };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.original_file_name });
  if (error || !data?.signedUrl) return { ok: false, error: "sign_failed" };
  return { ok: true, url: data.signedUrl };
}
