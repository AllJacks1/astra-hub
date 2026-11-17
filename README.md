# Astra Team Hub

Private, invite-only team communications app (Next.js + Supabase). See
`ASTRA_TEAM_HUB_PROJECT_AND_BUILD.md`, `PRODUCT_POLICY.md` and `docs/` for the full spec.

## Status
- Phase 1 foundation: code written, needs `npm install` + env + first run.
- Phase 2 auth/invitations: code written, needs the security test report (`docs/PHASE_2_SECURITY_TESTS.md`).
- Phase 3 channels/DMs/realtime: code written, needs `docs/PHASE_3_SECURITY_TESTS.md` gate.
- Phases 4–6: schema exists; app code for attachments/notifications/push/PWA/deploy not yet built.

## Local setup
```bash
npm install
npm install @supabase/ssr @supabase/supabase-js resend server-only   # missing from package.json
cp .env.example .env.local                                           # fill in values
npm run dev
```

## Supabase
1. Create a project (Astra-owned account). Auth > Providers: enable **Google**; add the Google OAuth client id/secret.
2. Auth > URL configuration: Site URL = `NEXT_PUBLIC_APP_URL`; add redirect URL `<APP_URL>/auth/callback`.
3. Apply migrations in order (`npx supabase db push`, or paste into the SQL editor):
   - `20261113000000_baseline_phase1_to_4.sql`
   - `20261116000001_security_hardening.sql`  ← **required**: fixes privilege escalation in the baseline
   - `20261117000001_phase3_hardening_and_realtime.sql`  ← Phase 3: private realtime, DM rules, mandatory-channel auto-join
   - Then Dashboard → Realtime → Settings: turn OFF "Allow public access"
4. Generate types (`scripts/generate-types.sh`) — `lib/types/database.types.ts` predates these migrations.
5. Create the first admin: sign in once with Google (you'll be shown "not invited"), then
   `ADMIN_EMAIL=you@astragroupph.com node scripts/bootstrap-admin.mjs`.
6. Run `scripts/seed-mandatory-channel.sql` once the first admin exists (creates the announcements channel).

## Google Cloud
OAuth client (Web). Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Scopes: openid, email, profile.

## Security notes
- Never use `SUPABASE_SERVICE_ROLE_KEY` in client code; `lib/supabase/admin.ts` imports `server-only`.
- Identity for every privileged RPC comes from `auth.uid()`, never from request parameters.
