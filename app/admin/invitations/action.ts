import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiry,
} from "@/lib/invitation-token";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createInvitationAction(formData: FormData) {
  const admin = await requireRole("admin");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "member") as
    | "admin"
    | "member"
    | "guest";

  if (!email || !["admin", "member", "guest"].includes(role)) {
    return { ok: false as const, error: "invalid_input" };
  }

  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = invitationExpiry(7);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_create_invitation", {
    p_email: email,
    p_role: role,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
    p_invited_by: admin.id,
  });

  if (error || !data?.ok) {
    return {
      ok: false as const,
      error: data?.error ?? error?.message ?? "create_failed",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const link = `${appUrl}/accept-invitation?token=${encodeURIComponent(rawToken)}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: "You're invited to Astra Team Hub",
      html: `
        <p>You have been invited to Astra Team Hub as <strong>${role}</strong>.</p>
        <p>This invitation expires on ${expiresAt.toUTCString()}.</p>
        <p><a href="${link}">Accept invitation</a></p>
        <p>If you did not expect this email, you can ignore it.</p>
      `,
    });
  } catch (e) {
    // Invitation row exists; admin can resend. Surface error without leaking token.
    return { ok: false as const, error: "email_send_failed" };
  }

  revalidatePath("/admin/invitations");
  return { ok: true as const, invitationId: data.invitation_id };
}

export async function revokeInvitationAction(invitationId: string) {
  const admin = await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("astra_hub_revoke_invitation", {
    p_invitation_id: invitationId,
    p_actor_id: admin.id,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? "revoke_failed" };
  }
  revalidatePath("/admin/invitations");
  return { ok: true as const };
}
