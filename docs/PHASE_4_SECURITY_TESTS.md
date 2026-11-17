# Phase 4 Security Test Report (template)

Gate: **attachment + notification security tests.** Record PASS/FAIL + evidence.
Accounts: admin, member A, member B (A↔B DM), member C (outsider to that DM and to a private channel P), guest.

## Setup
Apply `20261118000001_phase4_attachments_notifications.sql`. Install: `npm i web-push && npm i -D @types/web-push`.
Generate VAPID keys: `npx web-push generate-vapid-keys` → `.env.local`. Verify the Resend sender domain.

## A. Attachments

| # | Test | Expected | Result |
|---|------|----------|--------|
| A1 | A sends a JPG, PNG, PDF, DOCX, CSV, MP4 in a DM | all appear for B; images preview inline | |
| A2 | Attach 11 files | client blocks at 10; direct RPC → `attachment_limit_exceeded` | |
| A3 | 21 MB file | client rejects; direct upload to Storage rejected (bucket limit) | |
| A4 | `.svg`, `.zip`, `.exe`, `.html` | rejected client-side, by bucket MIME list, and by `register_attachment` | |
| A5 | Photo from an iPhone (HEIC source) | arrives as JPEG | |
| A6 | C requests a signed URL for A↔B attachment id (call `signAttachmentsAction`/`signDownloadAction` with that id) | no URL returned | |
| A7 | C downloads storage object by path via the Storage API with C's JWT | denied (storage SELECT policy) | |
| A8 | C uploads to `conversation/<A↔B id>/<any msg id>/<uuid>.png` | denied (not a member) | |
| A9 | A uploads to a *different* space's folder, or to a message A didn't author | denied (storage INSERT policy) | |
| A10 | A calls `astra_hub_register_attachment` with a path from another channel/message | `invalid_storage_path` | |
| A11 | A registers an object uploaded by someone else | `not_object_owner` | |
| A12 | A registers a nonexistent path | `object_not_found` | |
| A13 | A attaches to their own message >10 minutes old | `attach_window_expired` | |
| A14 | A upload with `contentType: text/html` | rejected by bucket MIME list | |
| A15 | Signed URL after 5 min (image) / 60 s (download) | expired; images re-sign automatically | |
| A16 | Delete a message with attachments | disappears for B; attachment no longer readable via RLS | |
| A17 | Bucket is private | `https://<ref>.supabase.co/storage/v1/object/public/astra-hub-attachments/...` → 400/404 | |
| A18 | Attachment-only message, all uploads fail | no empty ghost message left behind | |

## B. Notifications / email / push

| # | Test | Expected | Result |
|---|------|----------|--------|
| B1 | A DMs B | B gets in-app notification, push (if enabled), and one email | |
| B2 | A posts a normal channel message | **no** notification, **no** email, **no** push | |
| B3 | A @mentions B in a channel | B gets notification + email + push | |
| B4 | A @mentions C, who is not in the channel | no notification for C | |
| B5 | A calls `astra_hub_notify_message_recipients` for B's message | `not_message_sender` | |
| B6 | Same sender calls notify twice for one message | second is a no-op (`already_notified`) | |
| B7 | A's own message | A receives nothing | |
| B8 | 5 quick DMs from A to B | one email (15-min cooldown), 5 in-app | |
| B9 | B turns off email alerts in Settings | no email; in-app/push continue | |
| B10 | Message text contains `<script>`/HTML | escaped in email, notification page, push | |
| B11 | B (suspended) | no email/push | |
| B12 | C tries to read B's notifications via the API | 0 rows | |
| B13 | B tries to update `title` or `user_id` on own notification | permission denied (only `read_at` writable) | |
| B14 | B tries to insert into `astra_hub_push_subscriptions` directly | permission denied (RPC only) | |
| B15 | C subscribes to realtime topic `user:<B id>` | rejected / no events | |
| B16 | A client tries to *send* on `user:<B id>` | rejected | |
| B17 | Notification click opens the right DM/channel | yes; read marks | |
| B18 | Push for a DM while the app is open and visible | no OS popup; in-app badge updates | |
| B19 | Expired/unsubscribed push endpoint (410) | subscription auto-revoked | |
| B20 | Secrets | `VAPID_PRIVATE_KEY`, `RESEND_API_KEY` absent from `.next/static` | |
| B21 | Guest in an assigned channel is @mentioned by an admin | notified (channel member) | |
