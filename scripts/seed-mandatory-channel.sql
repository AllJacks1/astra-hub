-- Run once (idempotent) after astra_hub_channels table exists and you have an admin profile.
-- Creates the mandatory announcements channel required by PRODUCT_POLICY.

do $$
declare
  admin_id uuid;
  ch_id uuid;
begin
  select id into admin_id
  from public.astra_hub_profiles
  where role = 'admin' and status = 'active'
  limit 1;

  if admin_id is null then
    raise exception 'No active admin profile found. Create an admin first.';
  end if;

  -- Idempotent: only one mandatory channel allowed by unique index
  insert into public.astra_hub_channels (name, description, visibility, is_mandatory, created_by)
  values (
    'announcements',
    'Company-wide announcements. Members cannot leave this channel.',
    'public',
    true,
    admin_id
  )
  on conflict do nothing
  returning id into ch_id;

  if ch_id is null then
    select id into ch_id from public.astra_hub_channels where is_mandatory = true limit 1;
  end if;

  -- Ensure every currently active member/admin is a member of the mandatory channel
  insert into public.astra_hub_channel_members (channel_id, user_id, membership_role, added_by)
  select ch_id, p.id, 'member', admin_id
  from public.astra_hub_profiles p
  where p.status = 'active'
    and p.role in ('admin', 'member')
  on conflict do nothing;

  raise notice 'Mandatory announcements channel ready: %', ch_id;
end;
$$;
