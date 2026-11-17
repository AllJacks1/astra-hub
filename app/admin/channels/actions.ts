"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/messaging/validate";

export async function createChannelAction(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const visibility = formData.get("visibility") === "public" ? "public" : "private";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_create_channel", {
    p_name: name,
    p_description: String(formData.get("description") ?? "").slice(0, 300),
    p_visibility: visibility,
    p_is_mandatory: formData.get("mandatory") === "on",
  });
  if (error || !data?.ok) redirect(`/admin/channels?error=${encodeURIComponent(data?.error ?? "create_failed")}`);
  revalidatePath("/", "layout");
  redirect("/admin/channels?created=1");
}

export async function addChannelMemberAction(formData: FormData) {
  await requireRole("admin");
  const channelId = String(formData.get("channelId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!isUuid(channelId) || !isUuid(userId)) redirect("/admin/channels?error=invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_add_channel_member", {
    p_channel_id: channelId,
    p_user_id: userId,
  });
  if (error || !data?.ok) redirect(`/admin/channels?error=${encodeURIComponent(data?.error ?? "add_failed")}`);
  revalidatePath("/", "layout");
  redirect("/admin/channels?added=1");
}
