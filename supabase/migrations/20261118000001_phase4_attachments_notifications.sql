-- Phase 4: attachments, notifications, push, email preferences, live signals.

-- ── 1. Columns & grants ─────────────────────────────────────────────────────
alter table public.astra_hub_notifications
  add column if not exists emailed_at timestamptz,
  add column if not exists pushed_at timestamptz;

alter table public.astra_hub_profiles
  add column if not exists email_notifications boolean not null default true;

-- Clients may only flip read_at on notifications; subscriptions only via RPC / delete.
revoke insert, update, delete on public.astra_hub_notifications from anon, authenticated;
grant update (read_at) on public.astra_hub_notifications to authenticated;
revoke insert, update on public.astra_hub_push_subscriptions from anon, authenticated;
grant update (email_notifications) on public.astra_hub_profiles to authenticated;

-- ── 2. send_message: allow an empty body when attachments will follow ───────
drop function if exists public.astra_hub_send_message(uuid, uuid, text);

create or replace function public.astra_hub_send_message(
  p_channel_id uuid,
  p_conversation_id uuid,
  p_body text,
  p_expect_attachments boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_body text := nullif(trim(p_body), '');
  v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not exists (select 1 from public.astra_hub_profiles where id = v_me and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if (p_channel_id is null and p_conversation_id is null)
     or (p_channel_id is not null and p_conversation_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'invalid_parent');
  end if;

  if v_body is null and not coalesce(p_expect_attachments, false) then
    return jsonb_build_object('ok', false, 'error', 'empty_body');
  end if;
  if v_body is not null and length(v_body) > 8000 then
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
  else
    update public.astra_hub_channels set updated_at = now() where id = p_channel_id;
  end if;

  return jsonb_build_object('ok', true, 'message_id', v_id);
end;
$$;

-- ── 3. register_attachment: verify the stored object, don't trust the client ─
create or replace function public.astra_hub_register_attachment(
  p_message_id uuid,
  p_storage_path text,
  p_original_file_name text,
  p_mime_type text,
  p_file_size bigint
)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare
  v_me uuid := auth.uid();
  v_msg public.astra_hub_messages%rowtype;
  v_obj storage.objects%rowtype;
  v_prefix text;
  v_mime text;
  v_size bigint;
  v_name text;
  v_id uuid;
  v_allowed text[] := array[
    'image/jpeg','image/png','image/webp','image/gif','application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv','video/mp4'
  ];
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  select * into v_msg from public.astra_hub_messages where id = p_message_id and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'message_not_found'); end if;
  if v_msg.sender_id <> v_me then return jsonb_build_object('ok', false, 'error', 'not_message_author'); end if;
  if v_msg.created_at < now() - interval '10 minutes' then
    return jsonb_build_object('ok', false, 'error', 'attach_window_expired');
  end if;

  if v_msg.channel_id is not null and not public.astra_hub_is_channel_member(v_msg.channel_id) then
    return jsonb_build_object('ok', false, 'error', 'not_channel_member');
  end if;
  if v_msg.conversation_id is not null and not public.astra_hub_is_conversation_member(v_msg.conversation_id) then
    return jsonb_build_object('ok', false, 'error', 'not_conversation_member');
  end if;

  -- Path must sit under THIS message's own folder.
  v_prefix := case
    when v_msg.channel_id is not null then 'channel/' || v_msg.channel_id::text || '/' || v_msg.id::text || '/'
    else 'conversation/' || v_msg.conversation_id::text || '/' || v_msg.id::text || '/'
  end;
  if p_storage_path is null
     or left(p_storage_path, length(v_prefix)) <> v_prefix
     or substr(p_storage_path, length(v_prefix) + 1) !~ '^[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_storage_path');
  end if;

  -- The object must really exist, uploaded by the caller; use ITS size and type.
  select * into v_obj from storage.objects
  where bucket_id = 'astra-hub-attachments' and name = p_storage_path;
  if not found then return jsonb_build_object('ok', false, 'error', 'object_not_found'); end if;
  if v_obj.owner_id is distinct from v_me::text then
    return jsonb_build_object('ok', false, 'error', 'not_object_owner');
  end if;

  v_size := coalesce((v_obj.metadata->>'size')::bigint, p_file_size);
  v_mime := lower(trim(split_part(coalesce(v_obj.metadata->>'mimetype', p_mime_type, ''), ';', 1)));

  if v_size is null or v_size <= 0 or v_size > 20971520 then
    return jsonb_build_object('ok', false, 'error', 'file_too_large');
  end if;
  if not (v_mime = any (v_allowed)) then
    return jsonb_build_object('ok', false, 'error', 'mime_not_allowed');
  end if;

  v_name := left(regexp_replace(regexp_replace(coalesce(p_original_file_name, ''), '[/\\]', '_', 'g'), '[[:cntrl:]]', '', 'g'), 255);
  if length(trim(v_name)) = 0 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if v_name ~* '\.(svg|exe|bat|cmd|scr|js|msi|dll|zip|html?|php)$' then
    return jsonb_build_object('ok', false, 'error', 'extension_not_allowed');
  end if;

  begin
    insert into public.astra_hub_message_attachments
      (message_id, storage_path, original_file_name, mime_type, file_size, uploaded_by)
    values (p_message_id, p_storage_path, v_name, v_mime, v_size, v_me)
    returning id into v_id;
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'error', 'attachment_limit_exceeded');
  end;

  return jsonb_build_object('ok', true, 'attachment_id', v_id);
end;
$$;

-- ── 4. Storage: uploads only into your own fresh message's folder ───────────
create or replace function public.astra_hub_can_upload_attachment_path(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_parts text[] := storage.foldername(p_name);
  v_msg public.astra_hub_messages%rowtype;
  v_uuid constant text := '^[0-9a-fA-F-]{36}$';
begin
  if array_length(v_parts, 1) is distinct from 3 then return false; end if;
  if v_parts[2] !~ v_uuid or v_parts[3] !~ v_uuid then return false; end if;
  if storage.filename(p_name) !~ '^[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$' then return false; end if;

  select * into v_msg from public.astra_hub_messages
  where id = v_parts[3]::uuid and deleted_at is null;
  if not found or v_msg.sender_id <> auth.uid() or v_msg.created_at < now() - interval '10 minutes' then
    return false;
  end if;

  if v_parts[1] = 'channel' then
    return v_msg.channel_id = v_parts[2]::uuid and public.astra_hub_is_channel_member(v_msg.channel_id);
  elsif v_parts[1] = 'conversation' then
    return v_msg.conversation_id = v_parts[2]::uuid and public.astra_hub_is_conversation_member(v_msg.conversation_id);
  end if;
  return false;
end;
$$;

drop policy if exists "astra_hub_attachments_insert" on storage.objects;
create policy "astra_hub_attachments_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'astra-hub-attachments' and public.astra_hub_can_upload_attachment_path(name));

-- ── 5. Realtime: per-user topic + attachment/unread/notification signals ────
create or replace function public.astra_hub_can_access_realtime_topic(p_topic text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_topic ~ '^channel:[0-9a-fA-F-]{36}$'
      then public.astra_hub_is_channel_member(substr(p_topic, 9)::uuid)
    when p_topic ~ '^conversation:[0-9a-fA-F-]{36}$'
      then public.astra_hub_is_conversation_member(substr(p_topic, 14)::uuid)
    when p_topic ~ '^user:[0-9a-fA-F-]{36}$'
      then substr(p_topic, 6)::uuid = auth.uid()
    else false
  end;
$$;

-- Clients may never send on a user topic (only the database does).
drop policy if exists "astra_hub_realtime_send" on realtime.messages;
create policy "astra_hub_realtime_send"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and realtime.topic() !~ '^user:'
    and (select public.astra_hub_can_access_realtime_topic(realtime.topic()))
  );

create or replace function public.astra_hub_broadcast_message_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_topic text;
  v_uid uuid;
begin
  v_topic := case
    when new.channel_id is not null then 'channel:' || new.channel_id::text
    else 'conversation:' || new.conversation_id::text
  end;
  perform realtime.send(
    jsonb_build_object('id', new.id, 'sender_id', new.sender_id),
    case when tg_op = 'INSERT' then 'message_insert' else 'message_update' end,
    v_topic, true
  );

  -- Tell the other members' sidebars to refresh unread counts (ids only).
  if tg_op = 'INSERT' then
    for v_uid in
      select cm.user_id from public.astra_hub_channel_members cm
      where new.channel_id is not null and cm.channel_id = new.channel_id and cm.user_id <> new.sender_id
      union
      select cm.user_id from public.astra_hub_conversation_members cm
      where new.conversation_id is not null and cm.conversation_id = new.conversation_id
        and cm.left_at is null and cm.user_id <> new.sender_id
    loop
      perform realtime.send(jsonb_build_object('t', 1), 'unread_changed', 'user:' || v_uid::text, true);
    end loop;
  end if;
  return null;
end;
$$;

create or replace function public.astra_hub_broadcast_attachment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_msg public.astra_hub_messages%rowtype;
begin
  select * into v_msg from public.astra_hub_messages where id = new.message_id;
  if found then
    perform realtime.send(
      jsonb_build_object('id', v_msg.id, 'sender_id', v_msg.sender_id),
      'message_update',
      case when v_msg.channel_id is not null then 'channel:' || v_msg.channel_id::text
           else 'conversation:' || v_msg.conversation_id::text end,
      true
    );
  end if;
  return null;
end;
$$;

drop trigger if exists astra_hub_attachments_broadcast on public.astra_hub_message_attachments;
create trigger astra_hub_attachments_broadcast
  after insert on public.astra_hub_message_attachments
  for each row execute function public.astra_hub_broadcast_attachment_change();

create or replace function public.astra_hub_broadcast_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(jsonb_build_object('id', new.id), 'notification_insert', 'user:' || new.user_id::text, true);
  return null;
end;
$$;

drop trigger if exists astra_hub_notifications_broadcast on public.astra_hub_notifications;
create trigger astra_hub_notifications_broadcast
  after insert on public.astra_hub_notifications
  for each row execute function public.astra_hub_broadcast_notification();

-- ── 6. Execute grants ───────────────────────────────────────────────────────
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
