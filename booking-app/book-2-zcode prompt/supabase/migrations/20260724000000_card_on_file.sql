-- ============================================================================
-- Card on file for automatic no-show / late-cancellation fees (Square parity).
-- The deposit PaymentIntent saves the card (setup_future_usage=off_session);
-- we store the customer + payment method to charge fees off-session later.
-- ============================================================================
alter table clients      add column if not exists stripe_customer_id text;
alter table appointments add column if not exists stripe_payment_method_id text;
alter table appointments add column if not exists fee_charged_cents integer not null default 0;
