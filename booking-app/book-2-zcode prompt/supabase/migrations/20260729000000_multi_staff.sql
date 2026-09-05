-- Multi-staff: mark the salon owner (can add/manage staff). Each stylist still
-- self-manages their own services/availability/calendar/clients via RLS.
alter table stylists add column if not exists is_owner boolean not null default false;
update stylists set is_owner = true where id = '11111111-1111-1111-1111-111111111111';
