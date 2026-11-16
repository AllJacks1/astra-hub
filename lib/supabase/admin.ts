import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Service-role client. BYPASSES RLS. Server-only (the import above fails the
 * build if this file reaches a client bundle). Use sparingly, after your own
 * authorization check.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
