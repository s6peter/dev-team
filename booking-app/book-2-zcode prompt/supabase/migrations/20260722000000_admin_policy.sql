-- ============================================================================
-- Admin management + policy update (v3)
--  * Tax is charged on the DEPOSIT only (not the whole service).
--  * Deposits are flat + non-refundable (per-service deposit_flat_cents).
--  * First-class service_categories (create/delete categories independently).
--  * Cancellation-policy fee fields (blow-dry / late / grace).
-- ============================================================================

-- --- Categories -------------------------------------------------------------
create table if not exists service_categories (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  unique (stylist_id, name)
);

-- Backfill from any categories already present on services.
insert into service_categories (stylist_id, name, sort_order)
select s.stylist_id, s.category, min(s.sort_order)
from services s
group by s.stylist_id, s.category
on conflict (stylist_id, name) do nothing;

alter table service_categories enable row level security;
drop policy if exists pub_read_categories on service_categories;
create policy pub_read_categories on service_categories for select using (true);
drop policy if exists admin_categories on service_categories;
create policy admin_categories on service_categories for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

-- --- Policy fee fields ------------------------------------------------------
alter table cancellation_policy
  add column if not exists blow_dry_fee_cents integer not null default 2000,
  add column if not exists late_fee_cents integer not null default 2000,
  add column if not exists grace_minutes integer not null default 10;

-- --- Money math: tax on deposit only ---------------------------------------
create or replace function public.hold_slot(
  p_stylist uuid, p_service uuid, p_tier uuid, p_date date, p_start time,
  p_client_name text, p_client_email text, p_client_phone text, p_notes text,
  p_intake jsonb, p_photos text[], p_policy_consented boolean, p_ttl_minutes integer
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

  if exists (
    select 1 from appointments
    where stylist_id = p_stylist and status in ('pending','confirmed')
      and time_range && v_range
  ) then raise exception 'slot_unavailable'; end if;

  v_service_total := v_svc.base_price + coalesce(v_tier.price_addon, 0);
  if not v_svc.requires_deposit then
    v_deposit := 0;
  elsif v_svc.deposit_flat_cents is not null then
    v_deposit := v_svc.deposit_flat_cents;
  else
    v_deposit := round(v_service_total * v_svc.deposit_percent / 100.0);
  end if;
  v_tax := round(v_deposit * v_svc.tax_rate);       -- tax on deposit only
  v_balance := v_service_total - v_deposit;          -- remainder, no tax, paid in person

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
  returning * into v_hold;

  return v_hold;
exception
  when exclusion_violation then raise exception 'slot_unavailable';
end;
$$ language plpgsql security definer;

-- Payment amount charged online = deposit + tax-on-deposit.
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
  values (v_appt_id, 'deposit', v_hold.deposit_cents + v_hold.tax_cents, p_payment_intent, 'completed');

  delete from slot_holds where id = p_hold_id;
  return v_appt_id;
exception
  when exclusion_violation then raise exception 'slot_unavailable';
end;
$$ language plpgsql security definer;

-- --- Grants for the new table ----------------------------------------------
grant all on service_categories to anon, authenticated, service_role;
