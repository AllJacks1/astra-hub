"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isUuid } from "@/lib/messaging/validate";

export async function openNotificationAction(formData: FormData) {
  await requireProfile();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/notifications");
  const supabase = await createClient();

  // RLS: only the owner can see the row. The target ids come from the DB, not the form.
  const { data: n } = await supabase
    .from("astra_hub_notifications")
    .select("id, channel_id, conversation_id")
    .eq("id", id)
    .maybeSingle();
  if (!n) redirect("/notifications");

  await supabase.rpc("astra_hub_mark_notification_read", { p_notification_id: id });
  revalidatePath("/", "layout");
  redirect(n.channel_id ? `/channels/${n.channel_id}` : n.conversation_id ? `/messages/${n.conversation_id}` : "/notifications");
}

export async function markAllNotificationsReadAction() {
  await requireProfile();
  const supabase = await createClient();
  await supabase.rpc("astra_hub_mark_all_notifications_read");
  revalidatePath("/", "layout");
  redirect("/notifications");
}
