-- Phase 3: channels, DMs, realtime. Hardening + private realtime authorization.

-- ── 1. No direct client writes on core tables (RPC-only) ────────────────────
revoke insert, update, delete on
  public.astra_hub_channels, public.astra_hub_channel_members,
  public.astra_hub_conversations, public.astra_hub_conversation_members,
  public.astra_hub_messages, public.astra_hub_message_attachments,
  public.astra_hub_invitations, public.astra_hub_audit_log
from anon, authenticated;

revoke all on
  public.astra_hub_profiles, public.astra_hub_channels, public.astra_hub_channel_members,
  public.astra_hub_conversations, public.astra_hub_conversation_members,
  public.astra_hub_messages, public.astra_hub_message_attachments, public.astra_hub_invitations,
  public.astra_hub_audit_log, public.astra_hub_notifications, public.astra_hub_push_subscriptions
from anon;

-- ── 2. Admins can see channel metadata (needed to add members to private channels) ──
drop policy if exists "astra_hub_channels_select_admin" on public.astra_hub_channels;
create policy "astra_hub_channels_select_admin"
  on public.astra_hub_channels for select
  using (archived_at is null and public.astra_hub_is_active_admin());

-- ── 3. Mandatory channel: auto-join members/admins when they become active ──
create or replace function public.astra_hub_autojoin_mandatory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and new.role in ('admin', 'member') then
    insert into public.astra_hub_channel_members (channel_id, user_id, membership_role)
    select c.id, new.id, 'member'
    from public.astra_hub_channels c
    where c.is_mandatory and c.archived_at is null
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists astra_hub_profiles_autojoin_mandatory on public.astra_hub_profiles;
create trigger astra_hub_profiles_autojoin_mandatory
  after insert or update of status, role on public.astra_hub_profiles
  for each row execute function public.astra_hub_autojoin_mandatory();

-- ── 4. DM rules: guests only reach conversations an admin assigned ──────────
create or replace function public.astra_hub_get_or_create_direct(p_other_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_id uuid;
  v_me_p public.astra_hub_profiles%rowtype;
  v_other public.astra_hub_profiles%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if p_other_user_id is null or p_other_user_id = v_me then
    return jsonb_build_object('ok', false, 'error', 'cannot_dm_self');
  end if;

  select * into v_me_p from public.astra_hub_profiles where id = v_me and status = 'active';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;

  select * into v_other from public.astra_hub_profiles where id = p_other_user_id and status = 'active';
  if not found then return jsonb_build_object('ok', false, 'error', 'other_not_active'); end if;

  if v_me_p.role = 'guest' then
    return jsonb_build_object('ok', false, 'error', 'guests_cannot_start_dm');
  end if;
  if v_other.role = 'guest' and v_me_p.role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'only_admin_can_dm_guest');
  end if;

  v_key := least(v_me::text, p_other_user_id::text) || ':' || greatest(v_me::text, p_other_user_id::text);

  select id into v_id from public.astra_hub_conversations where direct_key = v_key;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'conversation_id', v_id, 'created', false);
  end if;

  insert into public.astra_hub_conversations (type, direct_key, created_by)
  values ('direct', v_key, v_me) returning id into v_id;

  insert into public.astra_hub_conversation_members (conversation_id, user_id)
  values (v_id, v_me), (v_id, p_other_user_id);

  return jsonb_build_object('ok', true, 'conversation_id', v_id, 'created', true);
exception when unique_violation then
  select id into v_id from public.astra_hub_conversations where direct_key = v_key;
  return jsonb_build_object('ok', true, 'conversation_id', v_id, 'created', false);
end;
$$;

create or replace function public.astra_hub_create_group_dm(p_title text, p_member_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_actor public.astra_hub_profiles%rowtype;
  v_id uuid;
  v_uid uuid;
  v_others uuid[];
begin
  select * into v_actor from public.astra_hub_profiles where id = v_me and status = 'active';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if v_actor.role = 'guest' then
    return jsonb_build_object('ok', false, 'error', 'guests_cannot_create_group_dm');
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_others
  from unnest(coalesce(p_member_ids, '{}')) as x where x <> v_me;

  if cardinality(v_others) < 2 then
    return jsonb_build_object('ok', false, 'error', 'need_two_others');
  end if;
  if cardinality(v_others) > 19 then
    return jsonb_build_object('ok', false, 'error', 'too_many_members');
  end if;
  if length(coalesce(p_title, '')) > 80 then
    return jsonb_build_object('ok', false, 'error', 'title_too_long');
  end if;

  if exists (
    select 1 from unnest(v_others) as uid
    where not exists (select 1 from public.astra_hub_profiles p where p.id = uid and p.status = 'active')
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_member');
  end if;

  if v_actor.role <> 'admin' and exists (
    select 1 from public.astra_hub_profiles p where p.id = any (v_others) and p.role = 'guest'
  ) then
    return jsonb_build_object('ok', false, 'error', 'only_admin_can_add_guest');
  end if;

  insert into public.astra_hub_conversations (type, title, created_by)
  values ('group', nullif(trim(p_title), ''), v_me) returning id into v_id;

  -- membership is fixed here, atomically; there is no add/remove RPC.
  insert into public.astra_hub_conversation_members (conversation_id, user_id)
  select v_id, u from unnest(v_others || v_me) as u;

  return jsonb_build_object('ok', true, 'conversation_id', v_id);
end;
$$;

-- ── 5. Unread counts ────────────────────────────────────────────────────────
create or replace function public.astra_hub_get_unread_counts()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'channels', coalesce((
      select jsonb_object_agg(u.channel_id, u.n) from (
        select cm.channel_id, count(m.id) as n
        from public.astra_hub_channel_members cm
        join public.astra_hub_channels c on c.id = cm.channel_id and c.archived_at is null
        join public.astra_hub_messages m
          on m.channel_id = cm.channel_id and m.deleted_at is null and m.sender_id <> cm.user_id
         and m.created_at > coalesce(cm.last_read_at, cm.joined_at)
        where cm.user_id = auth.uid()
        group by cm.channel_id
      ) u
    ), '{}'::jsonb),
    'conversations', coalesce((
      select jsonb_object_agg(u.conversation_id, u.n) from (
        select cm.conversation_id, count(m.id) as n
        from public.astra_hub_conversation_members cm
        join public.astra_hub_messages m
          on m.conversation_id = cm.conversation_id and m.deleted_at is null and m.sender_id <> cm.user_id
         and m.created_at > coalesce(cm.last_read_at, cm.joined_at)
        where cm.user_id = auth.uid() and cm.left_at is null
        group by cm.conversation_id
      ) u
    ), '{}'::jsonb)
  )
  where public.astra_hub_is_active_user();
$$;

-- ── 6. Realtime: private topics + database-driven signals ───────────────────
-- Topics: channel:<uuid> and conversation:<uuid>. Only members may join/receive/send
-- (broadcast + presence). Dashboard > Realtime settings: turn OFF "Allow public access".

create or replace function public.astra_hub_can_access_realtime_topic(p_topic text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_topic ~ '^channel:[0-9a-fA-F-]{36}$'
      then public.astra_hub_is_channel_member(substr(p_topic, 9)::uuid)
    when p_topic ~ '^conversation:[0-9a-fA-F-]{36}$'
      then public.astra_hub_is_conversation_member(substr(p_topic, 14)::uuid)
    else false
  end;
$$;

drop policy if exists "astra_hub_realtime_receive" on realtime.messages;
drop policy if exists "astra_hub_realtime_send" on realtime.messages;

create policy "astra_hub_realtime_receive"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select public.astra_hub_can_access_realtime_topic(realtime.topic()))
  );

create policy "astra_hub_realtime_send"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select public.astra_hub_can_access_realtime_topic(realtime.topic()))
  );

-- Signal-only payloads (ids, no content). Clients re-fetch the row through RLS, so
-- a forged broadcast can never inject content, and soft-deletes still reach everyone.
create or replace function public.astra_hub_broadcast_message_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_topic text;
begin
  v_topic := case
    when new.channel_id is not null then 'channel:' || new.channel_id::text
    else 'conversation:' || new.conversation_id::text
  end;
  perform realtime.send(
    jsonb_build_object('id', new.id, 'sender_id', new.sender_id),
    case when tg_op = 'INSERT' then 'message_insert' else 'message_update' end,
    v_topic,
    true
  );
  return null;
end;
$$;

drop trigger if exists astra_hub_messages_broadcast on public.astra_hub_messages;
create trigger astra_hub_messages_broadcast
  after insert or update on public.astra_hub_messages
  for each row execute function public.astra_hub_broadcast_message_change();

-- ── 7. Execute grants (re-apply; new functions above) ───────────────────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'astra\_hub\_%'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
