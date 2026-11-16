import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "member" | "guest";

export type SessionProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: "invited" | "active" | "suspended";
};

/** Only same-origin absolute paths; blocks open redirects (//evil, \, schemes). */
export function safeInternalPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  try {
    const u = new URL(raw, "http://internal.invalid");
    if (u.origin !== "http://internal.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/** Authenticated + ACTIVE profile, or null. getUser() re-validates the JWT. */
export const getCurrentProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("astra_hub_profiles")
    .select("id, email, full_name, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || data.status !== "active") return null;
  return data as SessionProfile;
});

export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Requires an active user whose role is one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

/** Alias used by the Phase 3/4 snippets. */
export const requireActiveUser = requireProfile;
