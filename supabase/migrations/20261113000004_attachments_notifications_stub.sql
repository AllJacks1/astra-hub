-- Phase 4 stubs — attachments + notifications + push subscriptions

create table public.astra_hub_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.astra_hub_messages (id) on delete cascade,
  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520), -- 20 MB
  uploaded_by uuid not null references public.astra_hub_profiles (id),
  created_at timestamptz not null default now()
);

create index astra_hub_message_attachments_message_idx
  on public.astra_hub_message_attachments (message_id);

-- Enforce ≤10 attachments per message (application must also check atomically)
-- A deferred constraint trigger or application-level lock is recommended for concurrent uploads.

create table public.astra_hub_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.astra_hub_profiles (id) on delete cascade,
  type text not null, -- 'direct_message' | 'group_message' | 'channel_mention' | 'invitation' | 'system'
  message_id uuid references public.astra_hub_messages (id) on delete set null,
  channel_id uuid references public.astra_hub_channels (id) on delete set null,
  conversation_id uuid references public.astra_hub_conversations (id) on delete set null,
  actor_id uuid references public.astra_hub_profiles (id),
  title text not null,
  body_preview text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index astra_hub_notifications_user_created_idx
  on public.astra_hub_notifications (user_id, created_at desc);

create table public.astra_hub_push_subscriptions (
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

-- Deny-all placeholders until real policies are written
create policy "astra_hub_message_attachments_deny_all"
  on public.astra_hub_message_attachments for all using (false);
create policy "astra_hub_notifications_deny_all"
  on public.astra_hub_notifications for all using (false);
create policy "astra_hub_push_subscriptions_deny_all"
  on public.astra_hub_push_subscriptions for all using (false);

comment on table public.astra_hub_message_attachments is 'Private storage metadata. Max 20 MB. Access via parent message membership.';
comment on table public.astra_hub_notifications is 'In-app notifications. Users read/update only their own rows.';
comment on table public.astra_hub_push_subscriptions is 'Web Push device subscriptions. Users manage only their own.';
