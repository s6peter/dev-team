-- Shop categories (managed like service groups) + product video.
create table if not exists product_categories (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references stylists(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_product_categories_stylist on product_categories(stylist_id, sort_order);

alter table products add column if not exists category_id uuid references product_categories(id) on delete set null;
alter table products add column if not exists video_url text;

-- Migrate existing free-text categories into managed category rows.
insert into product_categories (stylist_id, name, sort_order)
select stylist_id, category, row_number() over (partition by stylist_id order by min(sort_order)) - 1
from products where category is not null
group by stylist_id, category
on conflict do nothing;
update products p set category_id = pc.id
from product_categories pc where pc.stylist_id = p.stylist_id and pc.name = p.category and p.category_id is null;

alter table product_categories enable row level security;
drop policy if exists pub_read_product_categories on product_categories;
create policy pub_read_product_categories on product_categories for select using (is_active);
drop policy if exists admin_product_categories on product_categories;
create policy admin_product_categories on product_categories for all
  using (stylist_id = current_stylist_id()) with check (stylist_id = current_stylist_id());
grant all on product_categories to anon, authenticated, service_role;
