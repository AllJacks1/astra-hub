"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isUuid, type Target } from "@/lib/messaging/validate";

type Result = { ok: true; messageId?: string } | { ok: false; error: string };

function parentParams(t: Target) {
  return t.kind === "channel"
    ? { p_channel_id: t.id, p_conversation_id: null }
    : { p_channel_id: null, p_conversation_id: t.id };
}

export async function sendMessageAction(target: Target, body: string): Promise<Result> {
  await requireProfile();
  if (!isUuid(target?.id) || (target.kind !== "channel" && target.kind !== "conversation"))
    return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_send_message", {
    ...parentParams(target),
    p_body: String(body ?? ""),
  });
  if (error || !data?.ok) return { ok: false, error: data?.error ?? "send_failed" };
  return { ok: true, messageId: data.message_id as string };
}

export async function editMessageAction(messageId: string, body: string): Promise<Result> {
  await requireProfile();
  if (!isUuid(messageId)) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_edit_message", {
    p_message_id: messageId,
    p_body: String(body ?? ""),
  });
  if (error || !data?.ok) return { ok: false, error: data?.error ?? "edit_failed" };
  return { ok: true };
}

export async function deleteMessageAction(messageId: string): Promise<Result> {
  await requireProfile();
  if (!isUuid(messageId)) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_soft_delete_message", { p_message_id: messageId });
  if (error || !data?.ok) return { ok: false, error: data?.error ?? "delete_failed" };
  return { ok: true };
}

export async function markReadAction(target: Target): Promise<void> {
  await requireProfile();
  if (!isUuid(target?.id)) return;
  const supabase = await createClient();
  if (target.kind === "channel") await supabase.rpc("astra_hub_mark_channel_read", { p_channel_id: target.id });
  else await supabase.rpc("astra_hub_mark_conversation_read", { p_conversation_id: target.id });
  revalidatePath("/", "layout"); // refresh sidebar unread badges
}

export async function joinChannelAction(formData: FormData) {
  await requireProfile();
  const id = String(formData.get("channelId") ?? "");
  if (!isUuid(id)) redirect("/channels?error=invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_join_public_channel", { p_channel_id: id });
  if (error || !data?.ok) redirect(`/channels?error=${encodeURIComponent(data?.error ?? "join_failed")}`);
  revalidatePath("/", "layout");
  redirect(`/channels/${id}`);
}

export async function leaveChannelAction(formData: FormData) {
  await requireProfile();
  const id = String(formData.get("channelId") ?? "");
  if (!isUuid(id)) redirect("/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_leave_channel", { p_channel_id: id });
  if (error || !data?.ok) redirect(`/channels/${id}?error=${encodeURIComponent(data?.error ?? "leave_failed")}`);
  revalidatePath("/", "layout");
  redirect("/channels");
}

export async function startDirectAction(formData: FormData) {
  await requireProfile();
  const other = String(formData.get("otherUserId") ?? "");
  if (!isUuid(other)) redirect("/people?error=invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_get_or_create_direct", { p_other_user_id: other });
  if (error || !data?.ok) redirect(`/people?error=${encodeURIComponent(data?.error ?? "dm_failed")}`);
  revalidatePath("/", "layout");
  redirect(`/messages/${data.conversation_id}`);
}

export async function createGroupDmAction(formData: FormData) {
  await requireProfile();
  const ids = formData.getAll("memberIds").map(String).filter(isUuid);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_create_group_dm", {
    p_title: String(formData.get("title") ?? ""),
    p_member_ids: ids,
  });
  if (error || !data?.ok) redirect(`/messages/new?error=${encodeURIComponent(data?.error ?? "group_failed")}`);
  revalidatePath("/", "layout");
  redirect(`/messages/${data.conversation_id}`);
}
