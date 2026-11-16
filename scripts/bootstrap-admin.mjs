#!/usr/bin/env node
/**
 * One-time: promote the FIRST admin. Run locally with service-role access, then never again.
 *
 *   1. Sign in once with the admin's Google account (you'll be bounced to
 *      "not invited" — that's expected; it creates the auth.users row).
 *   2. ADMIN_EMAIL=you@astragroupph.com node scripts/bootstrap-admin.mjs
 *
 * Refuses to run if an active admin already exists.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!url || !key || !email) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (in .env.local) and ADMIN_EMAIL.");
  process.exit(1);
}
if (!/@astragroupph\.com$/.test(email)) {
  console.error("First admin must be an @astragroupph.com address.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existing } = await admin
  .from("astra_hub_profiles").select("id").eq("role", "admin").eq("status", "active").limit(1);
if (existing?.length) {
  console.error("An active admin already exists. Use the Admin > Invitations page instead.");
  process.exit(1);
}

let user = null;
for (let page = 1; !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error(error.message); process.exit(1); }
  user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No auth user for ${email}. Sign in with Google once first, then re-run.`);
  process.exit(1);
}

const { error } = await admin.from("astra_hub_profiles").upsert(
  {
    id: user.id,
    email,
    role: "admin",
    status: "active",
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split("@")[0],
  },
  { onConflict: "id" },
);
if (error) { console.error(error.message); process.exit(1); }

await admin.from("astra_hub_audit_log").insert({
  actor_id: user.id, action: "bootstrap_admin", target_type: "profile", target_id: user.id, metadata: { email },
});
console.log(`Admin ready: ${email}`);
