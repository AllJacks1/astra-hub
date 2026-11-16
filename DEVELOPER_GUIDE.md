# Astra Team Hub — Developer Guide (Pilot)

**Audience:** Software / web developer implementing the pilot  
**Source of truth:** `PRODUCT_POLICY.md` (overrides any conflicting tentative language in the phase docs)  
**Stack:** Next.js App Router · TypeScript · Tailwind · shadcn/ui · Supabase (Auth, Postgres, Realtime, Storage) · Resend · Vercel · Web Push (VAPID)

This guide is the practical implementation map. Use the six phase documents in `/docs` for detailed requirements. Follow the product policy for every authorization decision.

---

## 0. Quick start checklist

1. Create Astra-owned accounts (GitHub org/repo, Vercel team, Supabase project, Resend, Google Cloud OAuth).
2. Clone / create the Next.js repo and run the setup script (see `/scripts`).
3. Copy `.env.example` → `.env.local` and fill values.
4. Apply migrations (`supabase db push` or equivalent).
5. Generate types (`npm run db:types`).
6. Implement phases in order. Do **not** start messaging until Phase 2 RLS + invitation tests pass.
7. Deploy to a temporary Vercel HTTPS URL first.
8. Run the Pilot Acceptance Checklist (section 8 of PRODUCT_POLICY.md) before inviting staff.

---

## 1. Recommended repository structure

```text
src/
  app/
    (auth)/
      login/
      accept-invitation/
    (hub)/
      layout.tsx
      dashboard/
      channels/[channelId]/
      messages/[conversationId]/
      people/
      notifications/
      settings/
    admin/
      invitations/
      users/
      channels/
    auth/callback/
    api/
  components/
    layout/
    messaging/
    channels/
    people/
    notifications/
    ui/                 # shadcn
  hooks/
  lib/
    supabase/
      client.ts         # browser
      server.ts         # SSR / Server Components
      admin.ts          # service-role, server-only
    auth.ts             # getCurrentUser, requireRole, etc.
    env.ts              # zod validation
    validations/
  types/
    database.types.ts   # generated
supabase/
  migrations/
  seed.sql
public/
  icons/
  manifest.webmanifest
  sw.js                 # or next-pwa / serwist output
scripts/
  setup.sh
  generate-types.sh
  check-env.sh
```

Prefer Server Components. Add `"use client"` only where Realtime, forms, or browser APIs are required.

---

## 2. Environment variables

See `.env.example`. Rules:

- Never commit `.env.local`.
- Never prefix `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `INVITATION_TOKEN_SECRET`, or VAPID private key with `NEXT_PUBLIC_`.
- Validate required vars with Zod in `lib/env.ts` on the server.
- Service-role client is imported only from server-only modules.

---

## 3. Phase implementation order (strict)

| Phase | Deliverable | Gate before next phase |
|-------|-------------|------------------------|
| 1 | Foundation, clients, shell, profile migration, env | App builds, shell renders, clients separated |
| 2 | Google OAuth, invitations, roles, RLS on profiles/invitations | Invitation + role tests pass (company + invited Gmail + uninvited rejected) |
| 3 | Channels, DMs, messages, Realtime, presence | RLS prevents non-members from reading private content |
| 4 | Private Storage, attachments, notifications, Web Push | Signed URLs + attachment access checks pass |
| 5 | PWA, responsive polish, security QA | Install works on iPhone + Android; matrix green |
| 6 | Production deploy, temporary URL checklist, domain, handover | Pilot checklist signed off |

**Critical:** Do not implement messaging (Phase 3) until Phase 2 authorization is proven.

---

## 4. Product policy highlights (must enforce)

### Roles
- `admin` — invitations, users, channel creation, admin config. **Does not** auto-gain private DM access.
- `member` — assigned conversations + can self-join public channels.
- `guest` — only explicitly assigned conversations. No public channel directory, no self-join, no create channel/group DM, no admin.

### Channels
- Only admins create channels.
- Public: active members may discover + self-join.
- Private: members only.
- Mandatory “announcements” channel exists; members cannot leave (DB-enforced).

### Direct messages
- 1:1 and group supported.
- Group DM membership is **fixed at creation**. No later add/remove of participants (except a participant leaving themselves if you implement leave).
- Create conversation + initial members atomically.

### Attachments
- Max 20 MB per file, max 10 files per message (atomic enforcement).
- Allowed: JPG/JPEG/PNG/WebP/GIF, PDF/DOCX/XLSX/PPTX/TXT/CSV, MP4 (≤20 MB).
- Block executables, SVG, ZIP (unless later approved).
- Private bucket only. Short-lived signed URLs after access check.

### Messages
- Author can edit own message within **15 minutes** of `created_at` (server clock).
- Soft-delete / moderation only. No permanent delete for ordinary users.

### Email (Resend)
- Only for: DMs (1:1 or group) to other participants, and mentions.
- Never for ordinary channel messages, reactions, typing, or the sender’s own message.

All of the above must be enforced in Server Actions, RPCs, RLS, Storage policies, and Realtime authorization — not just the UI.

---

## 5. Database baseline (Phase 1 + 2)

**Naming convention:** All application tables, enums, and helper functions are prefixed with `astra_hub_` (e.g. `astra_hub_profiles`, `astra_hub_messages`). This keeps the public schema clean when multiple apps share a Supabase project.

Minimum tables (see migration files):

- `astra_hub_profiles` (id → auth.users, email, full_name, avatar_url, role, status, …)
- `astra_hub_invitations` (email, role, status, token_hash, expires_at, …)
- Later: `astra_hub_channels`, `astra_hub_channel_members`, `astra_hub_conversations`, `astra_hub_conversation_members`, `astra_hub_messages`, `astra_hub_message_attachments`, `astra_hub_notifications`, `astra_hub_push_subscriptions`

Always enable RLS. Prefer security-definer functions with fixed `search_path` for invitation acceptance and other multi-step writes.

---

## 6. Useful commands

```bash
# Install
npm install

# Local dev
npm run dev

# Lint / types / build
npm run lint
npm run typecheck
npm run build

# Supabase
npx supabase start          # local (optional)
npx supabase db push        # apply migrations
npm run db:types            # generate database.types.ts

# Scripts in /scripts
./scripts/setup.sh
./scripts/check-env.sh
./scripts/generate-types.sh
```

---

## 7. Testing requirements (minimum)

Identities:
- Company `@astragroupph.com` account
- Invited personal Gmail
- Uninvited Gmail (must fail)
- Admin / Member / Guest
- Suspended user

Scenarios (see PRODUCT_POLICY §8 and each phase doc):
- Invitation acceptance + email match
- Role escalation attempts fail
- Private channel / DM isolation
- Attachment access by non-participant fails
- Group DM membership immutable after creation
- 15-minute edit window
- File size / count / type limits
- Email only for DMs + mentions

Record results for the pilot acceptance checklist.

---

## 8. Deployment & domain (Phase 6)

1. Deploy to temporary Vercel HTTPS URL.
2. Configure Supabase Auth site URL + redirect allowlist for that URL.
3. Run full pilot checklist with company + invited Gmail accounts.
4. Only after green checklist: check whether `hub.astragroupph.com` is free, then add the exact Vercel DNS records. Do **not** touch existing website or email records.
5. Re-test OAuth, push, and PWA on the custom domain (users may need to reinstall PWA).

---

## 9. Cost baseline (pilot)

Approx. **$45 / month** (Vercel Pro ~$20 + Supabase Pro ~$25 + Resend Free). Re-check live pricing before committing.

Astra owns and pays for all production services. Developer maintains code, migrations, and technical support under an agreed arrangement.

---

## 10. Deliverables you will produce

- Working Next.js application following the structure above
- Migrations + generated types
- Invitation + role system with proven RLS
- Channels + DMs + Realtime
- Private attachments + notifications + Web Push
- PWA installable on iPhone and Android
- Temporary pilot URL + completed acceptance checklist
- Handover notes (env vars location, backup/restore, support contacts)

---

## File map in this package

| Path | Purpose |
|------|---------|
| `PRODUCT_POLICY.md` | Binding product rules |
| `docs/PHASE_*.md` | Detailed phase requirements |
| `DEVELOPER_GUIDE.md` | This file |
| `.env.example` | Environment template |
| `scripts/` | Setup, typegen, env check helpers |
| `supabase/migrations/` | Starter SQL (astra_hub_profiles, astra_hub_invitations, later tables) |

Start with Phase 1. Good luck.
