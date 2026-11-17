-- Seeds the mandatory "announcements" channel. Run once in the SQL editor AFTER the first admin exists.
-- Idempotent. All active admins/members are joined; later invitees auto-join via trigger.
with admin as (
  select id from public.astra_hub_profiles
  where role = 'admin' and status = 'active' order by created_at limit 1
), ch as (
  insert into public.astra_hub_channels (name, description, visibility, is_mandatory, created_by)
  select 'announcements', 'Company-wide announcements', 'public', true, admin.id
  from admin
  where not exists (select 1 from public.astra_hub_channels where is_mandatory)
  returning id
)
insert into public.astra_hub_channel_members (channel_id, user_id, membership_role)
select ch.id, p.id, 'member'
from ch, public.astra_hub_profiles p
where p.status = 'active' and p.role in ('admin', 'member')
on conflict do nothing;
