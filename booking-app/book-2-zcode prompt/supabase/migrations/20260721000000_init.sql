-- ============================================================================
-- QueenG Braids — canonical schema (v2)
-- Fixes v1: adds stylists.user_id, real concurrency safety (btree_gist EXCLUDE),
-- functional slot-hold TTL, service-role-only writes, no PII world-readability,
-- reminder-sent tracking, cancellation policy + consent, waitlist, and
-- transactional booking RPCs. All money is integer cents.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";   -- uuid + range EXCLUDE constraints

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table stylists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,   -- admin identity (was missing in v1)
  name text not null,
  email text unique not null,
  phone text,
  bio text,
  avatar_url text,
  instagram text,
  created_at timestamptz default now()
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  base_price integer not null check (base_price >= 0),          -- cents
  deposit_percent numeric(5,2) not null default 50.00,
  deposit_flat_cents integer,                                   -- overrides percent when set
  requires_deposit boolean not null default true,
  tax_rate numeric(6,5) not null default 0.08250,
  image_url text,
  images text[] not null default '{}',
  prep_notes text,
  care_notes text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table service_tiers (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services(id) on delete cascade,
  name text not null,
  description text,
  kind text not null default 'size' check (kind in ('size','length','addon')),
  price_addon integer not null default 0,        -- cents
  duration_addon integer not null default 0,     -- minutes
  sort_order integer not null default 0
);

create table availability (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  unique (stylist_id, day_of_week),
  check (end_time > start_time)
);

create table availability_overrides (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  is_available boolean not null default false,   -- false = day off / blackout
  reason text,
  unique (stylist_id, date, start_time, end_time)
);

create table clients (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  notes text,
  allergies text,
  preferences text,
  tags text[] not null default '{}',
  lifetime_spend integer not null default 0,     -- cents
  created_at timestamptz default now(),
  unique (stylist_id, email)                      -- fixes v1 non-unique email + .single() crash
);
create index idx_clients_user on clients(user_id);

create table cancellation_policy (
  stylist_id uuid primary key references stylists(id) on delete cascade,
  reschedule_notice_hours integer not null default 48,
  cancel_notice_hours integer not null default 24,
  late_cancel_fee_percent numeric(5,2) not null default 0,
  no_show_fee_percent numeric(5,2) not null default 0,
  policy_text text not null default '',
  updated_at timestamptz default now()
);

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  stylist_id uuid not null references stylists(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  service_tier_id uuid references service_tiers(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','declined','completed','no_show','cancelled')),
  service_total_cents integer not null default 0,
  tax_cents integer not null default 0,
  deposit_cents integer not null default 0,
  balance_due_cents integer not null default 0,
  notes text,
  inspiration_photos text[] not null default '{}',
  policy_consented_at timestamptz,
  reschedule_of uuid references appointments(id) on delete set null,
  cancelled_reason text,
  reminder_24h_sent_at timestamptz,
  reminder_2h_sent_at timestamptz,
  rebook_prompt_sent_at timestamptz,
  review_request_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- generated range for overlap detection (immutable: date+time -> timestamp)
  time_range tsrange generated always as
    (tsrange((date + start_time), (date + end_time), '[)')) stored,
  check (end_time > start_time)
);
-- No two active (pending/confirmed) appointments may overlap for one stylist.
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (stylist_id with =, time_range with &&)
  where (status in ('pending','confirmed'));

create index idx_appts_stylist_date on appointments(stylist_id, date, status);
create index idx_appts_client on appointments(client_id);
create index idx_appts_date on appointments(date);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete cascade,
  type text not null check (type in ('deposit','balance','tip','fee')),
  amount integer not null,                        -- cents
  currency text not null default 'usd',
  stripe_payment_id text,
  stripe_refund_id text,
  status text not null default 'pending'
    check (status in ('pending','completed','refunded','failed')),
  created_at timestamptz default now()
);
create index idx_payments_appt on payments(appointment_id);

-- slot_holds double as the transient "checkout in progress" record: it reserves the
-- range AND carries the full booking payload, which is materialized on payment success.
create table slot_holds (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  service_tier_id uuid references service_tiers(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  client_name text not null default '',
  client_email text not null,
  client_phone text,
  notes text,
  intake jsonb not null default '[]',
  inspiration_photos text[] not null default '{}',
  service_total_cents integer not null default 0,
  tax_cents integer not null default 0,
  deposit_cents integer not null default 0,
  balance_due_cents integer not null default 0,
  policy_consented boolean not null default false,
  stripe_payment_intent_id text,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  time_range tsrange generated always as
    (tsrange((date + start_time), (date + end_time), '[)')) stored
);
-- Concurrent overlapping holds are impossible for one stylist (expired holds are
-- deleted inside hold_slot() before insert, so they don't false-conflict).
alter table slot_holds
  add constraint slot_holds_no_overlap
  exclude using gist (stylist_id with =, time_range with &&);
create index idx_holds_expires on slot_holds(expires_at);
create index idx_holds_pi on slot_holds(stripe_payment_intent_id);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  stylist_id uuid not null references stylists(id) on delete cascade,
  author_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  comment text,
  stylist_response text,
  is_published boolean not null default false,   -- moderated before public
  created_at timestamptz default now()
);
create index idx_reviews_stylist on reviews(stylist_id, is_published);

create table portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  service_category text,
  hair_length text,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);
create index idx_portfolio_stylist on portfolio_items(stylist_id);

create table intake_responses (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  question text not null,
  answer text not null
);
create index idx_intake_appt on intake_responses(appointment_id);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references auth.users(id) on delete set null,
  receiver_id uuid references auth.users(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  content text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

create table waitlist_entries (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  service_tier_id uuid references service_tiers(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  desired_date date,
  flexibility text not null default 'exact' check (flexibility in ('exact','plus_minus_1','plus_minus_3','any')),
  status text not null default 'waiting' check (status in ('waiting','notified','booked','expired','cancelled')),
  notified_at timestamptz,
  created_at timestamptz default now()
);
create index idx_waitlist_stylist on waitlist_entries(stylist_id, status);

-- Stripe webhook idempotency
create table processed_stripe_events (
  event_id text primary key,
  processed_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger trg_appts_updated before update on appointments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Identity helpers for RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_stylist_id() returns uuid as $$
  select id from public.stylists where user_id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.stylists where user_id = auth.uid());
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- Concurrency-safe booking functions (SECURITY DEFINER: run as owner, callable
-- by the service role only from server routes)
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_expired_holds() returns integer as $$
declare n integer;
begin
  delete from slot_holds where expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql security definer;

-- Reserve a slot + stash the full booking payload. Raises 'slot_unavailable' if the
-- range collides with an active appointment or a live hold.
create or replace function public.hold_slot(
  p_stylist uuid,
  p_service uuid,
  p_tier uuid,
  p_date date,
  p_start time,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_notes text,
  p_intake jsonb,
  p_photos text[],
  p_policy_consented boolean,
  p_ttl_minutes integer
) returns slot_holds as $$
declare
  v_svc services%rowtype;
  v_tier service_tiers%rowtype;
  v_minutes integer;
  v_end time;
  v_range tsrange;
  v_service_total integer;
  v_tax integer;
  v_deposit integer;
  v_balance integer;
  v_hold slot_holds%rowtype;
begin
  perform cleanup_expired_holds();

  select * into v_svc from services where id = p_service and stylist_id = p_stylist and is_active;
  if not found then raise exception 'service_not_found'; end if;

  v_minutes := v_svc.duration_minutes;
  if p_tier is not null then
    select * into v_tier from service_tiers where id = p_tier and service_id = p_service;
    if found then v_minutes := v_minutes + v_tier.duration_addon; end if;
  end if;

  v_end := p_start + make_interval(mins => v_minutes);
  if (p_date + p_start) < now() then raise exception 'slot_in_past'; end if;
  v_range := tsrange((p_date + p_start), (p_date + v_end), '[)');

  -- collide with active appointment?
  if exists (
    select 1 from appointments
    where stylist_id = p_stylist and status in ('pending','confirmed')
      and time_range && v_range
  ) then raise exception 'slot_unavailable'; end if;

  -- money (cents)
  v_service_total := v_svc.base_price + coalesce(v_tier.price_addon, 0);
  v_tax := round(v_service_total * v_svc.tax_rate);
  if not v_svc.requires_deposit then
    v_deposit := 0;
  elsif v_svc.deposit_flat_cents is not null then
    v_deposit := v_svc.deposit_flat_cents;
  else
    v_deposit := round((v_service_total + v_tax) * v_svc.deposit_percent / 100.0);
  end if;
  v_balance := round(v_service_total * (1 - v_svc.deposit_percent / 100.0));

  insert into slot_holds (
    stylist_id, service_id, service_tier_id, date, start_time, end_time,
    client_name, client_email, client_phone, notes, intake, inspiration_photos,
    service_total_cents, tax_cents, deposit_cents, balance_due_cents,
    policy_consented, expires_at
  ) values (
    p_stylist, p_service, p_tier, p_date, p_start, v_end,
    coalesce(p_client_name,''), p_client_email, p_client_phone, p_notes,
    coalesce(p_intake,'[]'::jsonb), coalesce(p_photos,'{}'::text[]),
    v_service_total, v_tax, v_deposit, v_balance,
    coalesce(p_policy_consented,false), now() + make_interval(mins => p_ttl_minutes)
  )
  returning * into v_hold;   -- slot_holds_no_overlap raises 23P01 on concurrent conflict

  return v_hold;
exception
  when exclusion_violation then raise exception 'slot_unavailable';
end;
$$ language plpgsql security definer;

-- Materialize a paid hold into a real appointment. Idempotent-safe via the caller's
-- processed_stripe_events guard; raises 'hold_expired' if the hold is gone.
create or replace function public.confirm_booking_from_hold(
  p_hold_id uuid,
  p_payment_intent text
) returns uuid as $$
declare
  v_hold slot_holds%rowtype;
  v_client_id uuid;
  v_appt_id uuid;
  r jsonb;
begin
  select * into v_hold from slot_holds where id = p_hold_id for update;
  if not found then raise exception 'hold_expired'; end if;

  -- upsert client (unique per stylist+email)
  insert into clients (stylist_id, name, email, phone)
  values (v_hold.stylist_id, coalesce(nullif(v_hold.client_name,''),'Guest'), v_hold.client_email, v_hold.client_phone)
  on conflict (stylist_id, email) do update
    set name  = coalesce(nullif(clients.name,''), excluded.name),
        phone = coalesce(clients.phone, excluded.phone)
  returning id into v_client_id;

  insert into appointments (
    client_id, stylist_id, service_id, service_tier_id, date, start_time, end_time,
    status, service_total_cents, tax_cents, deposit_cents, balance_due_cents,
    notes, inspiration_photos, policy_consented_at
  ) values (
    v_client_id, v_hold.stylist_id, v_hold.service_id, v_hold.service_tier_id,
    v_hold.date, v_hold.start_time, v_hold.end_time, 'pending',
    v_hold.service_total_cents, v_hold.tax_cents, v_hold.deposit_cents, v_hold.balance_due_cents,
    v_hold.notes, v_hold.inspiration_photos,
    case when v_hold.policy_consented then now() else null end
  ) returning id into v_appt_id;

  for r in select * from jsonb_array_elements(v_hold.intake) loop
    if coalesce(r->>'answer','') <> '' then
      insert into intake_responses (appointment_id, question, answer)
      values (v_appt_id, coalesce(r->>'question','Question'), r->>'answer');
    end if;
  end loop;

  insert into payments (appointment_id, type, amount, stripe_payment_id, status)
  values (v_appt_id, 'deposit', v_hold.deposit_cents, p_payment_intent, 'completed');

  delete from slot_holds where id = p_hold_id;
  return v_appt_id;
exception
  when exclusion_violation then raise exception 'slot_unavailable';
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table stylists enable row level security;
alter table services enable row level security;
alter table service_tiers enable row level security;
alter table availability enable row level security;
alter table availability_overrides enable row level security;
alter table cancellation_policy enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table payments enable row level security;
alter table slot_holds enable row level security;
alter table reviews enable row level security;
alter table portfolio_items enable row level security;
alter table intake_responses enable row level security;
alter table messages enable row level security;
alter table waitlist_entries enable row level security;
alter table processed_stripe_events enable row level security;

-- Public catalog (read-only to everyone)
create policy pub_read_stylists on stylists for select using (true);
create policy pub_read_services on services for select using (is_active);
create policy pub_read_tiers on service_tiers for select using (true);
create policy pub_read_avail on availability for select using (true);
create policy pub_read_overrides on availability_overrides for select using (true);
create policy pub_read_policy on cancellation_policy for select using (true);
create policy pub_read_portfolio on portfolio_items for select using (true);
create policy pub_read_reviews on reviews for select using (is_published);

-- Stylist (admin) manages own catalog
create policy admin_stylist_update on stylists for update using (user_id = auth.uid());
create policy admin_services on services for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());
create policy admin_tiers on service_tiers for all
  using (service_id in (select id from services where stylist_id = current_stylist_id()))
  with check (service_id in (select id from services where stylist_id = current_stylist_id()));
create policy admin_avail on availability for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());
create policy admin_overrides on availability_overrides for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());
create policy admin_policy on cancellation_policy for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());
create policy admin_portfolio on portfolio_items for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

-- Clients: the client sees/updates their own row; the stylist sees their own clients.
create policy client_self_read on clients for select using (user_id = auth.uid());
create policy client_self_update on clients for update using (user_id = auth.uid());
create policy admin_clients_read on clients for select using (stylist_id = current_stylist_id());
create policy admin_clients_write on clients for update using (stylist_id = current_stylist_id());

-- Appointments: client sees own; stylist sees + manages own.
create policy client_appts_read on appointments for select
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy admin_appts_read on appointments for select using (stylist_id = current_stylist_id());
create policy admin_appts_write on appointments for update using (stylist_id = current_stylist_id());

-- Payments: client sees own; stylist sees own. No public writes (service role only).
create policy client_payments_read on payments for select
  using (appointment_id in (
    select a.id from appointments a join clients c on a.client_id = c.id
    where c.user_id = auth.uid()));
create policy admin_payments_read on payments for select
  using (appointment_id in (select id from appointments where stylist_id = current_stylist_id()));

-- Reviews: client creates own; stylist moderates/responds to own.
create policy client_reviews_insert on reviews for insert
  with check (client_id in (select id from clients where user_id = auth.uid()));
create policy admin_reviews_write on reviews for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

-- Intake: client reads own; stylist reads own.
create policy client_intake_read on intake_responses for select
  using (appointment_id in (
    select a.id from appointments a join clients c on a.client_id = c.id
    where c.user_id = auth.uid()));
create policy admin_intake_read on intake_responses for select
  using (appointment_id in (select id from appointments where stylist_id = current_stylist_id()));

-- Messages: only the two participants.
create policy msg_participants_read on messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy msg_send on messages for insert with check (sender_id = auth.uid());
create policy msg_mark_read on messages for update using (receiver_id = auth.uid());

-- Waitlist: stylist reads/manages own.
create policy admin_waitlist on waitlist_entries for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

-- slot_holds, processed_stripe_events: no policies -> only the service role (which
-- bypasses RLS) can touch them. This is intentional.

-- ---------------------------------------------------------------------------
-- Role grants (PostgREST access; RLS still governs anon/authenticated rows)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
