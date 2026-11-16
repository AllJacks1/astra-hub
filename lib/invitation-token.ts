import "server-only";
import { createHmac, randomBytes } from "crypto";
import { serverEnv } from "@/lib/env.server";

/** 256-bit random token for the email link. */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Keyed hash stored in the DB. The raw token is never persisted. */
export function hashInvitationToken(rawToken: string): string {
  return createHmac("sha256", serverEnv.invitationTokenSecret()).update(rawToken).digest("hex");
}

export function invitationExpiry(days = 7): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
