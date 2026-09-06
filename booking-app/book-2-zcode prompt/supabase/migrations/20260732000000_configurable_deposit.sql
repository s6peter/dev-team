-- Configurable deposit: the stylist sets the deposit amount in admin Settings.
-- Stored on cancellation_policy; saving it propagates to every service's
-- deposit_flat_cents (which hold_slot and the booking display already use).
alter table cancellation_policy add column if not exists deposit_cents int not null default 5000;
