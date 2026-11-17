# Phase 3 Security Test Report (template)

Gate: **an outsider cannot read private content by ID guessing.** Record PASS/FAIL + evidence.
Accounts: admin, member A, member B, member C (not in the private channel / DM), guest (assigned one channel), suspended user.

## Setup
Apply `20261117000001_phase3_hardening_and_realtime.sql`. Supabase Dashboard → Realtime → Settings: turn **OFF "Allow public access"** (private topics only). Run `scripts/seed-mandatory-channel.sql`.

## A. Data isolation (browser: open the URL directly while signed in as the outsider)

| # | Test | Expected | Result |
|---|------|----------|--------|
| A1 | Member C opens `/channels/<private-id>` | 404 (or "not a member" for admin) | |
| A2 | Member C opens `/messages/<A↔B DM id>` | 404 | |
| A3 | Member C opens `/messages/<group DM id> they're not in` | 404 | |
| A4 | Guest opens `/channels/<public-id>` | "not a member", no messages, no join button | |
| A5 | Guest visits `/channels`, `/messages/new` | redirected to /dashboard | |
| A6 | Guest opens `/people` | only people sharing a space with them | |
| A7 | Admin opens A↔B DM id | 404 (admin does NOT auto-gain DM content) | |
| A8 | Suspended user (existing session) | bounced to /login | |

## B. SQL / API level (as the outsider's JWT)

| # | Test | Expected | Result |
|---|------|----------|--------|
| B1 | `select * from astra_hub_messages where channel_id='<private>'` | 0 rows | |
| B2 | `select astra_hub_send_message('<private>', null, 'x')` | `not_channel_member` | |
| B3 | Direct `insert into astra_hub_messages ...` / `update ... set body=` | permission denied | |
| B4 | `select astra_hub_join_public_channel('<private-id>')` | `not_public` | |
| B5 | Guest: `astra_hub_join_public_channel`, `astra_hub_get_or_create_direct`, `astra_hub_create_group_dm` | `guests_cannot_join` / `guests_cannot_start_dm` / `guests_cannot_create_group_dm` | |
| B6 | Member: DM a guest / add a guest to a group | `only_admin_can_dm_guest` / `only_admin_can_add_guest` | |
| B7 | Member: `astra_hub_create_channel(...)` | `not_admin` | |
| B8 | Leave the mandatory channel | `cannot_leave_mandatory` | |
| B9 | Edit own message at 14 min vs 16 min | ok / `edit_window_expired` | |
| B10 | Edit/delete someone else's message | `not_author` | |
| B11 | Group DM: try to add/remove members after creation | no RPC exists; direct writes denied | |
| B12 | Two `get_or_create_direct` calls A→B and B→A | same conversation id | |
| B13 | Create group with < 2 others / > 19 others | `need_two_others` / `too_many_members` | |

## C. Realtime

| # | Test | Expected | Result |
|---|------|----------|--------|
| C1 | Outsider subscribes (browser console, anon+user JWT) to private topic `channel:<private-id>` | subscription rejected / no events | |
| C2 | Outsider subscribes to `conversation:<A↔B id>` | rejected / no events | |
| C3 | Outsider joins a *non-private* channel with that topic name | no events (public access disabled) | |
| C4 | A sends; B (same channel) sees it without refresh | appears < 2s | |
| C5 | A edits; A deletes | B sees the edit; B sees it disappear | |
| C6 | A types | B sees "A is typing…" for ~3s only | |
| C7 | Presence | B sees A online; A closes tab → offline | |
| C8 | New invitee (member) accepts | auto-joined to announcements | |
| C9 | Message payloads on the wire | contain ids only, never body text | |
| C10 | 40+ messages: "Load older messages" | pages back without duplicates | |
