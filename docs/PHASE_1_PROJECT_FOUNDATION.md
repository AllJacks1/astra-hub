# Astra Team Hub --- Phase 1: Project Foundation

## Purpose

Establish the production-ready foundation for Astra Team Hub, a private,
installable internal communications application for an initial 10-person
pilot.

**Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui,
Supabase (PostgreSQL, Auth, Realtime, Storage), Resend, and Vercel.

This phase creates the project structure, coding conventions,
environment configuration, Supabase clients, database baseline, and
deployment-ready shell. Do not implement full messaging features in this
phase.

## Instructions to the developer / coding agent

Work inside the existing repository if one is supplied. Before changing
files:

1.  Inspect the repository structure, package manager, installed
    dependencies, existing styles, components, and conventions.
2.  Identify the current Next.js version and whether the project uses
    `src/`.
3.  Preserve working code and avoid replacing configuration files
    without understanding their purpose.
4.  Present a short implementation plan and list any conflicts before
    making substantial changes.
5.  Implement in small, verifiable steps. Run lint, type-check, and
    build commands available in the project.
6.  Do not fabricate successful test results. Report commands run and
    any remaining errors.

If the prototype is available, inspect its screens and interactions
first. Treat it as the UI/workflow reference, but replace
sample/local-only data with the real application architecture over the
following phases. Do not claim prototype parity until it has been
inspected.

## Product scope and non-goals

### In scope for this phase

-   Next.js application foundation.
-   TypeScript and Tailwind CSS.
-   shadcn/ui setup and reusable design tokens.
-   Supabase browser and server clients using `@supabase/ssr`.
-   Environment variable validation and examples.
-   Initial folder structure.
-   Database migration workflow and generated database types.
-   Basic responsive application shell and placeholder routes.
-   Git and deployment readiness.

### Not in scope yet

-   Google OAuth implementation.
-   Invitation acceptance.
-   Messaging, channels, DMs, uploads, push notifications.
-   Production domain/DNS changes.
-   Advanced offline functionality.

## Required application architecture

Use the Next.js App Router. Prefer Server Components by default. Add
`"use client"` only to interactive components that require browser
state, event handlers, or Supabase Realtime subscriptions.

Suggested structure (adapt to the existing repository rather than
forcing an unnecessary rewrite):

``` text
src/
  app/
    (auth)/
      login/
      accept-invitation/
    (hub)/
      layout.tsx
      dashboard/
      channels/
      messages/
      people/
      notifications/
      settings/
    admin/
    auth/
      callback/
    api/
  components/
    layout/
    messaging/
    channels/
    people/
    notifications/
    ui/
  hooks/
  lib/
    supabase/
      client.ts
      server.ts
      admin.ts
    env.ts
    validations/
  types/
    database.types.ts
supabase/
  migrations/
  seed.sql
public/
  icons/
```

Keep route groups and naming consistent with the repository. Avoid
creating empty abstractions that have no immediate use.

## Dependencies

Install only packages needed for this phase. Expected baseline:

-   `@supabase/supabase-js`
-   `@supabase/ssr`
-   `zod`
-   `lucide-react`
-   `date-fns`
-   `sonner`

Use the project's existing package manager. Add shadcn/ui components
through its supported CLI or existing project conventions. Do not
install multiple competing form, state, or PWA libraries without a
concrete requirement.

## Environment configuration

Create `.env.example` with placeholders only:

``` dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=
INVITATION_TOKEN_SECRET=
```

Rules:

-   Never commit `.env.local` or real credentials.
-   Never prefix the service-role key, Resend key, or invitation secret
    with `NEXT_PUBLIC_`.
-   Validate required environment variables server-side.
-   The service-role client must only be imported by trusted server-only
    modules.
-   Use the publishable/anon key with RLS for normal user-facing
    requests.
-   Do not disable RLS to make development easier.

## Supabase clients

Implement three clearly separated modules:

1.  **Browser client:** uses the public URL and anon/publishable key.
2.  **Server client:** uses `@supabase/ssr`, request cookies, and the
    public key.
3.  **Admin client:** uses the service-role key, marked server-only, and
    imported only by trusted server code for narrowly scoped
    administrative operations.

Follow the current `@supabase/ssr` cookie API for the installed version.
Do not copy obsolete auth-helper examples. Handle cookie reads/writes
correctly in Server Components, Route Handlers, and Server Actions.

## Database baseline

Create a first migration for the application profile model and
enums/constraints that are genuinely needed now. The authoritative
profile table should reference `auth.users(id)` with
`ON DELETE CASCADE`.

Minimum profile fields:

-   `id uuid primary key references auth.users(id)`
-   `email text not null`
-   `full_name text`
-   `avatar_url text`
-   `role text not null` constrained to `admin`, `member`, `guest`
-   `status text not null` constrained to `invited`, `active`,
    `suspended`
-   `created_at timestamptz`
-   `updated_at timestamptz`

Do not allow users to promote themselves by updating their own `role` or
`status`. Protect privileged fields through database privileges/RLS and
trusted server-side workflows. Do not create a public signup flow.

You may add a small `private` schema for internal helper functions if
needed. Security-definer functions must set a safe `search_path`, use
fully qualified table names, and have narrowly granted execute
permissions.

## Design foundation

Create a restrained, professional internal collaboration UI:

-   Brand: Astra Team Hub.
-   Visual direction: calm, premium, enterprise SaaS.
-   Responsive desktop and mobile layouts.
-   Clear focus states and keyboard navigation.
-   Consistent spacing, typography, borders, radii, and color tokens.
-   Use accessible shadcn/ui primitives.
-   Avoid decorative complexity and excessive gradients.

Use the actual brand assets and exact brand colors only if supplied. Do
not invent official logos or claim an unconfirmed brand palette.

Create a basic shell with a sidebar/navigation placeholder, page header,
content area, loading state, empty state, and error state. It should be
usable on narrow mobile screens.

## Authentication placeholders

Create the route structure and UI placeholders for:

-   `/login`
-   `/accept-invitation`
-   `/auth/callback`

Do not implement fake authentication or treat client-side route hiding
as access control. Protected routes will be completed in Phase 2.

## Developer experience

Add or verify:

-   ESLint.
-   TypeScript strict mode where feasible.
-   Formatting convention consistent with repository.
-   `npm run lint`, `npm run typecheck` (if configured), and
    `npm run build`.
-   Supabase migration commands documented in the README.
-   Database type-generation command documented in the README.

Add a README section covering local setup, environment variables,
migrations, and running the app.

## Acceptance criteria

-   [ ] Existing repository was inspected before modifications.
-   [ ] Next.js app runs locally.
-   [ ] Tailwind and shadcn/ui work.
-   [ ] Supabase browser and server clients are separated.
-   [ ] Admin client is server-only and cannot enter client bundles.
-   [ ] `.env.example` contains placeholders, no secrets.
-   [ ] Initial migration applies to a development Supabase project.
-   [ ] Profile role/status cannot be self-escalated.
-   [ ] Basic responsive shell and placeholder routes render.
-   [ ] Lint, type-check, and production build pass, or remaining
    failures are documented.
-   [ ] README explains setup and migration workflow.

## Deliverables

1.  Updated Next.js repository.
2.  `.env.example`.
3.  Supabase migration(s).
4.  Basic application shell.
5.  Supabase client modules.
6.  README setup instructions.
7.  A concise implementation report listing changed files, commands run,
    test results, and unresolved decisions.

## Important constraints

-   Use Astra-owned GitHub, Vercel, Supabase, and Resend accounts for
    production.
-   Developer access should be granted by Astra; Astra retains owner
    access.
-   Never place production secrets in source control or chat.
-   Do not modify Astra DNS in this phase.
-   Do not use localStorage as the source of truth for users, roles,
    channels, or messages.
