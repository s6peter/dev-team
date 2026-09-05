-- Hard guard: at most one completed balance and one completed fee per appointment
-- (defends the money path against double-charge races beyond the app-level check).
create unique index if not exists uniq_completed_balance
  on payments(appointment_id) where type = 'balance' and status = 'completed';
create unique index if not exists uniq_completed_fee
  on payments(appointment_id) where type = 'fee' and status = 'completed';
