-- Audit trail of client comms (confirmations, reminders, etc.) — proves what was
-- sent (or would send in dev), viewable in the admin "Messages" tab.
create table if not exists notification_log (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid references stylists(id) on delete set null,
  channel text not null check (channel in ('email','sms')),
  recipient text not null,
  subject text,
  body text,
  status text not null default 'logged' check (status in ('sent','logged','failed')),
  created_at timestamptz default now()
);
create index if not exists idx_notiflog_created on notification_log(created_at desc);
alter table notification_log enable row level security;
drop policy if exists admin_notiflog_read on notification_log;
create policy admin_notiflog_read on notification_log for select using (public.is_admin());
grant all on notification_log to anon, authenticated, service_role;
