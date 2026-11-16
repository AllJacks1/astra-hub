-- Phase 3 stubs — expand in implementation
-- These create the core tables with the product-policy invariants.
-- Full RLS and membership policies must be completed before exposing messaging.

create type public.astra_hub_channel_visibility as enum ('public', 'private');
create type public.astra_hub_conversation_type as enum ('direct', 'group');

-- ── Channels ──────────────────────────────────────────────────
create table public.astra_hub_channels (
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

create unique index astra_hub_channels_one_mandatory
  on public.astra_hub_channels ((true))
  where is_mandatory = true;

create table public.astra_hub_channel_members (
  channel_id uuid not null references public.astra_hub_channels (id) on delete cascade,
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  membership_role text not null default 'member', -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  added_by uuid references public.astra_hub_profiles (id),
  primary key (channel_id, user_id)
);

-- ── Conversations (DMs) ───────────────────────────────────────
create table public.astra_hub_conversations (
  id uuid primary key default gen_random_uuid(),
  type public.astra_hub_conversation_type not null,
  title text, -- null for 1:1
  -- Canonical key for 1:1 uniqueness: sorted pair of user ids
  direct_key text unique,
  created_by uuid references public.astra_hub_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.astra_hub_conversation_members (
  conversation_id uuid not null references public.astra_hub_conversations (id) on delete cascade,
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

-- ── Messages (single table for channels + DMs) ────────────────
create table public.astra_hub_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.astra_hub_channels (id) on delete cascade,
  conversation_id uuid references public.astra_hub_conversations (id) on delete cascade,
  sender_id uuid not null references public.astra_hub_profiles (id),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz, -- soft delete only
  constraint astra_hub_messages_parent_xor check (
    (channel_id is not null and conversation_id is null)
    or (channel_id is null and conversation_id is not null)
  )
);

create index astra_hub_messages_channel_created_idx
  on public.astra_hub_messages (channel_id, created_at desc);
create index astra_hub_messages_conversation_created_idx
  on public.astra_hub_messages (conversation_id, created_at desc);

-- Enable RLS (policies to be written carefully in Phase 3)
alter table public.astra_hub_channels enable row level security;
alter table public.astra_hub_channel_members enable row level security;
alter table public.astra_hub_conversations enable row level security;
alter table public.astra_hub_conversation_members enable row level security;
alter table public.astra_hub_messages enable row level security;

-- Placeholder deny-all until real policies are added
-- (prevents accidental open access during development)
create policy "astra_hub_channels_deny_all"
  on public.astra_hub_channels for all using (false);
create policy "astra_hub_channel_members_deny_all"
  on public.astra_hub_channel_members for all using (false);
create policy "astra_hub_conversations_deny_all"
  on public.astra_hub_conversations for all using (false);
create policy "astra_hub_conversation_members_deny_all"
  on public.astra_hub_conversation_members for all using (false);
create policy "astra_hub_messages_deny_all"
  on public.astra_hub_messages for all using (false);

comment on table public.astra_hub_channels is 'Public/private channels. Only admins create. is_mandatory prevents leave.';
comment on table public.astra_hub_conversations is '1:1 and group DMs. Group membership fixed at creation per product policy.';
comment on table public.astra_hub_messages is 'Single messages table. Soft-delete only. Edit window = 15 min from created_at.';
