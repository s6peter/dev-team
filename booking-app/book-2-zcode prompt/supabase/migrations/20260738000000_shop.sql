-- Shop: braiding accessories the owner sells; customers add to cart, check out, pay (Stripe).
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null default 0,
  image_url text,
  stock int,                       -- null = unlimited / not tracked
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_products_stylist on products(stylist_id, sort_order);

create table if not exists product_orders (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,   -- [{product_id,name,price_cents,qty}]
  subtotal_cents int not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled')),
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists idx_product_orders_stylist on product_orders(stylist_id, created_at desc);

alter table products enable row level security;
alter table product_orders enable row level security;

drop policy if exists pub_read_products on products;
create policy pub_read_products on products for select using (is_active);
drop policy if exists admin_products on products;
create policy admin_products on products for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());

drop policy if exists admin_orders_read on product_orders;
create policy admin_orders_read on product_orders for select using (stylist_id = current_stylist_id());

grant all on products to anon, authenticated, service_role;
grant all on product_orders to anon, authenticated, service_role;
