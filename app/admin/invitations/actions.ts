"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { generateInvitationToken, hashInvitationToken, invitationExpiry } from "@/lib/invitation-token";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

const ROLES = ["admin", "member", "guest"] as const;
type InviteRole = (typeof ROLES)[number];

const back = (q: string): never => redirect(`/admin/invitations?${q}`);

export async function createInvitationAction(formData: FormData) {
  await requireRole("admin"); // UI gate; the RPC re-checks admin from the session
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as InviteRole;
  if (!email || !ROLES.includes(role)) back("error=invalid_input");

  const rawToken = generateInvitationToken();
  const expiresAt = invitationExpiry(7);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_create_invitation", {
    p_email: email,
    p_role: role,
    p_token_hash: hashInvitationToken(rawToken),
    p_expires_at: expiresAt.toISOString(),
  });
  if (error || !data?.ok) back(`error=${encodeURIComponent(data?.error ?? "create_failed")}`);

  const link = `${publicEnv.appUrl()}/accept-invitation?token=${encodeURIComponent(rawToken)}`;
  try {
    const { error: sendError } = await new Resend(serverEnv.resendApiKey()).emails.send({
      from: serverEnv.resendFrom(),
      to: email,
      subject: "You're invited to Astra Team Hub",
      html: `
        <p>You have been invited to Astra Team Hub as <strong>${role}</strong>.</p>
        <p>Sign in with this Google account (${email}). The invitation expires on ${expiresAt.toUTCString()}.</p>
        <p><a href="${link}">Accept invitation</a></p>
        <p>If you did not expect this email, you can ignore it.</p>`,
    });
    if (sendError) throw sendError;
  } catch {
    // Row exists but the raw token is gone: admin re-invites (which revokes the old one).
    back("error=email_send_failed");
  }

  revalidatePath("/admin/invitations");
  back("sent=1");
}

export async function revokeInvitationAction(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_revoke_invitation", { p_invitation_id: id });
  revalidatePath("/admin/invitations");
  if (error || !data?.ok) back(`error=${encodeURIComponent(data?.error ?? "revoke_failed")}`);
  back("revoked=1");
}
