# Phase 2 Security Test Report (template)

Run against the **dev/staging** Supabase project. Record PASS/FAIL + evidence.
Accounts needed: company admin, company member, invited Gmail (member), invited Gmail (guest),
**uninvited** Gmail, suspended user.

## A. SQL-level (Supabase SQL editor; "Run as" an authenticated user, or use `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| A1 | As a **non-admin** (member, guest, uninvited Google user): `select astra_hub_create_invitation('x@gmail.com','admin','<64 hex chars>', now()+interval '1 day');` | `{"ok":false,"error":"not_admin"}` | |
| A2 | Old 5-arg `astra_hub_create_invitation(..., <admin uuid>)` | function does not exist | |
| A3 | Old 3-arg `astra_hub_accept_invitation(hash, uuid, email)` | function does not exist | |
| A4 | As member: `update astra_hub_profiles set role='admin' where id = auth.uid();` | permission denied | |
| A5 | As member: `update astra_hub_profiles set status='active', email='x' ...` | permission denied | |
| A6 | As **anon**: `select astra_hub_create_invitation(...)` / any `astra_hub_*` RPC | permission denied | |
| A7 | As guest: `select * from astra_hub_profiles;` | only self + people sharing a space | |
| A8 | As member: `select * from astra_hub_profiles;` | no recursion error; active directory | |
| A9 | As member: `select astra_hub_set_user_status('<other>','suspended');` | `not_admin` | |
| A10 | As admin: suspend self | `cannot_suspend_self` | |
| A11 | As non-sender: `astra_hub_notify_message_recipients(<msg>, ...)` | `not_message_sender` | |
| A12 | Storage: member of channel A reads/uploads under `channel/<B-uuid>/...` | denied | |

## B. End-to-end (browser)

| # | Test | Expected | Result |
|---|------|----------|--------|
| B1 | Admin invites company email; invitee accepts with that account | lands on /dashboard, role = invited role | |
| B2 | Invited Gmail accepts with a **different** Google account | `email_mismatch`, signed out, no profile | |
| B3 | Reuse the same invite link after acceptance | `invitation_not_found_or_used` | |
| B4 | Expired invitation (set `expires_at` in the past) | `invitation_expired` | |
| B5 | Revoked invitation | `invitation_not_found_or_used` | |
| B6 | Uninvited Gmail signs in | `not_invited`, signed out | |
| B7 | Suspended user signs in | `suspended`, signed out | |
| B8 | Suspend a signed-in user | next request bounced to /login | |
| B9 | `/auth/callback?code=x&next=//evil.com` and `next=https://evil.com` | redirects only to same-origin path | |
| B10 | Member opens /admin/invitations | redirected to /dashboard | |
| B11 | Invite `someone@astragroupph.com.evil.com` / `@gmail.com.evil.com` | `email_domain_not_allowed` | |
| B12 | Service-role key absent from client bundle (`grep -r` `.next/static`) | not found | |
