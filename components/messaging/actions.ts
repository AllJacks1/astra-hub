"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { deliverNotifications } from "@/lib/notifications/deliver";
import { isUuid, type Target } from "@/lib/messaging/validate";

type Result = { ok: true; messageId?: string } | { ok: false; error: string };

function parentParams(t: Target) {
  return t.kind === "channel"
    ? { p_channel_id: t.id, p_conversation_id: null }
    : { p_channel_id: null, p_conversation_id: t.id };
}

export async function sendMessageAction(
  target: Target,
  body: string,
  opts: { mentionIds?: string[]; hasAttachments?: boolean } = {},
): Promise<Result> {
  const me = await requireProfile();
  if (!isUuid(target?.id) || (target.kind !== "channel" && target.kind !== "conversation"))
    return { ok: false, error: "invalid_input" };
  const text = String(body ?? "").trim();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("astra_hub_send_message", {
    ...parentParams(target),
    p_body: text,
    p_expect_attachments: Boolean(opts.hasAttachments),
  });
  if (error || !data?.ok) return { ok: false, error: data?.error ?? "send_failed" };
  const messageId = data.message_id as string;

  // In-app notifications (DM/group participants, or validated channel mentions only).
  // Runs after the response is sent: the sender sees their message without waiting on
  // mention lookups and notification RPCs.
  after(async () => {
    try {
      const senderName = me.full_name || me.email.split("@")[0];
      const preview = text ? text.slice(0, 140) : "Sent an attachment";
      let title = senderName;
      let mentionIds: string[] | null = null;

      if (target.kind === "channel") {
        // Keep only ids that are really @-mentioned in the text (names resolved server-side via RLS).
        const wanted = (opts.mentionIds ?? []).filter(isUuid).slice(0, 10);
        if (wanted.length && text) {
          const { data: people } = await supabase
            .from("astra_hub_profiles").select("id, full_name, email").in("id", wanted);
          mentionIds = (people ?? [])
            .filter((p) => text.includes(`@${p.full_name || p.email.split("@")[0]}`))
            .map((p) => p.id as string);
        }
        if (mentionIds?.length) {
          const { data: ch } = await supabase.from("astra_hub_channels").select("name").eq("id", target.id).maybeSingle();
          title = `${senderName} mentioned you in #${ch?.name ?? "a channel"}`;
        }
      }

      if (target.kind === "conversation" || mentionIds?.length) {
        await supabase.rpc("astra_hub_notify_message_recipients", {
          p_message_id: messageId,
          p_title: title,
          p_body_preview: preview,
          p_mention_user_ids: mentionIds,
        });
        try { await deliverNotifications(messageId); } catch (e) { console.error("[notify] deliver failed", e); }
      }
    } catch (e) {
      console.error("[notify] failed", e); // never fail the send because of an alert
    }
  });

  return { ok: true, messageId };
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
  // No revalidatePath here: the client clears the badge locally (useMarkSpaceRead), so a
  // read no longer re-renders the whole layout and re-downloads the sidebar.
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
