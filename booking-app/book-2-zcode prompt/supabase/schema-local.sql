-- Local development schema (without Supabase auth dependency)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create auth schema for local dev (replaces Supabase auth)
create schema if not exists auth;

-- Create a simple users table for local dev (replaces auth.users)
create table auth.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamp with time zone default now()
);

-- Stylists table
create table stylists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  phone text,
  bio text,
  avatar_url text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Services table
create table services (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid references stylists(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null,
  base_price integer not null,
  deposit_percent numeric(5,2) not null default 50.00,
  tax_rate numeric(5,4) not null default 0.0825,
  category text not null,
  image_url text,
  prep_notes text,
  care_notes text,
  created_at timestamp with time zone default now()
);

-- Service tiers table
create table service_tiers (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid references services(id) on delete cascade,
  name text not null,
  description text,
  price_addon integer not null default 0,
  duration_addon integer not null default 0
);

-- Availability table (weekly recurring)
create table availability (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid references stylists(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  unique(stylist_id, day_of_week)
);

-- Availability overrides (time off/travel)
create table availability_overrides (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid references stylists(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  is_available boolean not null default false,
  reason text
);

-- Clients table
create table clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  notes text,
  allergies text,
  preferences text,
  tags text[] default '{}',
  lifetime_spend integer not null default 0,
  created_at timestamp with time zone default now()
);

-- Appointments table
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  stylist_id uuid references stylists(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  service_tier_id uuid references service_tiers(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'completed', 'no_show', 'cancelled')),
  notes text,
  inspiration_photos text[] default '{}',
  created_at timestamp with time zone default now()
);

-- Payments table
create table payments (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete cascade,
  type text not null check (type in ('deposit', 'balance', 'tip')),
  amount integer not null,
  stripe_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'refunded', 'failed')),
  created_at timestamp with time zone default now()
);

-- Slot holds table (TTL auto-release)
create table slot_holds (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid references stylists(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  client_email text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Reviews table
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  stylist_response text,
  created_at timestamp with time zone default now()
);

-- Portfolio items table
create table portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid references stylists(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  service_category text,
  hair_length text,
  created_at timestamp with time zone default now()
);

-- Messages table
create table messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null,
  receiver_id uuid not null,
  appointment_id uuid references appointments(id) on delete set null,
  content text not null,
  read boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Intake responses table
create table intake_responses (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete cascade,
  question text not null,
  answer text not null
);

-- Indexes
create index idx_services_stylist on services(stylist_id);
create index idx_service_tiers_service on service_tiers(service_id);
create index idx_availability_stylist on availability(stylist_id);
create index idx_availability_overrides_stylist on availability_overrides(stylist_id);
create index idx_appointments_date on appointments(date);
create index idx_appointments_stylist on appointments(stylist_id);
create index idx_appointments_client on appointments(client_id);
create index idx_appointments_status on appointments(status);
create index idx_payments_appointment on payments(appointment_id);
create index idx_slot_holds_stylist on slot_holds(stylist_id);
create index idx_slot_holds_expires on slot_holds(expires_at);
create index idx_reviews_appointment on reviews(appointment_id);

-- Function to auto-release expired slot holds
create or replace function release_expired_slot_holds()
returns trigger as $$
begin
  delete from slot_holds where expires_at < now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-release expired slot holds
create trigger trigger_release_slot_holds
  after insert on slot_holds
  execute function release_expired_slot_holds();
