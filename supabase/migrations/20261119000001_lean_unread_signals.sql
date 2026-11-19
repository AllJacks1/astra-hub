-- Data saving: the per-user "unread_changed" signal now says WHICH space changed
-- ({k: 'channel'|'conversation', id}), so clients bump one badge locally instead of
-- re-rendering the whole layout on every message. Still ids only: no content, and the
-- user:<id> topic stays database-send-only (see astra_hub_realtime_send policy).

create or replace function public.astra_hub_broadcast_message_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_topic text;
  v_kind text;
  v_space uuid;
  v_uid uuid;
begin
  if new.channel_id is not null then
    v_kind := 'channel';
    v_space := new.channel_id;
  else
    v_kind := 'conversation';
    v_space := new.conversation_id;
  end if;
  v_topic := v_kind || ':' || v_space::text;

  perform realtime.send(
    jsonb_build_object('id', new.id, 'sender_id', new.sender_id),
    case when tg_op = 'INSERT' then 'message_insert' else 'message_update' end,
    v_topic, true
  );

  if tg_op = 'INSERT' then
    for v_uid in
      select cm.user_id from public.astra_hub_channel_members cm
      where new.channel_id is not null and cm.channel_id = new.channel_id and cm.user_id <> new.sender_id
      union
      select cm.user_id from public.astra_hub_conversation_members cm
      where new.conversation_id is not null and cm.conversation_id = new.conversation_id
        and cm.left_at is null and cm.user_id <> new.sender_id
    loop
      perform realtime.send(
        jsonb_build_object('k', v_kind, 'id', v_space),
        'unread_changed', 'user:' || v_uid::text, true
      );
    end loop;
  end if;
  return null;
end;
$$;

revoke all on function public.astra_hub_broadcast_message_change() from public, anon;
