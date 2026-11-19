"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

// Not exported: a "use server" file may only export async functions (it broke the build).
const INVITE_COOKIE = "astra_invite";

/** Starts Google OAuth. An invitation token (if any) rides in an httpOnly cookie, not the URL. */
export async function signInWithGoogle(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const jar = await cookies();

  if (token && token.length <= 200) {
    jar.set(INVITE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
  } else {
    jar.delete(INVITE_COOKIE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicEnv.appUrl()}/auth/callback`,
      scopes: "openid email profile",
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
