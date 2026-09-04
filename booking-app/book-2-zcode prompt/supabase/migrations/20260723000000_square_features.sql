-- ============================================================================
-- Square-standard features: in-place reschedule + guest manage links.
-- ============================================================================
alter table appointments
  add column if not exists reschedule_count integer not null default 0,
  add column if not exists manage_token uuid not null default uuid_generate_v4();

create unique index if not exists idx_appts_manage_token on appointments(manage_token);
