-- Multi-staff security hardening (surfaced by the parity judge panel).
--
-- (1) PRIVILEGE ESCALATION: the admin_stylist_update RLS policy is
--     `for update using (user_id = auth.uid())` with no WITH CHECK and no column
--     restriction. Postgres reuses USING as WITH CHECK, so any authenticated
--     stylist can PATCH their own row — including flipping is_owner to true — and
--     self-escalate to owner straight from the browser via PostgREST.
--     Fix: a BEFORE UPDATE trigger makes is_owner server-only. Migrations run as
--     `postgres` and the admin API uses the `service_role` key; both bypass the
--     guard. Only the browser `authenticated`/`anon` roles are blocked.
--
-- (2) NOTIFICATION LEAK: notification_log's read policy used is_admin(), which is
--     true for ANY stylist, so every stylist could read every stylist's client
--     comms (emails/phones/message bodies) directly via PostgREST. Scope it to the
--     owning stylist, matching every other admin read policy.

create or replace function public.guard_stylist_owner_flag() returns trigger
  language plpgsql as $$
begin
  if new.is_owner is distinct from old.is_owner
     and current_user in ('authenticated', 'anon') then
    raise exception 'is_owner is not writable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_stylist_owner on public.stylists;
create trigger trg_guard_stylist_owner
  before update on public.stylists
  for each row execute function public.guard_stylist_owner_flag();

drop policy if exists admin_notiflog_read on notification_log;
create policy admin_notiflog_read on notification_log
  for select using (stylist_id = public.current_stylist_id());
