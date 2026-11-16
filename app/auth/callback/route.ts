import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/invitation-token";
import { safeInternalPath } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

const INVITE_COOKIE = "astra_invite";

export async function GET(request: NextRequest) {
  const origin = publicEnv.appUrl();
  const fail = (code: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(code)}`);

  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));
  if (!code) return fail("oauth");

  const jar = await cookies();
  const inviteToken = jar.get(INVITE_COOKIE)?.value;
  jar.delete(INVITE_COOKIE); // single use, whatever happens next

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return fail("oauth");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    await supabase.auth.signOut();
    return fail("oauth");
  }

  // Invitation acceptance. Identity + email are derived inside the RPC from the session.
  if (inviteToken) {
    const { data, error } = await supabase.rpc("astra_hub_accept_invitation", {
      p_token_hash: hashInvitationToken(inviteToken),
    });
    if (!error && data?.ok) return NextResponse.redirect(`${origin}/dashboard`);
    if (data?.error !== "already_active") {
      await supabase.auth.signOut();
      return fail(data?.error ?? "invite_failed");
    }
    // already_active: fall through to normal sign-in
  }

  const { data: profile } = await supabase
    .from("astra_hub_profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return fail(profile?.status === "suspended" ? "suspended" : "not_invited");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
