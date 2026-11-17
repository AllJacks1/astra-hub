"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function setEmailNotificationsAction(formData: FormData) {
  const me = await requireProfile();
  const supabase = await createClient();
  // Column-level grant + RLS: a user can change only their own email_notifications.
  await supabase
    .from("astra_hub_profiles")
    .update({ email_notifications: formData.get("enabled") === "on" })
    .eq("id", me.id);
  revalidatePath("/settings");
}

type Sub = { endpoint: string; p256dh: string; auth: string };

export async function savePushSubscriptionAction(sub: Sub): Promise<{ ok: boolean }> {
  await requireProfile();
  const ok =
    typeof sub?.endpoint === "string" && sub.endpoint.startsWith("https://") && sub.endpoint.length < 2048 &&
    typeof sub.p256dh === "string" && sub.p256dh.length < 256 &&
    typeof sub.auth === "string" && sub.auth.length < 256;
  if (!ok) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_upsert_push_subscription", {
    p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth,
  });
  return { ok: !error && Boolean(data?.ok) };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<{ ok: boolean }> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_revoke_push_subscription", { p_endpoint: String(endpoint ?? "") });
  return { ok: !error && Boolean(data?.ok) };
}
