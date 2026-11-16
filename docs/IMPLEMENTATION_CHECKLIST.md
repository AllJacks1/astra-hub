# Astra Team Hub — Implementation Checklist

Use this as a living progress tracker. Check items only after they are verified.

## Phase 1 — Foundation
- [ ] Repo inspected / Next.js App Router project created
- [ ] Tailwind + shadcn/ui working
- [ ] `.env.example` present, secrets never committed
- [ ] Browser / Server / Admin Supabase clients separated
- [ ] Admin client cannot enter client bundles
- [ ] Profile migration applied, RLS enabled
- [ ] Role/status cannot be self-escalated
- [ ] Basic responsive shell + placeholder routes render
- [ ] Lint, typecheck, build pass (or documented failures)
- [ ] README covers local setup + migrations

## Phase 2 — Auth & Invitations
- [ ] Google OAuth configured (Astra-owned Google Cloud + Supabase)
- [ ] Company `@astragroupph.com` can be invited and sign in
- [ ] Personal Gmail requires invitation; uninvited rejected
- [ ] Authenticated email must match invitation email
- [ ] Invitation tokens hashed, expiring, single-use, revocable
- [ ] Resend sends from Astra-owned verified domain
- [ ] Admin / member / guest roles enforced in server + RLS
- [ ] Admin does **not** auto-gain private DM access
- [ ] Suspended users blocked
- [ ] Security test report written

## Phase 3 — Channels, DMs, Realtime
- [ ] Only admins can create channels
- [ ] Members can discover + self-join public channels
- [ ] Guests cannot browse or self-join public channels
- [ ] Mandatory announcements channel exists; leave is blocked by DB
- [ ] 1:1 DMs unique per pair
- [ ] Group DMs: membership fixed at creation (no later add/remove)
- [ ] Single messages table with parent XOR constraint
- [ ] Sender identity from session, never client input
- [ ] Realtime messages + presence + typing work across devices
- [ ] Unauthorized users cannot read private content by ID guessing
- [ ] Unread / pagination working

## Phase 4 — Attachments & Notifications
- [ ] Private storage bucket + Storage RLS mirroring conversation access
- [ ] 20 MB max, 10 files max per message (atomic)
- [ ] Allowed formats only; SVG / executables / ZIP blocked
- [ ] Signed URLs short-lived and access-checked
- [ ] In-app notifications deduplicated, own-only
- [ ] Email only for DMs + mentions (never ordinary channel messages)
- [ ] Web Push opt-in, user-owned subscriptions, safe payload
- [ ] Tested on physical iPhone (installed PWA) + Android

## Phase 5 — PWA & QA
- [ ] Manifest + icons (approved artwork)
- [ ] Service worker: push + offline fallback, no private data caching
- [ ] Install works on supported iPhone + Android
- [ ] Responsive layouts across test matrix
- [ ] Permission matrix (admin/member/guest) green
- [ ] Accessibility basics checked
- [ ] Known limitations documented

## Phase 6 — Deploy & Pilot
- [ ] Temporary HTTPS URL live
- [ ] Company + invited Gmail pilot checklist passed
- [ ] `hub.astragroupph.com` availability checked
- [ ] DNS change approved and applied without touching website/email records
- [ ] Custom domain smoke test (OAuth, push, PWA, attachments)
- [ ] Handover package delivered (owners, runbooks, costs, support)

## Product Policy Acceptance (final gate)
- [ ] All items in PRODUCT_POLICY.md §8 are checked and evidenced
