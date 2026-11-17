import "server-only";
import webpush from "web-push";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/** Only the first email per space within this window; 0 disables the cooldown. */
const EMAIL_COOLDOWN_MINUTES = 15;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 150);

/**
 * Fan out external alerts (Web Push + email) for the notification rows that
 * astra_hub_notify_message_recipients already created. Recipients are therefore exactly
 * the people the database decided may be notified: DM/group participants (never the
 * sender) and validated channel @mentions. Ordinary channel messages never reach here.
 */
export async function deliverNotifications(messageId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: notes } = await admin
    .from("astra_hub_notifications")
    .select("id, user_id, type, title, body_preview, channel_id, conversation_id")
    .eq("message_id", messageId);
  if (!notes?.length) return;

  const userIds = [...new Set(notes.map((n) => n.user_id as string))];
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    admin.from("astra_hub_profiles")
      .select("id, email, full_name, status, email_notifications").in("id", userIds),
    admin.from("astra_hub_push_subscriptions")
      .select("user_id, endpoint, p256dh, auth").in("user_id", userIds).is("revoked_at", null),
  ]);

  let pushReady = false;
  try {
    webpush.setVapidDetails(serverEnv.vapidSubject(), publicEnv.vapidPublicKey(), serverEnv.vapidPrivateKey());
    pushReady = true;
  } catch (e) {
    console.error("[notify] web-push not configured", e);
  }
  const resend = (() => {
    try { return new Resend(serverEnv.resendApiKey()); } catch { return null; }
  })();

  const appUrl = publicEnv.appUrl();

  for (const n of notes) {
    const profile = profiles?.find((p) => p.id === n.user_id);
    if (!profile || profile.status !== "active") continue;

    const path = n.channel_id ? `/channels/${n.channel_id}` : n.conversation_id ? `/messages/${n.conversation_id}` : "/notifications";
    const spaceKey = n.channel_id ? `channel:${n.channel_id}` : `conversation:${n.conversation_id}`;
    const preview = oneLine(n.body_preview ?? "");
    const stamp: { pushed_at?: string; emailed_at?: string } = {};

    // ── Web Push ──
    if (pushReady) {
      const mine = (subs ?? []).filter((s) => s.user_id === n.user_id);
      const payload = JSON.stringify({ title: oneLine(n.title), body: preview, url: path, tag: spaceKey });
      for (const s of mine) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
          stamp.pushed_at = new Date().toISOString();
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await admin.from("astra_hub_push_subscriptions")
              .update({ revoked_at: new Date().toISOString() }).eq("endpoint", s.endpoint).eq("user_id", n.user_id);
          } else {
            console.error("[notify] push failed", status);
          }
        }
      }
    }

    // ── Email (DMs + mentions only; opt-out + per-space cooldown) ──
    if (resend && profile.email_notifications) {
      let allowed = true;
      if (EMAIL_COOLDOWN_MINUTES > 0) {
        const since = new Date(Date.now() - EMAIL_COOLDOWN_MINUTES * 60_000).toISOString();
        let q = admin.from("astra_hub_notifications").select("id").eq("user_id", n.user_id).gt("emailed_at", since).limit(1);
        q = n.channel_id ? q.eq("channel_id", n.channel_id) : q.eq("conversation_id", n.conversation_id);
        const { data: recent } = await q;
        allowed = !recent?.length;
      }
      if (allowed) {
        try {
          const { error } = await resend.emails.send({
            from: serverEnv.resendFrom(),
            to: profile.email,
            subject: oneLine(n.title),
            html: `
              <p><strong>${esc(oneLine(n.title))}</strong></p>
              <p style="white-space:pre-wrap">${esc(preview)}</p>
              <p><a href="${appUrl}${path}">Open in Astra Team Hub</a></p>
              <p style="color:#666;font-size:12px">You can turn email alerts off in <a href="${appUrl}/settings">Settings</a>.</p>`,
          });
          if (error) throw error;
          stamp.emailed_at = new Date().toISOString();
        } catch (e) {
          console.error("[notify] email failed", e);
        }
      }
    }

    if (stamp.pushed_at || stamp.emailed_at) {
      await admin.from("astra_hub_notifications").update(stamp).eq("id", n.id);
    }
  }
}
