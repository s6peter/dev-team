-- v3 catalog: 4 service GROUPS (tiles) → services → explicit priced VARIANTS
-- (size × length × price). Replaces the additive service_tiers model for booking.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists service_groups (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  name text not null,
  slug text not null,
  kind text not null default 'standard' check (kind in ('standard','custom')),
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique (stylist_id, slug)
);

alter table services add column if not exists group_id uuid references service_groups(id) on delete set null;

create table if not exists service_variants (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services(id) on delete cascade,
  stylist_id uuid not null references stylists(id) on delete cascade,
  size text,
  length text,
  label text not null,
  price_cents int not null default 0,
  price_from boolean not null default false,   -- "starting at" ($60+)
  duration_minutes int not null default 180,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_variants_service on service_variants(service_id);

alter table slot_holds   add column if not exists service_variant_id uuid references service_variants(id) on delete set null;
alter table appointments add column if not exists service_variant_id uuid references service_variants(id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS (public reads active rows; each stylist manages only their own)
-- ---------------------------------------------------------------------------
alter table service_groups   enable row level security;
alter table service_variants enable row level security;

drop policy if exists pub_read_groups on service_groups;
create policy pub_read_groups on service_groups for select using (is_active);
drop policy if exists admin_groups on service_groups;
create policy admin_groups on service_groups for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

drop policy if exists pub_read_variants on service_variants;
create policy pub_read_variants on service_variants for select using (is_active);
drop policy if exists admin_variants on service_variants;
create policy admin_variants on service_variants for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

grant all on service_groups   to anon, authenticated, service_role;
grant all on service_variants to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- hold_slot: now variant-aware. Price/duration come from the variant; the
-- Custom group (kind='custom') collects the deposit only (balance settled in person).
-- ---------------------------------------------------------------------------
drop function if exists public.hold_slot(uuid,uuid,uuid,date,time,text,text,text,text,jsonb,text[],boolean,integer);

create or replace function public.hold_slot(
  p_stylist uuid, p_service uuid, p_tier uuid, p_variant uuid, p_date date, p_start time,
  p_client_name text, p_client_email text, p_client_phone text, p_notes text,
  p_intake jsonb, p_photos text[], p_policy_consented boolean, p_ttl_minutes integer
) returns slot_holds as $$
declare
  v_svc services%rowtype;
  v_grp service_groups%rowtype;
  v_variant service_variants%rowtype;
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
  select * into v_grp from service_groups where id = v_svc.group_id;

  if p_variant is not null then
    select * into v_variant from service_variants where id = p_variant and service_id = p_service and is_active;
    if not found then raise exception 'variant_not_found'; end if;
  end if;

  v_minutes := coalesce(v_variant.duration_minutes, v_svc.duration_minutes);
  v_end := p_start + make_interval(mins => v_minutes);
  if (p_date + p_start) < now() then raise exception 'slot_in_past'; end if;
  v_range := tsrange((p_date + p_start), (p_date + v_end), '[)');

  if exists (
    select 1 from appointments
    where stylist_id = p_stylist and status in ('pending','confirmed')
      and time_range && v_range
  ) then raise exception 'slot_unavailable'; end if;

  -- deposit (flat $50 by default)
  if not v_svc.requires_deposit then
    v_deposit := 0;
  elsif v_svc.deposit_flat_cents is not null then
    v_deposit := v_svc.deposit_flat_cents;
  else
    v_deposit := round(coalesce(v_variant.price_cents, v_svc.base_price) * v_svc.deposit_percent / 100.0);
  end if;

  -- service total: custom group = deposit only (price TBD); else the variant price
  if coalesce(v_grp.kind,'standard') = 'custom' then
    v_service_total := v_deposit;
  else
    v_service_total := coalesce(v_variant.price_cents, v_svc.base_price);
  end if;

  v_tax := round(v_deposit * v_svc.tax_rate);   -- tax on deposit only
  v_balance := v_service_total - v_deposit;

  insert into slot_holds (
    stylist_id, service_id, service_tier_id, service_variant_id, date, start_time, end_time,
    client_name, client_email, client_phone, notes, intake, inspiration_photos,
    service_total_cents, tax_cents, deposit_cents, balance_due_cents,
    policy_consented, expires_at
  ) values (
    p_stylist, p_service, p_tier, p_variant, p_date, p_start, v_end,
    coalesce(p_client_name,''), p_client_email, p_client_phone, p_notes,
    coalesce(p_intake,'[]'::jsonb), coalesce(p_photos,'{}'::text[]),
    v_service_total, v_tax, v_deposit, v_balance,
    coalesce(p_policy_consented,false), now() + make_interval(mins => p_ttl_minutes)
  )
  returning * into v_hold;

  return v_hold;
exception
  when exclusion_violation then raise exception 'slot_unavailable';
end;
$$ language plpgsql security definer;

-- confirm carries the variant onto the appointment
create or replace function public.confirm_booking_from_hold(
  p_hold_id uuid, p_payment_intent text
) returns uuid as $$
declare
  v_hold slot_holds%rowtype;
  v_client_id uuid;
  v_appt_id uuid;
  r jsonb;
begin
  select * into v_hold from slot_holds where id = p_hold_id for update;
  if not found then raise exception 'hold_expired'; end if;

  insert into clients (stylist_id, name, email, phone)
  values (v_hold.stylist_id, coalesce(nullif(v_hold.client_name,''),'Guest'), v_hold.client_email, v_hold.client_phone)
  on conflict (stylist_id, email) do update
    set name  = coalesce(nullif(clients.name,''), excluded.name),
        phone = coalesce(clients.phone, excluded.phone)
  returning id into v_client_id;

  insert into appointments (
    client_id, stylist_id, service_id, service_tier_id, service_variant_id, date, start_time, end_time,
    status, service_total_cents, tax_cents, deposit_cents, balance_due_cents,
    notes, inspiration_photos, policy_consented_at
  ) values (
    v_client_id, v_hold.stylist_id, v_hold.service_id, v_hold.service_tier_id, v_hold.service_variant_id,
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
  values (v_appt_id, 'deposit', v_hold.deposit_cents + v_hold.tax_cents, p_payment_intent, 'completed');

  delete from slot_holds where id = p_hold_id;
  return v_appt_id;
exception
  when exclusion_violation then raise exception 'slot_unavailable';
end;
$$ language plpgsql security definer;
