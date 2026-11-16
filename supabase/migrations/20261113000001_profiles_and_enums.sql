-- Phase 1 baseline: astra_hub_profiles + enums
-- Apply with: supabase db push  (or your preferred workflow)

-- Roles and statuses used by the application
create type public.astra_hub_user_role as enum ('admin', 'member', 'guest');
create type public.astra_hub_user_status as enum ('invited', 'active', 'suspended');

-- Profiles (1:1 with auth.users)
create table public.astra_hub_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.astra_hub_user_role not null default 'member',
  status public.astra_hub_user_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint astra_hub_profiles_email_unique unique (email)
);

create index astra_hub_profiles_role_idx on public.astra_hub_profiles (role);
create index astra_hub_profiles_status_idx on public.astra_hub_profiles (status);

-- Keep updated_at fresh
create or replace function public.astra_hub_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger astra_hub_profiles_set_updated_at
  before update on public.astra_hub_profiles
  for each row execute function public.astra_hub_set_updated_at();

-- RLS
alter table public.astra_hub_profiles enable row level security;

-- Users can read their own profile and (later) limited directory fields of active users.
-- Tighten directory policy in later migrations once the people page requirements are clear.
create policy "astra_hub_profiles_select_own"
  on public.astra_hub_profiles for select
  using (auth.uid() = id);

create policy "astra_hub_profiles_select_active_directory"
  on public.astra_hub_profiles for select
  using (
    status = 'active'
    and exists (
      select 1 from public.astra_hub_profiles me
      where me.id = auth.uid() and me.status = 'active'
    )
  );

-- Users may update only non-privileged fields of their own profile.
-- Role and status must never be client-updatable.
create policy "astra_hub_profiles_update_own_safe_fields"
  on public.astra_hub_profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.astra_hub_profiles where id = auth.uid())
    and status = (select status from public.astra_hub_profiles where id = auth.uid())
  );

-- No direct insert/delete from clients. Profile creation happens via trusted invitation acceptance.
-- Service-role / security-definer functions will handle privileged writes.

comment on table public.astra_hub_profiles is 'Application user profile. Role and status are privileged.';
