-- Race-safe payout idempotency: at most one pending/paid payout per (stylist, period).
-- Failed payouts are excluded so a failed Stripe transfer can be retried.
create unique index if not exists uniq_active_payout
  on payouts (stylist_id, period_start, period_end)
  where status in ('pending','paid');
