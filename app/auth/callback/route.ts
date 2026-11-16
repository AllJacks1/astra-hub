/**
 * Example: src/app/auth/callback/route.ts
 * Adapt cookie handling to your @supabase/ssr version.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/invitation-token";
import { safeInternalPath } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"));
  const intent = searchParams.get("intent"); // e.g. "accept"
  const token = searchParams.get("token"); // optional if passed through OAuth state

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Invitation acceptance path
  if (intent === "accept" && token) {
    const tokenHash = hashInvitationToken(token);
    const { data } = await supabase.rpc("astra_hub_accept_invitation", {
      p_token_hash: tokenHash,
      p_user_id: user.id,
      p_user_email: user.email,
    });

    if (!data?.ok) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(data?.error ?? "invite_failed")}`
      );
    }
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Normal sign-in: must already have an active profile
  const { data: profile } = await supabase
    .from("astra_hub_profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_invited`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
