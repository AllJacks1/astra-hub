# Astra Team Hub --- Phase 2: Authentication, Invitations, and Access Control

## Purpose

Implement secure, invite-only Google authentication for Astra Team Hub.
Support company Google accounts using `@astragroupph.com` and explicitly
approved personal Gmail accounts. Add admin, member, and guest roles.

**Critical principle:** A Google account is not automatically
authorized. The user must have a valid invitation matching the
Google-authenticated email address.

## Prerequisites

-   Phase 1 project foundation is complete.
-   Supabase Auth is configured.
-   The `profiles` (or equivalent) table exists and references
    `auth.users`.
-   Astra controls the Google Cloud project and Supabase production
    project.
-   Temporary HTTPS deployment URL is available for OAuth testing.

Inspect the existing implementation before changing it. Reuse
established conventions and do not replace working code without
explanation.

## Authentication requirements

### Allowed account types

1.  Company addresses ending in `@astragroupph.com`.
2.  Personal Gmail addresses ending in `@gmail.com`, but only if
    specifically invited and approved by an administrator.

Do not accept lookalike domains such as
`astragroupph.com.attacker.example`. Normalize email addresses by
trimming whitespace and comparing case-insensitively. Validate the exact
domain boundary.

### Google OAuth

Configure Supabase Google OAuth using Astra-owned Google Cloud
credentials.

-   Request only the minimum scopes needed for sign-in (`openid`,
    `email`, `profile`).
-   Do not request access to Gmail, Drive, Calendar, or other Google
    APIs.
-   Configure authorized redirect URIs in Google Cloud and Supabase.
-   Implement the `/auth/callback` route using the current Supabase SSR
    flow.
-   Validate OAuth errors and missing/invalid code cases.
-   Redirect only to safe internal paths; prevent open redirects.
-   Do not trust an email address supplied by a client form. Use the
    verified identity returned by Supabase Auth.

## Invitation data model

Create an `invitations` table with fields similar to:

-   `id uuid primary key`
-   `email text not null`
-   `role text not null check (role in ('admin','member','guest'))`
-   `status text not null check (status in ('pending','accepted','revoked','expired'))`
-   `token_hash text not null`
-   `expires_at timestamptz not null`
-   `invited_by uuid references profiles(id)`
-   `accepted_by uuid references profiles(id)`
-   `accepted_at timestamptz`
-   `created_at timestamptz`

Store only a cryptographic hash of a high-entropy, single-use invitation
token. Never store the raw token. Add indexes and a uniqueness strategy
that prevents multiple active invitations for the same email unless the
previous one is revoked/expired.

Use a cryptographically secure random token generator. Compare token
hashes safely. Tokens must expire and be single-use.

## Invitation workflow

1.  Admin submits email and role in the admin interface.
2.  Server validates the caller's authenticated identity and admin role.
3.  Server validates allowed email domain and invitation policy.
4.  Server creates a random token, stores its hash and expiry, and sends
    the raw token in a Resend invitation link.
5.  The invitee opens the link and signs in with Google.
6.  The authenticated Google email must match the invitation email
    exactly after normalization.
7.  Server validates token hash, status, and expiry.
8.  In one database transaction, mark invitation accepted and
    create/activate the profile with the invited role.
9.  Redirect the user into the application.
10. Replays, expired links, revoked invitations, mismatched emails, and
    already-used tokens must fail safely.

Prefer a database RPC/transaction for atomic invitation acceptance.
Avoid a multi-step client workflow that could leave a profile active
while the invitation remains pending.

### Resend

-   Use Resend only from server-side code.
-   Keep `RESEND_API_KEY` private.
-   Use an Astra-controlled sender domain that has been verified with
    Resend.
-   Create a clear invitation email with inviter, role, expiry, and a
    secure link.
-   Do not include the raw token in logs or analytics.
-   Handle provider failures and show an actionable admin error.
-   Add resend/revoke invitation controls for admins.
-   Rate-limit invitation creation and resend operations.

## Roles

### Admin

-   Manage invitations and users.
-   Create/manage channels and channel membership.
-   Manage platform settings that are explicitly in scope.
-   Does not automatically gain permission to read private one-to-one or
    group DMs.

### Member

-   Use assigned channels.
-   Send messages in channels where they are a member.
-   Participate in DMs where they are a participant.
-   Upload attachments to conversations they can access.
-   View the people directory according to the configured policy.

### Guest

-   Access only explicitly assigned channels and DMs.
-   Cannot invite users, manage roles, create channels, or access admin
    routes.
-   May send messages and upload permitted files only in assigned
    conversations, unless Astra chooses a read-only guest policy.

Do not implement authorization as UI-only role checks. Every database
operation and server action must enforce authorization.

## Authorization model

Create reusable server-side helpers such as:

-   `getCurrentUser()`
-   `requireAuthenticatedUser()`
-   `requireActiveUser()`
-   `requireRole("admin")`
-   `canAccessChannel(channelId, userId)`
-   `canAccessConversation(conversationId, userId)`

These helpers improve code clarity but do not replace RLS.

### RLS requirements

Enable RLS on every exposed application table.

-   A user can read their own profile and permitted directory fields.
-   A user cannot update their own role, status, or invitation state.
-   Only admins can create/revoke invitations.
-   Only admins can change other users' roles/status, subject to a
    controlled server-side operation.
-   Suspended users cannot read or write application data.
-   Guests have no implicit access to all channels.
-   No policy should grant access simply because a user is
    authenticated.
-   Never use a service-role client in a browser component.

For profile updates, separate user-editable fields (e.g. display
name/avatar) from privileged fields, or use column-level privileges and
trusted server operations. Ensure a user cannot change their
email/role/status through a generic profile update.

## Route protection

Protect all `(hub)` and `/admin` routes on the server. Middleware/proxy
can provide convenient redirects, but it is not the security boundary.
Re-check the user and role in server components, server actions, route
handlers, and RLS.

A hidden admin navigation item is not sufficient protection.

## Session and account lifecycle

Implement:

-   Sign out.
-   Session refresh using Supabase SSR conventions.
-   Suspended account handling.
-   Revoked/expired invitation handling.
-   Profile bootstrap only through the trusted invitation acceptance
    path.
-   Safe handling when an Auth user exists but has no active profile.
-   Admin recovery procedure that does not depend on public
    self-registration.

Avoid exposing whether arbitrary email addresses exist in the system
through public endpoints.

## Audit logging

Record security-relevant administrative actions:

-   Invitation created, resent, revoked, accepted.
-   User role changed.
-   User suspended/reactivated.
-   Channel membership changed.

Do not log OAuth tokens, invitation secrets, or message contents.

## Testing requirements

Use at least:

-   One company account.
-   One invited personal Gmail account.
-   One uninvited Gmail account.
-   One suspended account.
-   One guest account.

Test:

-   Correct email can accept the invitation.
-   Different Google email cannot accept it.
-   Uninvited personal Gmail is rejected.
-   Expired/revoked/replayed invitation is rejected.
-   A member cannot open admin routes or call admin server actions.
-   A user cannot update their own role/status.
-   Suspended user cannot access application data.
-   Sign-out and session refresh work.
-   Redirect URLs cannot send users to arbitrary external sites.

## Acceptance criteria

-   [ ] Google OAuth works on local and temporary HTTPS URLs.
-   [ ] Company domain accounts can be invited and sign in.
-   [ ] Personal Gmail accounts require an invitation.
-   [ ] Google-authenticated email must match the invitation.
-   [ ] Invitations are hashed, expiring, revocable, and single-use.
-   [ ] Resend sends the invitation email from an Astra-owned sender
    domain.
-   [ ] Admin/member/guest roles are enforced server-side and in RLS.
-   [ ] Admin does not gain automatic private-DM content access.
-   [ ] Suspended and uninvited users are blocked.
-   [ ] Security tests pass and results are documented.

## Deliverables

1.  Google OAuth integration.
2.  Invitation admin UI.
3.  Invitation email template and Resend integration.
4.  Invitation acceptance flow.
5.  Role and account management.
6.  RLS policies and database functions.
7.  Route and server-action authorization.
8.  Security test report.

## Security warning

Do not move to messaging implementation until the RLS and invitation
tests pass. A successful login is not proof that the authorization model
is secure.
