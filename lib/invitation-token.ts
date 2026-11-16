/**
 * Invitation token helpers — server only.
 * Copy into src/lib/invitation-token.ts
 */
import { createHash, randomBytes } from "crypto";

const SECRET = process.env.INVITATION_TOKEN_SECRET;
if (!SECRET) {
  // Fail at module load on server if missing (or validate in env.ts)
  console.warn("INVITATION_TOKEN_SECRET is not set");
}

/** High-entropy raw token for the email link */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Stable hash stored in DB — never store the raw token */
export function hashInvitationToken(rawToken: string): string {
  if (!SECRET) throw new Error("INVITATION_TOKEN_SECRET missing");
  return createHash("sha256").update(rawToken).update(SECRET).digest("hex");
}

export function invitationExpiry(days = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
