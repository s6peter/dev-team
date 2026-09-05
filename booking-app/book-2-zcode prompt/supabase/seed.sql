-- QueenG Braids seed (money in cents). Idempotent-ish: run on `supabase db reset`.
-- Stylist id is fixed so scripts/app can reference it.

insert into stylists (id, name, email, phone, bio, instagram, avatar_url) values
('11111111-1111-1111-1111-111111111111',
 'QueenG Braids & Essentials',
 'queengbraids@gmail.com',
 '(901) 631-1481',
 'Protective styling specialist in Denton, TX. Knotless box braids, twists, locs and more — clean parts, gentle tension, and styles built to last.',
 'queengbraids',
 'https://picsum.photos/seed/queeng-avatar/400/400');

-- Owner flag: migrations run before seed on `db reset`, so the migration's
-- is_owner backfill hits an empty table; set it here so the owner keeps owner rights.
update stylists set is_owner = true where id = '11111111-1111-1111-1111-111111111111';

insert into cancellation_policy (stylist_id, reschedule_notice_hours, cancel_notice_hours, late_cancel_fee_percent, no_show_fee_percent, blow_dry_fee_cents, late_fee_cents, grace_minutes, policy_text) values
('11111111-1111-1111-1111-111111111111', 24, 24, 100, 100, 2000, 2000, 10,
 'A $50 non-refundable deposit is required to book and is applied toward your service; the remaining balance is due after service (taxes are charged on the deposit only, not the full price). You will not be charged if you cancel at least 24 hours before your appointment; cancellations made less than 24 hours before, and no-call/no-shows, forfeit the deposit. You may reschedule once with the same deposit at least 24 hours before your appointment using the link in your confirmation email. Hair must be washed and blow-dried with no oil or products applied — if it cannot be blow-dried as required, a $20 fee applies. We provide Xpression pre-stretched extensions for all styles; for boho styles please bring your own 100% human hair (curly pieces), and bring your own hair for all other styles. Please arrive on time: a 10-minute grace period is allowed, after 10 minutes a $20 late fee applies, and after 15 minutes your appointment is cancelled as a no-show and the deposit is forfeited. Kids braids are for children ages 5–12; parents drop off only and a pickup text is sent about 30 minutes before completion. No extra guests, please.');

-- Categories -----------------------------------------------------------------
insert into service_categories (stylist_id, name, sort_order) values
('11111111-1111-1111-1111-111111111111','Box Braids',1),
('11111111-1111-1111-1111-111111111111','Cornrows',2),
('11111111-1111-1111-1111-111111111111','Twists',3),
('11111111-1111-1111-1111-111111111111','Locs',4),
('11111111-1111-1111-1111-111111111111','Kids',5),
('11111111-1111-1111-1111-111111111111','Add-ons',6);

-- Services -------------------------------------------------------------------
insert into services (id, stylist_id, name, description, category, duration_minutes, buffer_minutes, base_price, deposit_percent, requires_deposit, tax_rate, image_url, prep_notes, care_notes, sort_order) values
('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Knotless Box Braids','Lightweight, natural-looking knotless braids with gentle tension. Our signature style.','Box Braids',360,30,18000,50,true,0.08250,'https://picsum.photos/seed/knotless/800/1000','Arrive with hair washed, blow-dried straight, and fully detangled. No added product.','Wrap nightly with a satin scarf. Oil the scalp 2x/week. Lasts 6-8 weeks.',1),
('22222222-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Box Braids','Classic three-strand box braids in the size and length of your choice.','Box Braids',300,30,16000,50,true,0.08250,'https://picsum.photos/seed/boxbraids/800/1000','Hair washed, blow-dried and detangled.','Satin scarf nightly, light scalp oil. Lasts 6-8 weeks.',2),
('22222222-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Feed-in Cornrows','Sleek straight-back or custom-pattern feed-in cornrows.','Cornrows',150,15,9000,50,true,0.08250,'https://picsum.photos/seed/cornrows/800/1000','Freshly washed and blow-dried hair.','Sleep with a durag or scarf. Lasts 2-4 weeks.',3),
('22222222-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Senegalese Twists','Smooth, rope-like two-strand twists with a polished finish.','Twists',330,30,17000,50,true,0.08250,'https://picsum.photos/seed/senegalese/800/1000','Washed, blow-dried, detangled hair.','Satin scarf nightly. Lasts 6-8 weeks.',4),
('22222222-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Passion Twists','Bohemian, textured twists with a soft, natural look.','Twists',330,30,17500,50,true,0.08250,'https://picsum.photos/seed/passion/800/1000','Washed, blow-dried, detangled hair.','Satin scarf nightly. Lasts 4-6 weeks.',5),
('22222222-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Kids Braids','Gentle braided styles for children 10 and under.','Kids',120,15,7000,50,true,0.08250,'https://picsum.photos/seed/kids/800/1000','Washed, detangled hair.','Satin bonnet nightly.',8),
('22222222-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','Takedown / Removal','Careful removal of an existing protective style.','Add-ons',90,0,6000,0,false,0.08250,'https://picsum.photos/seed/takedown/800/1000','Come as you are.','Deep condition after removal.',9);

-- Tiers (size + length variants) --------------------------------------------
insert into service_tiers (service_id, name, kind, price_addon, duration_addon, sort_order) values
-- Knotless
('22222222-0000-0000-0000-000000000001','Small','size',6000,120,1),
('22222222-0000-0000-0000-000000000001','Medium','size',0,0,2),
('22222222-0000-0000-0000-000000000001','Large / Jumbo','size',0,-60,3),
('22222222-0000-0000-0000-000000000001','Shoulder length','length',0,0,4),
('22222222-0000-0000-0000-000000000001','Bra length','length',3000,30,5),
('22222222-0000-0000-0000-000000000001','Waist length','length',6000,60,6),
-- Box Braids
('22222222-0000-0000-0000-000000000002','Small','size',5000,120,1),
('22222222-0000-0000-0000-000000000002','Medium','size',0,0,2),
('22222222-0000-0000-0000-000000000002','Large / Jumbo','size',0,-60,3),
('22222222-0000-0000-0000-000000000002','Shoulder length','length',0,0,4),
('22222222-0000-0000-0000-000000000002','Bra length','length',3000,30,5),
('22222222-0000-0000-0000-000000000002','Waist length','length',6000,60,6),
-- Cornrows
('22222222-0000-0000-0000-000000000003','Straight back (up to 8)','size',0,0,1),
('22222222-0000-0000-0000-000000000003','Custom design','size',3000,60,2),
-- Senegalese
('22222222-0000-0000-0000-000000000004','Small','size',5000,120,1),
('22222222-0000-0000-0000-000000000004','Medium','size',0,0,2),
('22222222-0000-0000-0000-000000000004','Large','size',0,-45,3),
-- Passion
('22222222-0000-0000-0000-000000000005','Regular','size',0,0,1),
('22222222-0000-0000-0000-000000000005','Long / Waist','length',4000,60,2);

-- Add-ons available across services (hair provided, blow-dry)
insert into service_tiers (service_id, name, kind, price_addon, duration_addon, sort_order) values
('22222222-0000-0000-0000-000000000001','+ Hair provided','addon',3500,0,7),
('22222222-0000-0000-0000-000000000002','+ Hair provided','addon',3500,0,7);

-- Weekly availability --------------------------------------------------------
insert into availability (stylist_id, day_of_week, start_time, end_time, is_active) values
('11111111-1111-1111-1111-111111111111',0,'13:00','20:00',true),
('11111111-1111-1111-1111-111111111111',1,'16:00','20:00',true),
('11111111-1111-1111-1111-111111111111',2,'16:00','20:00',true),
('11111111-1111-1111-1111-111111111111',3,'16:00','20:00',true),
('11111111-1111-1111-1111-111111111111',4,'16:00','20:00',true),
('11111111-1111-1111-1111-111111111111',5,'09:00','20:00',true),
('11111111-1111-1111-1111-111111111111',6,'07:00','20:00',true);

-- Portfolio ------------------------------------------------------------------
insert into portfolio_items (stylist_id, title, description, image_url, service_category, hair_length, sort_order) values
('11111111-1111-1111-1111-111111111111','Knotless Waist-Length','Medium knotless in waist length','https://picsum.photos/seed/p1/800/1000','Box Braids','Waist',1),
('11111111-1111-1111-1111-111111111111','Jumbo Box Braids','Bold jumbo box braids','https://picsum.photos/seed/p2/800/1000','Box Braids','Bra',2),
('11111111-1111-1111-1111-111111111111','Feed-in Design','Custom feed-in cornrow pattern','https://picsum.photos/seed/p3/800/1000','Cornrows','Scalp',3),
('11111111-1111-1111-1111-111111111111','Passion Twists','Bohemian passion twists','https://picsum.photos/seed/p4/800/1000','Twists','Bra',4),
('11111111-1111-1111-1111-111111111111','Senegalese Twists','Sleek small Senegalese twists','https://picsum.photos/seed/p6/800/1000','Twists','Waist',6);

-- A few published reviews for social proof -----------------------------------
insert into reviews (stylist_id, author_name, rating, comment, is_published) values
('11111111-1111-1111-1111-111111111111','Jasmine T.',5,'My knotless braids came out perfect and my scalp didn''t hurt at all. Booking online was so easy!',true),
('11111111-1111-1111-1111-111111111111','Destiny R.',5,'QueenG is the truth. Clean parts, fast, and they lasted almost 9 weeks. Booked my next appointment already.',true),
('11111111-1111-1111-1111-111111111111','Maya L.',5,'Love that I could see the price and pay my deposit upfront. Professional from start to finish.',true),
('11111111-1111-1111-1111-111111111111','Andrea P.',4,'Beautiful passion twists. Ran a little over time but worth it.',true);

-- Second stylist (Bianca) â reproduces the multi-staff setup on `db reset`.
-- Non-owner (is_owner defaults false); setup-local.mjs links her auth user_id.
insert into stylists (id, name, email, phone, bio, instagram, avatar_url) values
('33333333-3333-3333-3333-333333333333',
 'Bianca — Boho & Twists',
 'bianca@queengbraids.com',
 '(901) 631-1482',
 'Boho knotless and textured-twist specialist. Soft, natural-looking installs with a lightweight finish.',
 'queengbraids',
 'https://picsum.photos/seed/bianca-avatar/400/400');

insert into cancellation_policy (stylist_id, reschedule_notice_hours, cancel_notice_hours, late_cancel_fee_percent, no_show_fee_percent, blow_dry_fee_cents, late_fee_cents, grace_minutes, policy_text) values
('33333333-3333-3333-3333-333333333333', 24, 24, 100, 100, 2000, 2000, 10,
 'A $50 non-refundable deposit is required to book and is applied toward your service; the remaining balance is due after service (taxes are charged on the deposit only, not the full price). You will not be charged if you cancel at least 24 hours before your appointment; cancellations made less than 24 hours before, and no-call/no-shows, forfeit the deposit. You may reschedule once with the same deposit at least 24 hours before your appointment using the link in your confirmation email. Hair must be washed and blow-dried with no oil or products applied — if it cannot be blow-dried as required, a $20 fee applies. For boho styles please bring your own 100% human hair (curly pieces). Please arrive on time: a 10-minute grace period is allowed, after 10 minutes a $20 late fee applies, and after 15 minutes your appointment is cancelled as a no-show and the deposit is forfeited. No extra guests, please.');

-- Bianca services (deposit_flat_cents + extension notes applied by the blanket updates below).
insert into services (id, stylist_id, name, description, category, duration_minutes, buffer_minutes, base_price, deposit_percent, requires_deposit, tax_rate, image_url, prep_notes, care_notes, sort_order) values
('44444444-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Boho Knotless','Knotless box braids with curly boho pieces for a soft, bohemian finish.','Box Braids',360,30,20000,50,true,0.08250,'https://picsum.photos/seed/boho-knotless/800/1000','Arrive with hair washed, blow-dried straight, and detangled. Bring your own 100% human curly hair for the boho pieces.','Wrap nightly with a satin scarf. Lasts 6-8 weeks.',1),
('44444444-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','Passion Twists','Bohemian, textured passion twists with a soft, natural look.','Twists',330,30,18000,50,true,0.08250,'https://picsum.photos/seed/bianca-passion/800/1000','Washed, blow-dried, detangled hair.','Satin scarf nightly. Lasts 4-6 weeks.',2);

insert into service_tiers (service_id, name, kind, price_addon, duration_addon, sort_order) values
('44444444-0000-0000-0000-000000000001','Small','size',6000,120,1),
('44444444-0000-0000-0000-000000000001','Medium','size',0,0,2),
('44444444-0000-0000-0000-000000000001','Bra length','length',3000,30,3),
('44444444-0000-0000-0000-000000000001','Waist length','length',6000,60,4);

insert into availability (stylist_id, day_of_week, start_time, end_time, is_active) values
('33333333-3333-3333-3333-333333333333',2,'10:00','18:00',true),
('33333333-3333-3333-3333-333333333333',3,'10:00','18:00',true),
('33333333-3333-3333-3333-333333333333',4,'10:00','18:00',true),
('33333333-3333-3333-3333-333333333333',5,'10:00','18:00',true),
('33333333-3333-3333-3333-333333333333',6,'08:00','18:00',true);

-- Policy-driven adjustments --------------------------------------------------
-- Flat $50 non-refundable deposit on every deposit-required service.
update services set deposit_flat_cents = 5000 where requires_deposit;
-- Extensions note on all styles that use hair.
update services set prep_notes =
  coalesce(prep_notes || ' ', '') || 'Xpression pre-stretched extensions are provided; bring your own hair for non-boho styles.'
  where category in ('Box Braids','Twists');
-- Kids age range correction.
update services set description = 'Gentle braided styles for children ages 5–12. Parent drop-off only.'
  where name = 'Kids Braids';
