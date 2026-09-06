-- Give a newly-added stylist a starter catalog (clone another stylist's groups →
-- services → variants, preserving relationships) so they're immediately bookable.
-- Only clones ACTIVE rows. The owner runs this via the staff-create API.
create or replace function public.clone_catalog(p_from uuid, p_to uuid) returns integer as $$
declare g record; s record; new_g uuid; new_s uuid; n integer := 0;
begin
  for g in select * from service_groups where stylist_id = p_from and is_active order by sort_order loop
    insert into service_groups (stylist_id, name, slug, kind, description, image_url, sort_order, is_active)
    values (p_to, g.name, g.slug, g.kind, g.description, g.image_url, g.sort_order, true)
    returning id into new_g;
    for s in select * from services where group_id = g.id and is_active order by sort_order loop
      insert into services (stylist_id, group_id, name, description, category, duration_minutes, buffer_minutes,
        base_price, deposit_percent, deposit_flat_cents, requires_deposit, tax_rate, image_url, prep_notes, care_notes, is_active, sort_order)
      values (p_to, new_g, s.name, s.description, s.category, s.duration_minutes, s.buffer_minutes,
        s.base_price, s.deposit_percent, s.deposit_flat_cents, s.requires_deposit, s.tax_rate, s.image_url, s.prep_notes, s.care_notes, true, s.sort_order)
      returning id into new_s;
      insert into service_variants (service_id, stylist_id, size, length, label, price_cents, price_from, duration_minutes, sort_order, is_active)
      select new_s, p_to, size, length, label, price_cents, price_from, duration_minutes, sort_order, true
      from service_variants where service_id = s.id and is_active;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$ language plpgsql security definer;
