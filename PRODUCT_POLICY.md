# Astra Team Hub --- Pilot Product Policy

**Document status:** Approved for the initial 10-person internal pilot\
**Applies to:** Product behavior, UI, Next.js server-side authorization,
Supabase database/RLS, Realtime, Storage, notifications, QA, and
deployment sign-off.

This document is the source of truth for the pilot. If an older phase
guide contains tentative language that conflicts with this policy,
follow this policy.

## 1. Roles and access model

The application has three roles: `admin`, `member`, and `guest`.

-   **Admin:** Manages users, invitations, channel creation, and
    approved administrative configuration. Admin status does not
    automatically grant access to private one-to-one or group DM
    contents.
-   **Member:** Uses assigned conversations and channels; may self-join
    public channels.
-   **Guest:** Can access only explicitly assigned conversations. Guests
    cannot browse the public channel directory, self-join public
    channels, create channels, create group DMs, invite users, manage
    roles, or access admin routes. Guests may send messages and upload
    approved attachments within assigned conversations.

All permissions must be enforced server-side and by Supabase RLS/Storage
policies. UI visibility is not an authorization boundary.

## 2. Channels

### Creation

Only admins may create channels. Enforce this in server actions/RPCs and
database authorization policies.

### Public channels

Active members may discover and join public channels themselves without
admin approval. Public visibility does not grant guest access. Guests
remain limited to explicitly assigned conversations.

### Private channels

Private channels are accessible only to explicitly assigned members.
Nonmembers must not discover their contents or retrieve their
messages/files.

### Mandatory announcements channel

A mandatory announcements channel must exist for the pilot.

-   Members cannot leave the channel.
-   The restriction must be enforced by the database/trusted server
    workflow, not just a disabled UI control.
-   Ordinary members cannot remove themselves or other users or alter
    the channel's mandatory status.
-   Creation/seeding must be idempotent so duplicate mandatory channels
    are not created.
-   Administrative membership changes must use a trusted, auditable
    workflow.

## 3. Direct messages and group DMs

-   One-to-one DMs are supported.
-   Group DMs are supported.
-   Group DM participant membership is fixed at creation.
-   Participants cannot add another participant after creation.
-   Participants cannot remove another participant after creation.
-   If the intended participant list changes, create a new group DM.
-   A participant may leave their own conversation only if the
    implemented leave behavior supports it; this does not grant
    authority to modify other participants.

Create the conversation and its initial participant set atomically.
Block subsequent membership changes through UI, Server Actions, APIs,
RPCs, direct database access, and Realtime paths, except narrowly scoped
audited operations required for account suspension/security
administration or a participant leaving themselves.

## 4. Attachments and file restrictions

### Limits

-   Maximum size: **20 MB per file**.
-   Maximum attachments: **10 files per message**.
-   The limit applies to all files, including video.
-   The 10-file cap must be enforced atomically so concurrent upload
    requests cannot exceed it.

### Allowed formats

-   Images: JPG, JPEG, PNG, WebP, GIF.
-   Documents: PDF, DOCX, XLSX, PPTX, TXT, CSV.
-   Video: MP4 only, up to 20 MB.
-   ZIP is not in the default pilot allowlist; enable only after
    explicit product-owner approval.
-   Block executables and SVG.
-   Do not accept arbitrary file types.

Validate file extension, MIME type, byte size, and file signature where
practical. Client-side validation is for usability only; server-side
checks and Storage authorization are mandatory.

Use a private Supabase Storage bucket. Issue short-lived signed URLs
only after verifying that the requesting user can access the parent
message and conversation. Guests may upload and retrieve files only
within explicitly assigned conversations.

## 5. Message lifecycle

### Editing

Authors may edit their own messages within **15 minutes** of the
original message creation time. The server must calculate and enforce
the time window using the stored `created_at` value. Do not trust the
client clock. Users cannot edit other users' messages.

### Deletion and moderation

Ordinary users cannot permanently delete messages. User-initiated
deletion and administrative moderation must use soft deletion/moderation
states that preserve the underlying record and relevant metadata
according to the organization's retention policy. Do not expose a
permanent-delete operation to ordinary users.

## 6. Email notifications

Send email notifications only for: 1. Direct messages (one-to-one or
group DM messages) to eligible recipients other than the sender. 2.
Mentions that target an eligible recipient in a channel or conversation
they can access.

Do not send email for ordinary channel messages, reactions, typing
indicators, read receipts, or the sender's own messages. Avoid duplicate
sends on retries. Respect mute/preferences if implemented. Resend is the
delivery provider; it does not determine authorization. The trusted
notification workflow must verify recipient access before sending.

In-app notifications and Web Push are separate delivery channels and
must have their own authorization and preference checks.

## 7. Enforcement requirements

Every policy must be enforced consistently across: - Next.js Server
Components and route protection. - Server Actions and Route Handlers. -
Supabase RLS policies and trusted database functions. - Supabase
Realtime subscriptions and broadcast/presence channels. - Storage object
policies and signed URL issuance. - Search, notification generation, and
message/attachment retrieval.

Never rely only on hidden controls or client-side validation.

## 8. Pilot acceptance checklist

-   [ ] Only admins can create channels.
-   [ ] Active members can discover and self-join public channels.
-   [ ] Guests cannot browse or self-join public channels.
-   [ ] Mandatory announcements channel exists and members cannot leave
    it, including via direct requests.
-   [ ] Guests can access only explicitly assigned conversations and
    upload only within them.
-   [ ] Group DM participants cannot add or remove participants after
    creation.
-   [ ] Message authors can edit only their own messages within 15
    minutes.
-   [ ] Ordinary users cannot permanently delete messages.
-   [ ] Files above 20 MB are rejected.
-   [ ] More than 10 attachments per message are rejected, including
    concurrent upload attempts.
-   [ ] Approved image/document formats and MP4 up to 20 MB are
    accepted.
-   [ ] Unsupported types, including executables and SVG, are rejected.
-   [ ] Email is sent for eligible mentions and direct messages only.
-   [ ] Ordinary channel messages do not trigger email.
-   [ ] Private content and attachments cannot be accessed by guessing
    IDs or URLs.
