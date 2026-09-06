-- Time clock (geofenced) + first-login password change + workplace location.
alter table stylists add column if not exists must_change_password boolean not null default false;
alter table stylists add column if not exists workplace_lat numeric(9,6);   -- business location (owner row)
alter table stylists add column if not exists workplace_lng numeric(9,6);
alter table stylists add column if not exists workplace_radius_m int not null default 150;

-- Extend the field guard so the browser (authenticated/anon) cannot self-write the
-- new protected fields (a stylist must not clear their own must_change_password to
-- skip the forced change, nor move the workplace geofence). Server (service_role)
-- and migrations remain the only writers.
create or replace function public.guard_stylist_owner_flag() returns trigger
  language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.is_owner is distinct from old.is_owner
    or new.commission_rate is distinct from old.commission_rate
    or new.is_w2 is distinct from old.is_w2
    or new.tax_withholding_rate is distinct from old.tax_withholding_rate
    or new.stripe_account_id is distinct from old.stripe_account_id
    or new.payouts_enabled is distinct from old.payouts_enabled
    or new.must_change_password is distinct from old.must_change_password
    or new.workplace_lat is distinct from old.workplace_lat
    or new.workplace_lng is distinct from old.workplace_lng
    or new.workplace_radius_m is distinct from old.workplace_radius_m
  ) then
    raise exception 'protected stylist field is not writable';
  end if;
  return new;
end;
$$;

-- Time entries: one clock-in/out pair. Geo coords recorded at punch time.
create table if not exists time_entries (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  clock_in_lat numeric(9,6),
  clock_in_lng numeric(9,6),
  clock_out_lat numeric(9,6),
  clock_out_lng numeric(9,6),
  source text not null default 'geo' check (source in ('geo','admin')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_time_entries_stylist on time_entries(stylist_id, clock_in desc);

alter table time_entries enable row level security;
drop policy if exists time_entries_read on time_entries;
create policy time_entries_read on time_entries for select using (stylist_id = current_stylist_id());
grant all on time_entries to anon, authenticated, service_role;
