"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createChannelAction(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const visibility = String(formData.get("visibility") ?? "private") as
    | "public"
    | "private";
  const isMandatory = formData.get("mandatory") === "on";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_create_channel", {
    p_name: name,
    p_description: description,
    p_visibility: visibility,
    p_is_mandatory: isMandatory,
  });

  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  revalidatePath("/channels");
  revalidatePath("/admin/channels");
  return { ok: true as const, channelId: data.channel_id as string };
}

export async function joinPublicChannelAction(channelId: string) {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_join_public_channel", {
    p_channel_id: channelId,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  revalidatePath(`/channels/${channelId}`);
  return { ok: true as const };
}

export async function sendMessageAction(input: {
  channelId?: string;
  conversationId?: string;
  body: string;
}) {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_send_message", {
    p_channel_id: input.channelId ?? null,
    p_conversation_id: input.conversationId ?? null,
    p_body: input.body,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  return { ok: true as const, messageId: data.message_id as string };
}

export async function editMessageAction(messageId: string, body: string) {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_edit_message", {
    p_message_id: messageId,
    p_body: body,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  return { ok: true as const };
}

export async function softDeleteMessageAction(messageId: string) {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_soft_delete_message", {
    p_message_id: messageId,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  return { ok: true as const };
}

export async function getOrCreateDirectAction(otherUserId: string) {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_get_or_create_direct", {
    p_other_user_id: otherUserId,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  return {
    ok: true as const,
    conversationId: data.conversation_id as string,
    created: Boolean(data.created),
  };
}

export async function createGroupDmAction(title: string, memberIds: string[]) {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_create_group_dm", {
    p_title: title,
    p_member_ids: memberIds,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? error?.message };
  }
  return { ok: true as const, conversationId: data.conversation_id as string };
}
