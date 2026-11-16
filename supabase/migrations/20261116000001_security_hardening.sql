-- Astra Team Hub: security hardening on top of the baseline (Phases 1-4)
--
-- Fixes:
--  1. Privilege escalation: invitation/user-status RPCs trusted caller-supplied
--     actor/user ids. They now derive identity from auth.uid() only.
--  2. Profiles RLS self-recursion (policies queried astra_hub_profiles from
--     inside astra_hub_profiles policies).
--  3. Profile role/status/email are not client-updatable (column grants).
--  4. RPC execute revoked from `anon` (Supabase grants it by default).
--  5. notify_message_recipients only callable by the message sender, once.
--  6. Private storage bucket + storage RLS mirroring channel/conversation access.

-- ── helpers (security definer => no RLS recursion) ──────────────────────────

create or replace function public.astra_hub_is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.astra_hub_profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'
  );
$$;

create or replace function public.astra_hub_is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.astra_hub_profiles p
    where p.id = auth.uid() and p.status = 'active'
  );
$$;

-- True when the caller and `p_other` share a channel or an active conversation.
-- Lets guests see names of people in their assigned spaces, and nobody else.
create or replace function public.astra_hub_shares_space_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1
      from public.astra_hub_channel_members a
      join public.astra_hub_channel_members b on b.channel_id = a.channel_id
      where a.user_id = auth.uid() and b.user_id = p_other
    )
    or exists (
      select 1
      from public.astra_hub_conversation_members a
      join public.astra_hub_conversation_members b on b.conversation_id = a.conversation_id
      where a.user_id = auth.uid() and b.user_id = p_other
        and a.left_at is null and b.left_at is null
    );
$$;

-- ── profiles RLS ────────────────────────────────────────────────────────────

drop policy if exists "astra_hub_profiles_select_own" on public.astra_hub_profiles;
drop policy if exists "astra_hub_profiles_select_active_directory" on public.astra_hub_profiles;
drop policy if exists "astra_hub_profiles_update_own_safe_fields" on public.astra_hub_profiles;
drop policy if exists "astra_hub_profiles_select_admin_all" on public.astra_hub_profiles;
drop policy if exists "astra_hub_profiles_select_shared_space" on public.astra_hub_profiles;

create policy "astra_hub_profiles_select_own"
  on public.astra_hub_profiles for select
  using (auth.uid() = id);

-- Members and admins see the active directory. Guests do NOT.
create policy "astra_hub_profiles_select_active_directory"
  on public.astra_hub_profiles for select
  using (status = 'active' and public.astra_hub_is_active_member_or_admin());

create policy "astra_hub_profiles_select_admin_all"
  on public.astra_hub_profiles for select
  using (public.astra_hub_is_active_admin());

create policy "astra_hub_profiles_select_shared_space"
  on public.astra_hub_profiles for select
  using (
    status = 'active'
    and public.astra_hub_is_active_user()
    and public.astra_hub_shares_space_with(id)
  );

create policy "astra_hub_profiles_update_own_safe_fields"
  on public.astra_hub_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Role, status and email can never be written by clients: only these columns.
revoke insert, update, delete on public.astra_hub_profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.astra_hub_profiles to authenticated;

-- ── invitation / user-status RPCs: identity from the session, not parameters ─

drop function if exists public.astra_hub_accept_invitation(text, uuid, text);
drop function if exists public.astra_hub_create_invitation(text, public.astra_hub_user_role, text, timestamptz, uuid);
drop function if exists public.astra_hub_revoke_invitation(uuid, uuid);
drop function if exists public.astra_hub_set_user_status(uuid, public.astra_hub_user_status, uuid);

create or replace function public.astra_hub_create_invitation(
  p_email text,
  p_role public.astra_hub_user_role,
  p_token_hash text,
  p_expires_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_email text := public.astra_hub_normalize_email(p_email);
  v_id uuid;
begin
  if not public.astra_hub_is_active_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if not public.astra_hub_is_allowed_invitation_email(v_email) then
    return jsonb_build_object('ok', false, 'error', 'email_domain_not_allowed');
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token_hash');
  end if;

  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  if exists (
    select 1 from public.astra_hub_profiles
    where email = v_email and status in ('active', 'suspended')
  ) then
    return jsonb_build_object('ok', false, 'error', 'user_already_exists');
  end if;

  update public.astra_hub_invitations
     set status = 'revoked'
   where email = v_email and status = 'pending';

  insert into public.astra_hub_invitations (email, role, status, token_hash, expires_at, invited_by)
  values (v_email, p_role, 'pending', p_token_hash, p_expires_at, v_actor)
  returning id into v_id;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'invitation_created', 'invitation', v_id,
          jsonb_build_object('email', v_email, 'role', p_role, 'expires_at', p_expires_at));

  return jsonb_build_object('ok', true, 'invitation_id', v_id, 'email', v_email);
end;
$$;

create or replace function public.astra_hub_accept_invitation(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_user_confirmed timestamptz;
  v_email text;
  v_inv public.astra_hub_invitations%rowtype;
  v_existing public.astra_hub_profiles%rowtype;
  v_profile public.astra_hub_profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  -- Email comes from auth.users, never from the caller.
  select email, email_confirmed_at into v_user_email, v_user_confirmed
  from auth.users where id = v_uid;

  v_email := public.astra_hub_normalize_email(v_user_email);
  if v_email is null or v_email = '' or v_user_confirmed is null then
    return jsonb_build_object('ok', false, 'error', 'email_not_verified');
  end if;

  select * into v_existing from public.astra_hub_profiles where id = v_uid;
  if found then
    if v_existing.status = 'suspended' then
      return jsonb_build_object('ok', false, 'error', 'suspended');
    end if;
    if v_existing.status = 'active' then
      return jsonb_build_object('ok', false, 'error', 'already_active');
    end if;
  end if;

  select * into v_inv
  from public.astra_hub_invitations
  where token_hash = p_token_hash and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invitation_not_found_or_used');
  end if;

  if v_inv.expires_at <= now() then
    update public.astra_hub_invitations set status = 'expired' where id = v_inv.id;
    return jsonb_build_object('ok', false, 'error', 'invitation_expired');
  end if;

  if public.astra_hub_normalize_email(v_inv.email) <> v_email then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  begin
    insert into public.astra_hub_profiles (id, email, role, status, full_name)
    values (
      v_uid, v_email, v_inv.role, 'active',
      coalesce(
        (select raw_user_meta_data->>'full_name' from auth.users where id = v_uid),
        (select raw_user_meta_data->>'name' from auth.users where id = v_uid),
        split_part(v_email, '@', 1)
      )
    )
    on conflict (id) do update
      set email = excluded.email, role = excluded.role, status = 'active', updated_at = now()
    returning * into v_profile;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'profile_conflict');
  end;

  update public.astra_hub_invitations
     set status = 'accepted', accepted_by = v_uid, accepted_at = now()
   where id = v_inv.id;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_uid, 'invitation_accepted', 'invitation', v_inv.id,
          jsonb_build_object('email', v_email, 'role', v_inv.role));

  return jsonb_build_object('ok', true, 'profile_id', v_profile.id, 'role', v_profile.role);
end;
$$;

create or replace function public.astra_hub_revoke_invitation(p_invitation_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_inv public.astra_hub_invitations%rowtype;
begin
  if not public.astra_hub_is_active_admin() then
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
  values (v_actor, 'invitation_revoked', 'invitation', p_invitation_id,
          jsonb_build_object('email', v_inv.email));

  return jsonb_build_object('ok', true, 'invitation_id', p_invitation_id);
end;
$$;

create or replace function public.astra_hub_set_user_status(
  p_target_user_id uuid,
  p_new_status public.astra_hub_user_status
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_target public.astra_hub_profiles%rowtype;
begin
  if not public.astra_hub_is_active_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if p_new_status not in ('active', 'suspended') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if p_target_user_id = v_actor and p_new_status = 'suspended' then
    return jsonb_build_object('ok', false, 'error', 'cannot_suspend_self');
  end if;

  select * into v_target from public.astra_hub_profiles where id = p_target_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_target.status = 'invited' then
    return jsonb_build_object('ok', false, 'error', 'user_not_activated');
  end if;

  update public.astra_hub_profiles
     set status = p_new_status, updated_at = now()
   where id = p_target_user_id;

  insert into public.astra_hub_audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'user_status_changed', 'profile', p_target_user_id,
          jsonb_build_object('new_status', p_new_status));

  return jsonb_build_object('ok', true, 'user_id', p_target_user_id, 'status', p_new_status);
end;
$$;

-- ── notifications: only the sender, only once per message ───────────────────

create or replace function public.astra_hub_notify_message_recipients(
  p_message_id uuid,
  p_title text,
  p_body_preview text,
  p_mention_user_ids uuid[] default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_msg public.astra_hub_messages%rowtype;
  v_type text;
  v_recipient uuid;
begin
  select * into v_msg from public.astra_hub_messages where id = p_message_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'message_not_found');
  end if;

  if v_msg.sender_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'not_message_sender');
  end if;

  if exists (select 1 from public.astra_hub_notifications where message_id = p_message_id) then
    return jsonb_build_object('ok', true, 'already_notified', true);
  end if;

  if v_msg.conversation_id is not null then
    select case when c.type = 'direct' then 'direct_message' else 'group_message' end
      into v_type
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
        left(coalesce(p_title, ''), 120), left(coalesce(p_body_preview, ''), 200)
      );
    end loop;

  elsif v_msg.channel_id is not null and p_mention_user_ids is not null then
    v_type := 'channel_mention';
    foreach v_recipient in array p_mention_user_ids loop
      if v_recipient = v_msg.sender_id then continue; end if;
      if not exists (
        select 1 from public.astra_hub_channel_members cm
        join public.astra_hub_profiles p on p.id = cm.user_id
        where cm.channel_id = v_msg.channel_id and cm.user_id = v_recipient and p.status = 'active'
      ) then continue; end if;

      insert into public.astra_hub_notifications (
        user_id, type, message_id, channel_id, actor_id, title, body_preview
      ) values (
        v_recipient, v_type, p_message_id, v_msg.channel_id, v_msg.sender_id,
        left(coalesce(p_title, ''), 120), left(coalesce(p_body_preview, ''), 200)
      );
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── private storage bucket + storage RLS ────────────────────────────────────
-- Object path convention: {channel|conversation}/{parent_uuid}/{message_uuid}/{file_uuid}.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'astra-hub-attachments', 'astra-hub-attachments', false, 20971520,
  array[
    'image/jpeg','image/png','image/webp','image/gif','application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv','video/mp4'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.astra_hub_can_access_attachment_path(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (storage.foldername(p_name))[1] = 'channel'
         and (storage.foldername(p_name))[2] ~ '^[0-9a-fA-F-]{36}$'
      then public.astra_hub_is_channel_member(((storage.foldername(p_name))[2])::uuid)
    when (storage.foldername(p_name))[1] = 'conversation'
         and (storage.foldername(p_name))[2] ~ '^[0-9a-fA-F-]{36}$'
      then public.astra_hub_is_conversation_member(((storage.foldername(p_name))[2])::uuid)
    else false
  end;
$$;

drop policy if exists "astra_hub_attachments_select" on storage.objects;
drop policy if exists "astra_hub_attachments_insert" on storage.objects;

create policy "astra_hub_attachments_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'astra-hub-attachments' and public.astra_hub_can_access_attachment_path(name));

create policy "astra_hub_attachments_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'astra-hub-attachments' and public.astra_hub_can_access_attachment_path(name));
-- No update/delete policies: clients cannot overwrite or delete stored files.

-- ── execute grants: authenticated only, never anon ──────────────────────────

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
