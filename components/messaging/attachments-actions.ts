"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth";
import { isAllowedFile, randomStorageName, MAX_FILES_PER_MESSAGE } from "@/lib/file-allowlist";

const BUCKET = "astra-hub-attachments";

export async function uploadAttachmentAction(input: {
  messageId: string;
  channelId?: string;
  conversationId?: string;
  formData: FormData;
}) {
  const user = await requireActiveUser();
  const file = input.formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, error: "no_file" };
  }

  const check = isAllowedFile(file);
  if (!check.ok) return { ok: false as const, error: check.error };

  const supabase = await createClient();

  // Optional: pre-count attachments
  const { count } = await supabase
    .from("astra_hub_message_attachments")
    .select("*", { count: "exact", head: true })
    .eq("message_id", input.messageId);
  if ((count ?? 0) >= MAX_FILES_PER_MESSAGE) {
    return { ok: false as const, error: "attachment_limit_exceeded" };
  }

  const objectName = randomStorageName(file.name);
  const folder = input.channelId
    ? `channels/${input.channelId}/${input.messageId}`
    : `conversations/${input.conversationId}/${input.messageId}`;
  const path = `${folder}/${objectName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false as const, error: "upload_failed" };
  }

  const { data, error } = await supabase.rpc("astra_hub_register_attachment", {
    p_message_id: input.messageId,
    p_storage_path: path,
    p_original_file_name: file.name,
    p_mime_type: file.type,
    p_file_size: file.size,
  });

  if (error || !data?.ok) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false as const, error: data?.error ?? "register_failed" };
  }

  return { ok: true as const, attachmentId: data.attachment_id as string };
}

/** Short-lived signed URL after RLS proves access */
export async function getAttachmentSignedUrlAction(attachmentId: string) {
  await requireActiveUser();
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("astra_hub_message_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false as const, error: "not_found_or_denied" };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 120); // 2 minutes

  if (signError || !signed?.signedUrl) {
    return { ok: false as const, error: "sign_failed" };
  }

  return { ok: true as const, url: signed.signedUrl };
}
