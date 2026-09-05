-- Remaining features: recurring appointment series id.
alter table appointments add column if not exists recurring_group_id uuid;
create index if not exists idx_appts_recurring on appointments(recurring_group_id);
