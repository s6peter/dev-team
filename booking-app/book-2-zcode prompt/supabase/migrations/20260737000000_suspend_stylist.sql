-- Suspend / disable a stylist account (owner-controlled). Suspended stylists are
-- not bookable and cannot use the admin app until re-enabled.
alter table stylists add column if not exists is_active boolean not null default true;

-- Add is_active to the protected-field guard so a stylist can't re-enable themselves.
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
    or new.is_active is distinct from old.is_active
  ) then
    raise exception 'protected stylist field is not writable';
  end if;
  return new;
end;
$$;
