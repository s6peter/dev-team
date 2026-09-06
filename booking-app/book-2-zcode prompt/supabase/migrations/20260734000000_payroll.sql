-- Payroll / commission / payouts:
--  • per-stylist commission_rate (default 55%), W2 toggle + withholding rate
--  • Stripe Connect account link + payouts_enabled
--  • payouts ledger (statements) + RLS
-- All of these are OWNER-controlled (or server-set); a stylist must NOT be able to
-- edit their own commission/withholding/owner-flag/Connect status from the browser,
-- so the existing guard trigger is extended to cover every financial field.

alter table stylists add column if not exists commission_rate numeric(5,4) not null default 0.55;   -- 0.55 = 55%
alter table stylists add column if not exists is_w2 boolean not null default false;
alter table stylists add column if not exists tax_withholding_rate numeric(5,4) not null default 0;  -- applied to commission when is_w2
alter table stylists add column if not exists stripe_account_id text;                                 -- Stripe Connect (Express) acct
alter table stylists add column if not exists payouts_enabled boolean not null default false;         -- Connect onboarding complete

-- Extend the field guard: block the browser (authenticated/anon) from changing any
-- owner-controlled financial field. Migrations (postgres) and the admin API
-- (service_role) bypass this and remain the only writers.
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
  ) then
    raise exception 'protected stylist field is not writable';
  end if;
  return new;
end;
$$;

-- Payout statements ledger. A row = one payout run for a stylist over a period.
create table if not exists payouts (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  appointment_count int not null default 0,
  gross_cents int not null default 0,          -- sum of completed service totals
  commission_cents int not null default 0,     -- gross * commission_rate
  withholding_cents int not null default 0,    -- commission * withholding_rate (W2 only)
  net_cents int not null default 0,            -- commission - withholding (amount paid out)
  commission_rate numeric(5,4) not null,       -- snapshot of the rate used
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  method text,                                 -- 'stripe' | 'manual'
  stripe_transfer_id text,
  note text,
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists idx_payouts_stylist on payouts(stylist_id, created_at desc);

alter table payouts enable row level security;
drop policy if exists payouts_read on payouts;
create policy payouts_read on payouts for select using (stylist_id = current_stylist_id());
grant all on payouts to anon, authenticated, service_role;
