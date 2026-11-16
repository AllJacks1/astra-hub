-- =============================================================================
-- Astra Team Hub — FULL migration Phases 1–4 (idempotent where practical)
-- Tables/enums/functions prefixed with astra_hub_
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE
-- Review once, then run in Supabase SQL Editor (or psql) against your project.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1: profiles + enums
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.astra_hub_user_role as enum ('admin', 'member', 'guest');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.astra_hub_user_status as enum ('invited', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

create table if not exists public.astra_hub_profiles (
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

create index if not exists astra_hub_profiles_role_idx on public.astra_hub_profiles (role);
create index if not exists astra_hub_profiles_status_idx on public.astra_hub_profiles (status);

create or replace function public.astra_hub_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists astra_hub_profiles_set_updated_at on public.astra_hub_profiles;
create trigger astra_hub_profiles_set_updated_at
  before update on public.astra_hub_profiles
  for each row execute function public.astra_hub_set_updated_at();

alter table public.astra_hub_profiles enable row level security;

drop policy if exists "astra_hub_profiles_select_own" on public.astra_hub_profiles;
create policy "astra_hub_profiles_select_own"
  on public.astra_hub_profiles for select
  using (auth.uid() = id);

drop policy if exists "astra_hub_profiles_select_active_directory" on public.astra_hub_profiles;
create policy "astra_hub_profiles_select_active_directory"
  on public.astra_hub_profiles for select
  using (
    status = 'active'
    and exists (
      select 1 from public.astra_hub_profiles me
      where me.id = auth.uid() and me.status = 'active'
    )
  );

drop policy if exists "astra_hub_profiles_update_own_safe_fields" on public.astra_hub_profiles;
create policy "astra_hub_profiles_update_own_safe_fields"
  on public.astra_hub_profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.astra_hub_profiles where id = auth.uid())
    and status = (select status from public.astra_hub_profiles where id = auth.uid())
  );

comment on table public.astra_hub_profiles is 'Application user profile. Role and status are privileged.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: invitations
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.astra_hub_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.astra_hub_invitations (
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

create unique index if not exists astra_hub_invitations_one_pending_per_email
  on public.astra_hub_invitations (email)
  where status = 'pending';

create index if not exists astra_hub_invitations_token_hash_idx on public.astra_hub_invitations (token_hash);
create index if not exists astra_hub_invitations_status_idx on public.astra_hub_invitations (status);

alter table public.astra_hub_invitations enable row level security;

drop policy if exists "astra_hub_invitations_admin_select" on public.astra_hub_invitations;
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

create or replace function public.astra_hub_normalize_email(raw text)
returns text
language sql
immutable
as $$
  select lower(trim(raw));
$$;

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
  if domain = 'astragroupph.com' then
    return true;
  end if;
  if domain = 'gmail.com' then
    return true;
  end if;
  return false;
end;
$$;

comment on table public.astra_hub_invitations is 'Invite-only onboarding. Store only token_hash; raw token is single-use and emailed.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 tables (stub structure)
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.astra_hub_channel_visibility as enum ('public', 'private');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.astra_hub_conversation_type as enum ('direct', 'group');
exception when duplicate_object then null;
end $$;

create table if not exists public.astra_hub_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  visibility public.astra_hub_channel_visibility not null default 'private',
  is_mandatory boolean not null default false,
  created_by uuid references public.astra_hub_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists astra_hub_channels_one_mandatory
  on public.astra_hub_channels ((true))
  where is_mandatory = true;

create table if not exists public.astra_hub_channel_members (
  channel_id uuid not null references public.astra_hub_channels (id) on delete cascade,
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  membership_role text not null default 'member',
  joined_at timestamptz not null default now(),
  added_by uuid references public.astra_hub_profiles (id),
  last_read_at timestamptz,
  primary key (channel_id, user_id)
);

create table if not exists public.astra_hub_conversations (
  id uuid primary key default gen_random_uuid(),
  type public.astra_hub_conversation_type not null,
  title text,
  direct_key text unique,
  created_by uuid references public.astra_hub_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.astra_hub_conversation_members (
  conversation_id uuid not null references public.astra_hub_conversations (id) on delete cascade,
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.astra_hub_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.astra_hub_channels (id) on delete cascade,
  conversation_id uuid references public.astra_hub_conversations (id) on delete cascade,
  sender_id uuid not null references public.astra_hub_profiles (id),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint astra_hub_messages_parent_xor check (
    (channel_id is not null and conversation_id is null)
    or (channel_id is null and conversation_id is not null)
  )
);

create index if not exists astra_hub_messages_channel_created_idx
  on public.astra_hub_messages (channel_id, created_at desc);
create index if not exists astra_hub_messages_conversation_created_idx
  on public.astra_hub_messages (conversation_id, created_at desc);

alter table public.astra_hub_channels enable row level security;
alter table public.astra_hub_channel_members enable row level security;
alter table public.astra_hub_conversations enable row level security;
alter table public.astra_hub_conversation_members enable row level security;
alter table public.astra_hub_messages enable row level security;

-- Ensure last_read_at exists if table was created earlier without it
alter table public.astra_hub_channel_members
  add column if not exists last_read_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 tables (attachments, notifications, push)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.astra_hub_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.astra_hub_messages (id) on delete cascade,
  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  uploaded_by uuid not null references public.astra_hub_profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists astra_hub_message_attachments_message_idx
  on public.astra_hub_message_attachments (message_id);

create table if not exists public.astra_hub_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  type text not null,
  message_id uuid references public.astra_hub_messages (id) on delete set null,
  channel_id uuid references public.astra_hub_channels (id) on delete set null,
  conversation_id uuid references public.astra_hub_conversations (id) on delete set null,
  actor_id uuid references public.astra_hub_profiles (id),
  title text not null,
  body_preview text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists astra_hub_notifications_user_created_idx
  on public.astra_hub_notifications (user_id, created_at desc);

create table if not exists public.astra_hub_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, endpoint)
);

alter table public.astra_hub_message_attachments enable row level security;
alter table public.astra_hub_notifications enable row level security;
alter table public.astra_hub_push_subscriptions enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 cont.: audit log + invitation RPCs
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.astra_hub_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.astra_hub_profiles (id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists astra_hub_audit_log_created_idx on public.astra_hub_audit_log (created_at desc);
create index if not exists astra_hub_audit_log_actor_idx on public.astra_hub_audit_log (actor_id);

alter table public.astra_hub_audit_log enable row level security;

drop policy if exists "astra_hub_audit_log_admin_select" on public.astra_hub_audit_log;
create policy "astra_hub_audit_log_admin_select"
  on public.astra_hub_audit_log for select
  using (
    exists (
      select 1 from public.astra_hub_profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    )
  );

create or replace function public.astra_hub_accept_invitation(
  p_token_hash text,
  p_user_id uuid,
  p_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.astra_hub_invitations%rowtype;
  v_email text := public.astra_hub_normalize_email(p_user_email);
  v_profile public.astra_hub_profiles%rowtype;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if p_user_id is null or v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_user');
  end if;

  select * into v_inv
  from public.astra_hub_invitations
  where token_hash = p_token_hash
    and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invitation_not_found_or_used');
  end if;

  if v_inv.expires_at <= now() then
    update public.astra_hub_invitations
      set status = 'expired'
      where id = v_inv.id;
    return jsonb_build_object('ok', false, 'error', 'invitation_expired');
  end if;

  if public.astra_hub_normalize_email(v_inv.email) <> v_email then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  insert into public.astra_hub_profiles (id, email, role, status, full_name)
  values (
    p_user_id,
    v_email,
    v_inv.role,
    'active',
    coalesce(
      (select raw_user_meta_data->>'full_name' from auth.users where id = p_user_id),
      (select raw_user_meta_data->>'name' from auth.users where id = p_user_id),
      split_part(v_email, '@', 1)
    )
  )
  on conflict (id) do update
    set
      email = excluded.email,
      role = excluded.role,
      status = 'active',
      updated_at = now()
  returning * into v_profile;

  update public.astra_hub_invitations
  set
    status = 'accepted',
    accepted_by = p_user_id,
    accepted_at = now()
  where id = v_inv.id;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    p_user_id,
    'invitation_accepted',
    'invitation',
    v_inv.id,
    jsonb_build_object('email', v_email, 'role', v_inv.role)
  );

  return jsonb_build_object(
    'ok', true,
    'profile_id', v_profile.id,
    'role', v_profile.role,
    'status', v_profile.status
  );
end;
$$;

revoke all on function public.astra_hub_accept_invitation(text, uuid, text) from public;
grant execute on function public.astra_hub_accept_invitation(text, uuid, text) to authenticated;

create or replace function public.astra_hub_create_invitation(
  p_email text,
  p_role public.astra_hub_user_role,
  p_token_hash text,
  p_expires_at timestamptz,
  p_invited_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.astra_hub_normalize_email(p_email);
  v_id uuid;
  v_actor public.astra_hub_profiles%rowtype;
begin
  select * into v_actor
  from public.astra_hub_profiles
  where id = p_invited_by and role = 'admin' and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if not public.astra_hub_is_allowed_invitation_email(v_email) then
    return jsonb_build_object('ok', false, 'error', 'email_domain_not_allowed');
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token_hash');
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  update public.astra_hub_invitations
  set status = 'revoked'
  where email = v_email and status = 'pending';

  insert into public.astra_hub_invitations (email, role, status, token_hash, expires_at, invited_by)
  values (v_email, p_role, 'pending', p_token_hash, p_expires_at, p_invited_by)
  returning id into v_id;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    p_invited_by,
    'invitation_created',
    'invitation',
    v_id,
    jsonb_build_object('email', v_email, 'role', p_role, 'expires_at', p_expires_at)
  );

  return jsonb_build_object('ok', true, 'invitation_id', v_id, 'email', v_email);
end;
$$;

revoke all on function public.astra_hub_create_invitation(text, public.astra_hub_user_role, text, timestamptz, uuid) from public;
grant execute on function public.astra_hub_create_invitation(text, public.astra_hub_user_role, text, timestamptz, uuid) to authenticated;

create or replace function public.astra_hub_revoke_invitation(
  p_invitation_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.astra_hub_profiles%rowtype;
  v_inv public.astra_hub_invitations%rowtype;
begin
  select * into v_actor
  from public.astra_hub_profiles
  where id = p_actor_id and role = 'admin' and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  update public.astra_hub_invitations
  set status = 'revoked'
  where id = p_invitation_id and status = 'pending'
  returning * into v_inv;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_not_pending');
  end if;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    p_actor_id,
    'invitation_revoked',
    'invitation',
    p_invitation_id,
    jsonb_build_object('email', v_inv.email)
  );

  return jsonb_build_object('ok', true, 'invitation_id', p_invitation_id);
end;
$$;

revoke all on function public.astra_hub_revoke_invitation(uuid, uuid) from public;
grant execute on function public.astra_hub_revoke_invitation(uuid, uuid) to authenticated;

create or replace function public.astra_hub_set_user_status(
  p_target_user_id uuid,
  p_new_status public.astra_hub_user_status,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.astra_hub_profiles%rowtype;
begin
  select * into v_actor
  from public.astra_hub_profiles
  where id = p_actor_id and role = 'admin' and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if p_target_user_id = p_actor_id and p_new_status = 'suspended' then
    return jsonb_build_object('ok', false, 'error', 'cannot_suspend_self');
  end if;

  update public.astra_hub_profiles
  set status = p_new_status, updated_at = now()
  where id = p_target_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    p_actor_id,
    'user_status_changed',
    'profile',
    p_target_user_id,
    jsonb_build_object('new_status', p_new_status)
  );

  return jsonb_build_object('ok', true, 'user_id', p_target_user_id, 'status', p_new_status);
end;
$$;

revoke all on function public.astra_hub_set_user_status(uuid, public.astra_hub_user_status, uuid) from public;
grant execute on function public.astra_hub_set_user_status(uuid, public.astra_hub_user_status, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: membership helpers + RLS + messaging RPCs
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.astra_hub_current_profile()
returns public.astra_hub_profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.astra_hub_profiles p
  where p.id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.astra_hub_is_active_member_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.astra_hub_profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'member')
  );
$$;

create or replace function public.astra_hub_is_channel_member(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.astra_hub_channel_members cm
    join public.astra_hub_profiles p on p.id = cm.user_id
    where cm.channel_id = p_channel_id
      and cm.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

create or replace function public.astra_hub_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.astra_hub_conversation_members cm
    join public.astra_hub_profiles p on p.id = cm.user_id
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
      and cm.left_at is null
      and p.status = 'active'
  );
$$;

-- Drop deny-all and recreate real policies
drop policy if exists "astra_hub_channels_deny_all" on public.astra_hub_channels;
drop policy if exists "astra_hub_channel_members_deny_all" on public.astra_hub_channel_members;
drop policy if exists "astra_hub_conversations_deny_all" on public.astra_hub_conversations;
drop policy if exists "astra_hub_conversation_members_deny_all" on public.astra_hub_conversation_members;
drop policy if exists "astra_hub_messages_deny_all" on public.astra_hub_messages;

drop policy if exists "astra_hub_channels_select" on public.astra_hub_channels;
create policy "astra_hub_channels_select"
  on public.astra_hub_channels for select
  using (
    archived_at is null
    and (
      public.astra_hub_is_channel_member(id)
      or (
        visibility = 'public'
        and public.astra_hub_is_active_member_or_admin()
      )
    )
  );

drop policy if exists "astra_hub_channel_members_select" on public.astra_hub_channel_members;
create policy "astra_hub_channel_members_select"
  on public.astra_hub_channel_members for select
  using (
    public.astra_hub_is_channel_member(channel_id)
    or (
      exists (
        select 1 from public.astra_hub_channels c
        where c.id = channel_id
          and c.visibility = 'public'
          and c.archived_at is null
      )
      and public.astra_hub_is_active_member_or_admin()
    )
  );

drop policy if exists "astra_hub_conversations_select" on public.astra_hub_conversations;
create policy "astra_hub_conversations_select"
  on public.astra_hub_conversations for select
  using (public.astra_hub_is_conversation_member(id));

drop policy if exists "astra_hub_conversation_members_select" on public.astra_hub_conversation_members;
create policy "astra_hub_conversation_members_select"
  on public.astra_hub_conversation_members for select
  using (public.astra_hub_is_conversation_member(conversation_id));

drop policy if exists "astra_hub_messages_select" on public.astra_hub_messages;
create policy "astra_hub_messages_select"
  on public.astra_hub_messages for select
  using (
    deleted_at is null
    and (
      (channel_id is not null and public.astra_hub_is_channel_member(channel_id))
      or (conversation_id is not null and public.astra_hub_is_conversation_member(conversation_id))
    )
  );

create or replace function public.astra_hub_create_channel(
  p_name text,
  p_description text,
  p_visibility public.astra_hub_channel_visibility,
  p_is_mandatory boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.astra_hub_profiles%rowtype;
  v_id uuid;
begin
  select * into v_actor from public.astra_hub_profiles
  where id = auth.uid() and role = 'admin' and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if p_name is null or length(trim(p_name)) < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;

  if p_is_mandatory then
    if exists (select 1 from public.astra_hub_channels where is_mandatory) then
      return jsonb_build_object('ok', false, 'error', 'mandatory_exists');
    end if;
  end if;

  insert into public.astra_hub_channels (name, description, visibility, is_mandatory, created_by)
  values (trim(p_name), nullif(trim(p_description), ''), p_visibility, coalesce(p_is_mandatory, false), v_actor.id)
  returning id into v_id;

  insert into public.astra_hub_channel_members (channel_id, user_id, membership_role, added_by)
  values (v_id, v_actor.id, 'owner', v_actor.id);

  if coalesce(p_is_mandatory, false) then
    insert into public.astra_hub_channel_members (channel_id, user_id, membership_role, added_by)
    select v_id, p.id, 'member', v_actor.id
    from public.astra_hub_profiles p
    where p.status = 'active' and p.role in ('admin', 'member') and p.id <> v_actor.id
    on conflict do nothing;
  end if;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor.id, 'channel_created', 'channel', v_id,
    jsonb_build_object('name', p_name, 'visibility', p_visibility, 'mandatory', p_is_mandatory));

  return jsonb_build_object('ok', true, 'channel_id', v_id);
end;
$$;

revoke all on function public.astra_hub_create_channel(text, text, public.astra_hub_channel_visibility, boolean) from public;
grant execute on function public.astra_hub_create_channel(text, text, public.astra_hub_channel_visibility, boolean) to authenticated;

create or replace function public.astra_hub_join_public_channel(p_channel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.astra_hub_profiles%rowtype;
  v_ch public.astra_hub_channels%rowtype;
begin
  select * into v_actor from public.astra_hub_profiles
  where id = auth.uid() and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if v_actor.role = 'guest' then
    return jsonb_build_object('ok', false, 'error', 'guests_cannot_join');
  end if;

  select * into v_ch from public.astra_hub_channels
  where id = p_channel_id and archived_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_ch.visibility <> 'public' then
    return jsonb_build_object('ok', false, 'error', 'not_public');
  end if;

  insert into public.astra_hub_channel_members (channel_id, user_id, membership_role, added_by)
  values (p_channel_id, v_actor.id, 'member', v_actor.id)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'channel_id', p_channel_id);
end;
$$;

revoke all on function public.astra_hub_join_public_channel(uuid) from public;
grant execute on function public.astra_hub_join_public_channel(uuid) to authenticated;

create or replace function public.astra_hub_add_channel_member(
  p_channel_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.astra_hub_profiles%rowtype;
begin
  select * into v_actor from public.astra_hub_profiles
  where id = auth.uid() and role = 'admin' and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if not exists (select 1 from public.astra_hub_channels where id = p_channel_id and archived_at is null) then
    return jsonb_build_object('ok', false, 'error', 'channel_not_found');
  end if;

  if not exists (select 1 from public.astra_hub_profiles where id = p_user_id and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'user_not_active');
  end if;

  insert into public.astra_hub_channel_members (channel_id, user_id, membership_role, added_by)
  values (p_channel_id, p_user_id, 'member', v_actor.id)
  on conflict do nothing;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor.id, 'channel_member_added', 'channel', p_channel_id,
    jsonb_build_object('user_id', p_user_id));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_add_channel_member(uuid, uuid) from public;
grant execute on function public.astra_hub_add_channel_member(uuid, uuid) to authenticated;

create or replace function public.astra_hub_leave_channel(p_channel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ch public.astra_hub_channels%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_ch from public.astra_hub_channels where id = p_channel_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_ch.is_mandatory then
    return jsonb_build_object('ok', false, 'error', 'cannot_leave_mandatory');
  end if;

  delete from public.astra_hub_channel_members
  where channel_id = p_channel_id and user_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_leave_channel(uuid) from public;
grant execute on function public.astra_hub_leave_channel(uuid) to authenticated;

create or replace function public.astra_hub_get_or_create_direct(p_other_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_id uuid;
  v_me_profile public.astra_hub_profiles%rowtype;
  v_other public.astra_hub_profiles%rowtype;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_other_user_id = v_me then
    return jsonb_build_object('ok', false, 'error', 'cannot_dm_self');
  end if;

  select * into v_me_profile from public.astra_hub_profiles where id = v_me and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  select * into v_other from public.astra_hub_profiles where id = p_other_user_id and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'other_not_active');
  end if;

  v_key := least(v_me::text, p_other_user_id::text) || ':' || greatest(v_me::text, p_other_user_id::text);

  select id into v_id from public.astra_hub_conversations where direct_key = v_key;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'conversation_id', v_id, 'created', false);
  end if;

  insert into public.astra_hub_conversations (type, direct_key, created_by)
  values ('direct', v_key, v_me)
  returning id into v_id;

  insert into public.astra_hub_conversation_members (conversation_id, user_id)
  values (v_id, v_me), (v_id, p_other_user_id);

  return jsonb_build_object('ok', true, 'conversation_id', v_id, 'created', true);
exception
  when unique_violation then
    select id into v_id from public.astra_hub_conversations where direct_key = v_key;
    return jsonb_build_object('ok', true, 'conversation_id', v_id, 'created', false);
end;
$$;

revoke all on function public.astra_hub_get_or_create_direct(uuid) from public;
grant execute on function public.astra_hub_get_or_create_direct(uuid) to authenticated;

create or replace function public.astra_hub_create_group_dm(
  p_title text,
  p_member_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_actor public.astra_hub_profiles%rowtype;
  v_id uuid;
  v_uid uuid;
  v_members uuid[];
begin
  select * into v_actor from public.astra_hub_profiles where id = v_me and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if v_actor.role = 'guest' then
    return jsonb_build_object('ok', false, 'error', 'guests_cannot_create_group_dm');
  end if;

  if p_member_ids is null or cardinality(p_member_ids) < 1 then
    return jsonb_build_object('ok', false, 'error', 'need_members');
  end if;

  select array_agg(distinct x) into v_members
  from unnest(p_member_ids || v_me) as x;

  if exists (
    select 1 from unnest(v_members) as uid
    where not exists (
      select 1 from public.astra_hub_profiles p where p.id = uid and p.status = 'active'
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_member');
  end if;

  insert into public.astra_hub_conversations (type, title, created_by)
  values ('group', nullif(trim(p_title), ''), v_me)
  returning id into v_id;

  foreach v_uid in array v_members loop
    insert into public.astra_hub_conversation_members (conversation_id, user_id)
    values (v_id, v_uid);
  end loop;

  return jsonb_build_object('ok', true, 'conversation_id', v_id);
end;
$$;

revoke all on function public.astra_hub_create_group_dm(text, uuid[]) from public;
grant execute on function public.astra_hub_create_group_dm(text, uuid[]) to authenticated;

create or replace function public.astra_hub_send_message(
  p_channel_id uuid,
  p_conversation_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_body text := nullif(trim(p_body), '');
  v_id uuid;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not exists (select 1 from public.astra_hub_profiles where id = v_me and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if (p_channel_id is null and p_conversation_id is null)
     or (p_channel_id is not null and p_conversation_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'invalid_parent');
  end if;

  if v_body is null or length(v_body) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_body');
  end if;

  if length(v_body) > 8000 then
    return jsonb_build_object('ok', false, 'error', 'body_too_long');
  end if;

  if p_channel_id is not null then
    if not public.astra_hub_is_channel_member(p_channel_id) then
      return jsonb_build_object('ok', false, 'error', 'not_channel_member');
    end if;
  else
    if not public.astra_hub_is_conversation_member(p_conversation_id) then
      return jsonb_build_object('ok', false, 'error', 'not_conversation_member');
    end if;
  end if;

  insert into public.astra_hub_messages (channel_id, conversation_id, sender_id, body)
  values (p_channel_id, p_conversation_id, v_me, v_body)
  returning id into v_id;

  if p_conversation_id is not null then
    update public.astra_hub_conversations set updated_at = now() where id = p_conversation_id;
  end if;
  if p_channel_id is not null then
    update public.astra_hub_channels set updated_at = now() where id = p_channel_id;
  end if;

  return jsonb_build_object('ok', true, 'message_id', v_id);
end;
$$;

revoke all on function public.astra_hub_send_message(uuid, uuid, text) from public;
grant execute on function public.astra_hub_send_message(uuid, uuid, text) to authenticated;

create or replace function public.astra_hub_edit_message(
  p_message_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_msg public.astra_hub_messages%rowtype;
  v_body text := nullif(trim(p_body), '');
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_msg from public.astra_hub_messages where id = p_message_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_msg.sender_id <> v_me then
    return jsonb_build_object('ok', false, 'error', 'not_author');
  end if;

  if v_msg.created_at < (now() - interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'edit_window_expired');
  end if;

  if v_body is null or length(v_body) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_body');
  end if;

  update public.astra_hub_messages
  set body = v_body, edited_at = now(), updated_at = now()
  where id = p_message_id;

  return jsonb_build_object('ok', true, 'message_id', p_message_id);
end;
$$;

revoke all on function public.astra_hub_edit_message(uuid, text) from public;
grant execute on function public.astra_hub_edit_message(uuid, text) to authenticated;

create or replace function public.astra_hub_soft_delete_message(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_msg public.astra_hub_messages%rowtype;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_msg from public.astra_hub_messages where id = p_message_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_msg.sender_id <> v_me then
    return jsonb_build_object('ok', false, 'error', 'not_author');
  end if;

  update public.astra_hub_messages
  set deleted_at = now(), updated_at = now()
  where id = p_message_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_soft_delete_message(uuid) from public;
grant execute on function public.astra_hub_soft_delete_message(uuid) to authenticated;

create or replace function public.astra_hub_mark_conversation_read(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.astra_hub_is_conversation_member(p_conversation_id) then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  update public.astra_hub_conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_mark_conversation_read(uuid) from public;
grant execute on function public.astra_hub_mark_conversation_read(uuid) to authenticated;

create or replace function public.astra_hub_mark_channel_read(p_channel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.astra_hub_is_channel_member(p_channel_id) then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  update public.astra_hub_channel_members
  set last_read_at = now()
  where channel_id = p_channel_id and user_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_mark_channel_read(uuid) from public;
grant execute on function public.astra_hub_mark_channel_read(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4: attachment limit, RLS, register/notify/push RPCs
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.astra_hub_enforce_attachment_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.astra_hub_message_attachments
  where message_id = new.message_id;

  if tg_op = 'INSERT' then
    if v_count >= 10 then
      raise exception 'attachment_limit_exceeded' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists astra_hub_message_attachments_limit on public.astra_hub_message_attachments;
create trigger astra_hub_message_attachments_limit
  before insert on public.astra_hub_message_attachments
  for each row execute function public.astra_hub_enforce_attachment_limit();

drop policy if exists "astra_hub_message_attachments_deny_all" on public.astra_hub_message_attachments;
drop policy if exists "astra_hub_notifications_deny_all" on public.astra_hub_notifications;
drop policy if exists "astra_hub_push_subscriptions_deny_all" on public.astra_hub_push_subscriptions;

drop policy if exists "astra_hub_message_attachments_select" on public.astra_hub_message_attachments;
create policy "astra_hub_message_attachments_select"
  on public.astra_hub_message_attachments for select
  using (
    exists (
      select 1
      from public.astra_hub_messages m
      where m.id = message_id
        and m.deleted_at is null
        and (
          (m.channel_id is not null and public.astra_hub_is_channel_member(m.channel_id))
          or (m.conversation_id is not null and public.astra_hub_is_conversation_member(m.conversation_id))
        )
    )
  );

drop policy if exists "astra_hub_notifications_select_own" on public.astra_hub_notifications;
create policy "astra_hub_notifications_select_own"
  on public.astra_hub_notifications for select
  using (user_id = auth.uid());

drop policy if exists "astra_hub_notifications_update_own" on public.astra_hub_notifications;
create policy "astra_hub_notifications_update_own"
  on public.astra_hub_notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "astra_hub_push_subscriptions_select_own" on public.astra_hub_push_subscriptions;
create policy "astra_hub_push_subscriptions_select_own"
  on public.astra_hub_push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "astra_hub_push_subscriptions_delete_own" on public.astra_hub_push_subscriptions;
create policy "astra_hub_push_subscriptions_delete_own"
  on public.astra_hub_push_subscriptions for delete
  using (user_id = auth.uid());

create or replace function public.astra_hub_upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.astra_hub_profiles where id = v_me and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;
  if p_endpoint is null or p_p256dh is null or p_auth is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_subscription');
  end if;

  insert into public.astra_hub_push_subscriptions (user_id, endpoint, p256dh, auth, last_seen_at, revoked_at)
  values (v_me, p_endpoint, p_p256dh, p_auth, now(), null)
  on conflict (user_id, endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        last_seen_at = now(),
        revoked_at = null
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.astra_hub_upsert_push_subscription(text, text, text) from public;
grant execute on function public.astra_hub_upsert_push_subscription(text, text, text) to authenticated;

create or replace function public.astra_hub_revoke_push_subscription(p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.astra_hub_push_subscriptions
  set revoked_at = now()
  where user_id = auth.uid() and endpoint = p_endpoint;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_revoke_push_subscription(text) from public;
grant execute on function public.astra_hub_revoke_push_subscription(text) to authenticated;

create or replace function public.astra_hub_mark_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.astra_hub_notifications
  set read_at = now()
  where id = p_notification_id and user_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_mark_notification_read(uuid) from public;
grant execute on function public.astra_hub_mark_notification_read(uuid) to authenticated;

create or replace function public.astra_hub_mark_all_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.astra_hub_notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_mark_all_notifications_read() from public;
grant execute on function public.astra_hub_mark_all_notifications_read() to authenticated;

create or replace function public.astra_hub_register_attachment(
  p_message_id uuid,
  p_storage_path text,
  p_original_file_name text,
  p_mime_type text,
  p_file_size bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_msg public.astra_hub_messages%rowtype;
  v_id uuid;
  v_allowed text[] := array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'video/mp4'
  ];
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_file_size is null or p_file_size <= 0 or p_file_size > 20971520 then
    return jsonb_build_object('ok', false, 'error', 'file_too_large');
  end if;

  if p_mime_type is null or not (lower(p_mime_type) = any (v_allowed)) then
    return jsonb_build_object('ok', false, 'error', 'mime_not_allowed');
  end if;

  if p_original_file_name ~* '\.(svg|exe|bat|cmd|scr|js|msi|dll|zip)$' then
    return jsonb_build_object('ok', false, 'error', 'extension_not_allowed');
  end if;

  select * into v_msg from public.astra_hub_messages where id = p_message_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'message_not_found');
  end if;

  if v_msg.sender_id <> v_me then
    return jsonb_build_object('ok', false, 'error', 'not_message_author');
  end if;

  if v_msg.channel_id is not null and not public.astra_hub_is_channel_member(v_msg.channel_id) then
    return jsonb_build_object('ok', false, 'error', 'not_channel_member');
  end if;
  if v_msg.conversation_id is not null and not public.astra_hub_is_conversation_member(v_msg.conversation_id) then
    return jsonb_build_object('ok', false, 'error', 'not_conversation_member');
  end if;

  begin
    insert into public.astra_hub_message_attachments (
      message_id, storage_path, original_file_name, mime_type, file_size, uploaded_by
    ) values (
      p_message_id, p_storage_path, p_original_file_name, lower(p_mime_type), p_file_size, v_me
    )
    returning id into v_id;
  exception
    when raise_exception then
      return jsonb_build_object('ok', false, 'error', 'attachment_limit_exceeded');
  end;

  return jsonb_build_object('ok', true, 'attachment_id', v_id);
end;
$$;

revoke all on function public.astra_hub_register_attachment(uuid, text, text, text, bigint) from public;
grant execute on function public.astra_hub_register_attachment(uuid, text, text, text, bigint) to authenticated;

create or replace function public.astra_hub_notify_message_recipients(
  p_message_id uuid,
  p_title text,
  p_body_preview text,
  p_mention_user_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.astra_hub_messages%rowtype;
  v_type text;
  v_recipient uuid;
begin
  select * into v_msg from public.astra_hub_messages where id = p_message_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'message_not_found');
  end if;

  if v_msg.conversation_id is not null then
    select case
      when c.type = 'direct' then 'direct_message'
      else 'group_message'
    end into v_type
    from public.astra_hub_conversations c where c.id = v_msg.conversation_id;

    for v_recipient in
      select cm.user_id
      from public.astra_hub_conversation_members cm
      join public.astra_hub_profiles p on p.id = cm.user_id
      where cm.conversation_id = v_msg.conversation_id
        and cm.left_at is null
        and cm.user_id <> v_msg.sender_id
        and p.status = 'active'
    loop
      insert into public.astra_hub_notifications (
        user_id, type, message_id, conversation_id, actor_id, title, body_preview
      ) values (
        v_recipient, v_type, p_message_id, v_msg.conversation_id, v_msg.sender_id,
        p_title, left(coalesce(p_body_preview, ''), 200)
      );
    end loop;

  elsif v_msg.channel_id is not null and p_mention_user_ids is not null then
    v_type := 'channel_mention';
    foreach v_recipient in array p_mention_user_ids loop
      if v_recipient = v_msg.sender_id then
        continue;
      end if;
      if not exists (
        select 1 from public.astra_hub_channel_members cm
        join public.astra_hub_profiles p on p.id = cm.user_id
        where cm.channel_id = v_msg.channel_id and cm.user_id = v_recipient and p.status = 'active'
      ) then
        continue;
      end if;

      insert into public.astra_hub_notifications (
        user_id, type, message_id, channel_id, actor_id, title, body_preview
      ) values (
        v_recipient, v_type, p_message_id, v_msg.channel_id, v_msg.sender_id,
        p_title, left(coalesce(p_body_preview, ''), 200)
      );
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.astra_hub_notify_message_recipients(uuid, text, text, uuid[]) from public;
grant execute on function public.astra_hub_notify_message_recipients(uuid, text, text, uuid[]) to authenticated;

-- =============================================================================
-- DONE — Phases 1–4 schema, RLS, and RPCs
-- Next: create private Storage bucket "astra-hub-attachments" in Dashboard
-- Optional: run scripts/seed-mandatory-channel.sql after first admin exists
-- =============================================================================
