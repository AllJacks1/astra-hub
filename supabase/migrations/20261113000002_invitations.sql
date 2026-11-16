-- Phase 2: astra_hub_invitations table + helpers
-- Token is stored only as a hash. Raw token is emailed once and never persisted.

create type public.astra_hub_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.astra_hub_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.astra_hub_user_role not null,
  status public.astra_hub_invitation_status not null default 'pending',
  token_hash text not null,
  expires_at timestamptz not null,
  invited_by uuid references public.astra_hub_profiles (id),
  accepted_by uuid references public.astra_hub_profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint astra_hub_invitations_email_normalized check (email = lower(trim(email)))
);

-- Only one active (pending + not expired) invitation per email
create unique index astra_hub_invitations_one_pending_per_email
  on public.astra_hub_invitations (email)
  where status = 'pending';

create index astra_hub_invitations_token_hash_idx on public.astra_hub_invitations (token_hash);
create index astra_hub_invitations_status_idx on public.astra_hub_invitations (status);

alter table public.astra_hub_invitations enable row level security;

-- Only admins can read invitations (UI list). Acceptance uses a security-definer function.
create policy "astra_hub_invitations_admin_select"
  on public.astra_hub_invitations for select
  using (
    exists (
      select 1 from public.astra_hub_profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    )
  );

-- No direct client insert/update/delete. Use server actions + service role or security-definer RPCs.

-- Helper: normalize email
create or replace function public.astra_hub_normalize_email(raw text)
returns text
language sql
immutable
as $$
  select lower(trim(raw));
$$;

-- Allowed domains for invitations (company + gmail only when explicitly invited)
create or replace function public.astra_hub_is_allowed_invitation_email(email text)
returns boolean
language plpgsql
immutable
as $$
declare
  e text := public.astra_hub_normalize_email(email);
  domain text;
begin
  domain := split_part(e, '@', 2);
  -- Exact domain boundary checks (no lookalikes)
  if domain = 'astragroupph.com' then
    return true;
  end if;
  if domain = 'gmail.com' then
    return true; -- still requires an explicit invitation row
  end if;
  return false;
end;
$$;

comment on table public.astra_hub_invitations is 'Invite-only onboarding. Store only token_hash; raw token is single-use and emailed.';
