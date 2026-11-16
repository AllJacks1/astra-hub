# Astra Team Hub --- Phase 4: Attachments, Notifications, and Resend

## Purpose

Implement secure photo/document sharing, in-app notifications, unread
counts, and browser push notifications. Use Resend for invitation emails
and optional email alerts.

**Prerequisite:** Phase 3 messaging and conversation authorization must
be complete.

## 1. Secure attachments

### Storage

Create a private Supabase Storage bucket, for example
`team-hub-attachments`.

Do not make the bucket public. Do not store permanent public URLs in
message records.

Suggested object path:

``` text
channels/{channel_id}/{message_id}/{random-file-name}
conversations/{conversation_id}/{message_id}/{random-file-name}
```

Use generated object names rather than trusting user-provided filenames.
Store the original filename separately as metadata.

### Allowed file types

Initial pilot allowlist:

-   Images: JPEG, PNG, WEBP.
-   Documents: PDF.

Optionally add other formats only after confirming business need and
safe preview/download behavior.

### File size

Choose and document a limit appropriate to the Supabase plan and pilot
needs. A suggested initial cap is 10 MB per file, subject to final
storage configuration and business approval.

### Upload workflow

1.  User selects a file.
2.  Client performs preliminary size/type checks for usability.
3.  Server verifies the authenticated active user.
4.  Server verifies access to the target channel/conversation.
5.  Upload is performed using a user-scoped Supabase client and Storage
    RLS, or a tightly scoped server operation.
6.  Insert attachment metadata.
7.  Send a message referencing the attachment.
8.  Display a short-lived signed URL only after verifying the requester
    can access the parent message.
9.  Handle failed uploads and orphaned objects safely.

Do not rely only on client-side MIME checks. Validate the extension,
declared MIME type, size, and where practical inspect file signatures.
Consider malware scanning before expanding file types or usage.

### Metadata table

Suggested `message_attachments` fields:

-   `id`
-   `message_id`
-   `storage_path`
-   `original_file_name`
-   `mime_type`
-   `file_size`
-   `uploaded_by`
-   `created_at`

RLS must derive access through the parent message and its
channel/conversation membership. Storage policies must enforce
equivalent access to the object path. A user must not be able to
retrieve another conversation's file by guessing its storage path.

### UI

-   Upload progress.
-   Cancel/retry where feasible.
-   Image thumbnails and full-size preview.
-   PDF download/open behavior.
-   File name and size.
-   Upload failure state.
-   Mobile camera/photo-library selection where supported.
-   Accessible attachment controls.

## 2. In-app notifications

Create a `notifications` table with fields such as:

-   `id`
-   `user_id`
-   `type`
-   `message_id` nullable
-   `channel_id` nullable
-   `conversation_id` nullable
-   `actor_id` nullable
-   `title`
-   `body_preview` (avoid sensitive content where unnecessary)
-   `created_at`
-   `read_at`

Create notifications only for eligible recipients. Avoid notifying the
sender about their own message.

Notification generation should be reliable and idempotent. Use a
database trigger or trusted server-side transaction/function. Add a
uniqueness/deduplication strategy to avoid duplicate notifications from
retries.

Types may include:

-   `direct_message`
-   `group_message`
-   `channel_mention`
-   `invitation`
-   `system`

For channel notifications, follow user notification preferences and
mention rules. Do not generate an email/push for every channel message
by default.

RLS:

-   Users can read/update only their own notifications.
-   Users cannot create notifications for other users.
-   Server-side generation must verify recipients are valid
    participants/members.
-   Notification payloads must not reveal private conversation content
    to unauthorized users.

## 3. Unread state and read receipts

Define the pilot behavior clearly:

-   Unread count per channel/conversation.
-   Mark as read when the user opens/views the conversation according to
    the chosen UX.
-   Avoid marking messages read just because a list preview was fetched.
-   Do not count the user's own messages as unread.
-   Use efficient queries and indexes.

For a small pilot, a per-user `last_read_at` on membership records can
be simpler than a row per message per reader. If individual read
receipts are needed, implement `message_reads` with unique constraints
and clear privacy behavior.

## 4. Browser push notifications

Resend is not a Web Push provider. Implement Web Push separately using:

-   Web Push API.
-   Service worker.
-   VAPID public/private keys.
-   A server-side Web Push library.
-   Supabase table for device subscriptions.

Create a `push_subscriptions` table:

-   `id`
-   `user_id`
-   `endpoint`
-   `p256dh`
-   `auth`
-   `created_at`
-   `last_seen_at`
-   `revoked_at`

Protect subscription records so users can manage only their own devices.
Store endpoint/key data securely and do not expose another user's
subscription.

### Push flow

1.  User explicitly opts in.
2.  Browser requests notification permission from a user gesture.
3.  Service worker registers.
4.  Browser creates a PushSubscription using the VAPID public key.
5.  App sends subscription details to a protected server endpoint.
6.  Server verifies the session and stores the subscription.
7.  On an eligible event, server sends a push.
8.  Handle expired/invalid subscriptions (e.g. remove or revoke on
    provider response indicating gone).
9.  Provide a way to disable notifications and remove a device
    subscription.

Do not request notification permission immediately on page load. Explain
the benefit first.

### Privacy

-   Do not include sensitive message text in push by default.
-   Prefer generic text such as "You have a new message."
-   Respect mute settings, quiet hours if implemented, and current
    in-app activity.
-   Do not send push notifications for a conversation the recipient is
    no longer allowed to access.

### iOS limitations

Web Push on iPhone/iPad requires a supported iOS/iPadOS version (16.4 or
later) and the web app to be added to the Home Screen. Users must grant
permission from the installed web app. Test on physical iPhones; do not
promise identical background behavior across platforms.

## 5. Resend email

Use Resend for:

-   Invitation emails.
-   Optional notification emails if enabled by user preference.
-   Administrative system emails where appropriate.

Requirements:

-   Astra-owned verified sender domain.
-   API key stored server-side.
-   No email sending from client components.
-   Rate limits and deduplication.
-   Safe handling of delivery failures.
-   Avoid sending a separate email for every channel message.
-   Include unsubscribe/preferences behavior where legally and
    operationally appropriate for non-essential email notifications.

## 6. Testing

Test:

-   Authorized member uploads and downloads a photo.
-   Unauthorized user cannot obtain a signed URL.
-   Private bucket denies anonymous access.
-   File type and size restrictions work.
-   Failed upload does not create a broken message.
-   Notification is created once for each eligible recipient.
-   Sender does not receive their own new-message notification.
-   User cannot read another user's notifications.
-   Push permission is requested only after user action.
-   Push works on supported Android browser.
-   Push works on an installed supported iOS PWA.
-   Invalid subscriptions are cleaned up.
-   Email failures are visible to admins without exposing secrets.

## Acceptance criteria

-   [ ] Private storage bucket is configured.
-   [ ] Storage RLS mirrors conversation access rules.
-   [ ] File type and size validation is enforced.
-   [ ] Signed URLs are short-lived and access-checked.
-   [ ] In-app notifications are reliable and deduplicated.
-   [ ] Unread counts are accurate.
-   [ ] Push subscriptions are user-owned and revocable.
-   [ ] Push sends only for authorized recipients.
-   [ ] iOS and Android behavior is tested on physical devices.
-   [ ] Resend sends invitations and approved email alerts.
-   [ ] Secrets are never exposed to the browser.

## Deliverables

1.  Private storage bucket and policies.
2.  Attachment upload/preview/download UI.
3.  Notification schema and notification center.
4.  Unread/read-state implementation.
5.  Service worker push integration.
6.  VAPID configuration and subscription management.
7.  Resend email templates and server integration.
8.  Attachment and notification test report.
