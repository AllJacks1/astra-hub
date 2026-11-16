# Astra Team Hub --- Phase 3: Channels, Direct Messages, and Realtime Messaging

## Purpose

Build the core collaboration experience: channels, one-to-one DMs, group
DMs, message history, and real-time delivery across devices.

**Prerequisite:** Phase 2 authentication, invitations, roles, and
baseline RLS must be complete and tested.

## Product requirements

### Channels

Support:

-   Public channels visible to authenticated active users, with joining
    governed by the chosen policy.
-   Private channels visible only to channel members.
-   Channel name, description, creator, timestamps, and status.
-   Add/remove members.
-   Channel list and channel details.
-   Message history and pagination.
-   Unread indicators.
-   Mentions and replies as included in the agreed pilot scope.

Define what "public" means for this application. A public channel may be
discoverable to active members, but reading and posting should still
follow the final channel policy. Guests should only see explicitly
assigned channels unless Astra approves a different policy.

### Direct messages

Support:

-   One-to-one conversations.
-   Group conversations with multiple participants.
-   Stable conversation identity.
-   Conversation title/avatar for group DMs.
-   Add participants to a group DM only according to the agreed policy.
-   Leave a group conversation if allowed.
-   Participant list.
-   Message history and unread indicators.

Do not create duplicate one-to-one conversations for the same pair of
users. Implement a canonical pair key or a transaction-safe database
function that finds/creates the existing pair conversation.

For group DMs, define whether membership can be changed after creation
and whether existing members can add participants. Implement that policy
explicitly.

## Database model

Use a single `messages` table for channel and direct messages. Each
message must belong to exactly one parent:

-   `channel_id` set and `conversation_id` null, or
-   `conversation_id` set and `channel_id` null.

Add a database check constraint enforcing this invariant.

Suggested tables:

### `channels`

-   `id`
-   `name`
-   `description`
-   `visibility` (`public` or `private`)
-   `created_by`
-   `created_at`
-   `updated_at`
-   `archived_at`

### `channel_members`

-   `channel_id`
-   `user_id`
-   `membership_role` (e.g. owner/member, if needed)
-   `joined_at`
-   `added_by`

Unique constraint on `(channel_id, user_id)`.

### `conversations`

-   `id`
-   `type` (`direct` or `group`)
-   `title` (nullable for direct)
-   `created_by`
-   `created_at`
-   `updated_at`
-   optional canonical key for one-to-one uniqueness.

### `conversation_members`

-   `conversation_id`
-   `user_id`
-   `joined_at`
-   `last_read_at` (optional; can instead use a dedicated read table)
-   `left_at` (nullable, if leaving is supported)

Unique constraint on `(conversation_id, user_id)` for active membership
semantics. Design carefully if historical membership is retained.

### `messages`

-   `id`
-   `channel_id` nullable
-   `conversation_id` nullable
-   `sender_id`
-   `body` (nullable only if attachment-only messages are supported)
-   `created_at`
-   `updated_at`
-   `edited_at` (optional)
-   `deleted_at` (optional soft delete)

Add indexes for `(channel_id, created_at)` and
`(conversation_id, created_at)`. Use cursor pagination rather than
loading the entire conversation.

### `message_reads` or read state

For the pilot, per-member `last_read_at` may be sufficient and more
efficient than inserting one read row per message per user. If exact
per-message read receipts are required, use a dedicated table with a
unique `(message_id, user_id)` constraint. Decide and document which
behavior is implemented.

## Message validation and persistence

-   Validate message length on the server and in the database where
    practical.
-   Trim whitespace and reject empty text unless an attachment is
    included.
-   Derive `sender_id` from the authenticated session, never from client
    input.
-   Derive conversation/channel membership from the database.
-   Use server actions or route handlers for writes with authorization
    checks.
-   Let RLS independently enforce read/write permissions.
-   Do not trust a client-supplied `channel_id`, `conversation_id`, or
    `sender_id`.
-   Consider rate limiting message creation to reduce spam/abuse.
-   Use optimistic UI only with rollback/error handling.

## Realtime

Use Supabase Realtime for:

1.  New message delivery (Postgres Changes or an appropriately designed
    Broadcast flow).
2.  Presence for online status.
3.  Broadcast for ephemeral typing indicators.

Do not store typing state as permanent database rows.

### Presence behavior

-   Track the authenticated user with a stable user ID.
-   Do not expose private profile data in presence payloads.
-   Show online/offline and optionally "last active" separately.
-   Handle multiple tabs/devices for the same user.
-   Clean up subscriptions on unmount and reconnect safely.
-   Do not interpret a stale connection as definitively online.

### Realtime authorization

-   Ensure users subscribe only to topics/rows they can access.
-   Apply RLS to Realtime data sources.
-   Do not publish private messages on a globally readable topic.
-   Test access from a second user who is not a member of the
    conversation.

## UI requirements

Build:

-   Responsive conversation layout.
-   Desktop sidebar with channels and recent DMs.
-   Mobile navigation and conversation back behavior.
-   Channel header and member list.
-   DM header and participant list.
-   Message list with sender, avatar, timestamp, and grouping.
-   Composer with Enter-to-send and Shift+Enter newline behavior.
-   Loading, empty, error, and reconnect states.
-   Pagination/infinite history loading.
-   Unread markers and unread counts.
-   Typing indicator.
-   Online status indicators.

Avoid placing the entire application in one large client component.
Separate the conversation list, message timeline, composer, headers, and
hooks.

## Accessibility and mobile behavior

-   Keyboard-operable navigation and composer.
-   Visible focus styles.
-   Accessible labels for icon-only actions.
-   Avoid hover-only controls.
-   Respect mobile safe areas and virtual keyboard behavior.
-   Keep the composer usable when the mobile keyboard opens.
-   Test narrow viewport widths.

## Testing requirements

Test with at least three users:

-   Admin.
-   Member.
-   Guest.

Test scenarios:

-   Two authorized users can exchange channel messages.
-   Non-member cannot read a private channel's messages.
-   A guest sees only assigned channels.
-   Two users share one one-to-one DM rather than duplicate DMs.
-   Group DM messages reach all current participants.
-   A nonparticipant cannot read a DM by guessing its ID.
-   Typing indicators appear only to conversation participants.
-   Presence works across multiple tabs/devices.
-   Realtime reconnect does not duplicate messages.
-   Pagination does not skip or repeat messages.
-   Suspended users cannot continue sending/reading messages.

## Acceptance criteria

-   [ ] Public/private channel behavior is implemented and documented.
-   [ ] Channel membership is enforced by RLS.
-   [ ] One-to-one DMs are unique per user pair.
-   [ ] Group DMs support multiple participants.
-   [ ] One messages table supports both channel and DM messages.
-   [ ] Sender identity is derived from the authenticated user.
-   [ ] Realtime messages work across two or more devices.
-   [ ] Presence and typing indicators work and clean up correctly.
-   [ ] Unread state is consistent.
-   [ ] Message history uses pagination.
-   [ ] Unauthorized access tests pass.

## Deliverables

1.  Channel schema and UI.
2.  Channel membership management.
3.  Direct and group conversation schema/UI.
4.  Message composer and timeline.
5.  Realtime hooks/subscriptions.
6.  Presence and typing indicators.
7.  Unread/read-state behavior.
8.  Automated/manual messaging security test report.
