-- Local seed data (without auth dependencies)
-- This runs after schema.sql

-- Create stylist
INSERT INTO stylists (id, name, email, phone, bio, avatar_url) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'QueenG', 'queengbraids@gmail.com', '+19016311481', 'Professional braiding artist with over 10 years of experience specializing in box braids, cornrows, knotless braids, and protective styles. Located in Denton, TX.', 'https://qgbraids.square.site/uploads/b/78791a80-53df-11ef-a602-c50e6563f189/logo_EE079BAD-2163-4AC9-80E2-6FF1A713FA0E.jpeg?width=400')
ON CONFLICT (email) DO NOTHING;

-- Create services
INSERT INTO services (id, stylist_id, name, description, duration_minutes, base_price, deposit_percent, tax_rate, category, prep_notes, care_notes) VALUES
  -- Adult Braids
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Box Braids', 'Classic box braids in various sizes and lengths. Price varies by size and length.', 240, 16000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair. No heavy oils or products.', 'Moisturize scalp daily. Sleep with a satin bonnet. Avoid heavy products.'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Knotless Braids', 'Gentle knotless braids for a natural look. Price varies by size and length.', 240, 13000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'BOHO Knotless', 'Knotless braids with boho curls. Price varies by size and length.', 240, 15000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kinky & Havana Twist', 'Kinky or Havana twists in various sizes and lengths. Price varies by size and length.', 240, 14000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Senegalese Twist', 'Senegalese twists in various sizes and lengths. Price varies by size and length.', 240, 15000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Passion Twist', 'Trendy passion twists for a boho look. Price varies by size and length.', 240, 16000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Island Twist', 'Island twists in various sizes and lengths. Price varies by size and length.', 240, 18000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cornrows', 'Traditional cornrows, feed-ins, tribal braids, and lemonade styles. Price varies by style and complexity.', 180, 6000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Keep scalp moisturized. Avoid pulling too tight.'),
  ('f9eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Micro Braids', 'Small micro braids in various sizes. Price varies by size.', 300, 22000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Crochet Braids', 'Crochet installs with various bases and hair textures. Price varies by style.', 180, 12000, 50, 0.0825, 'braids', 'Come with cornrows already installed or I can braid them.', 'Keep scalp clean and moisturized.'),
  -- Other Services
  ('fbeebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sew-Ins', 'Sew-in weave installations.', 180, 8000, 50, 0.0825, 'sew-ins', 'Come with clean, braided hair ready for install.', 'Keep scalp clean. Avoid excessive heat.'),
  ('fdeebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fulani Braids', 'Fulani braids with various patterns.', 180, 20000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Keep scalp moisturized. Avoid pulling too tight.'),
  ('faeebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tree Braids', 'Tree braids with various hair textures.', 180, 25000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Keep scalp clean and moisturized.'),
  ('fceebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Natural Hair Twist', 'Twists for natural hair.', 120, 8000, 50, 0.0825, 'twists', 'Come with clean, detangled natural hair.', 'Moisturize regularly. Avoid heavy products.'),
  -- Take Downs
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Braids Take Down', 'Professional braid removal service.', 60, 6000, 50, 0.0825, 'take-down', 'Come with your braids ready for removal.', 'Wash and deep condition after removal.'),
  ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Wig Take Down', 'Professional wig removal and cleanup.', 45, 5000, 50, 0.0825, 'take-down', 'Come with your wig ready for removal.', 'Cleanse and condition natural hair after.'),
  -- Men's Services
  ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Men Braids', 'Cornrows, twists, and braids for men. Price varies by style.', 120, 5000, 50, 0.0825, 'braids', 'Come with clean, dry hair.', 'Keep scalp moisturized.'),
  -- Kids Services
  ('b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kids Box Braids', 'Box braids for kids in various sizes and lengths.', 180, 15000, 50, 0.0825, 'kids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kids Knotless', 'Knotless braids for kids in various sizes and lengths.', 180, 14000, 50, 0.0825, 'kids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kids Havana & Kinky Twist', 'Havana or Kinky twists for kids.', 180, 10000, 50, 0.0825, 'kids', 'Come with clean, dry, detangled hair.', 'Moisturize regularly.'),
  ('b8eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kids Senegalese Twist', 'Senegalese twists for kids.', 180, 10000, 50, 0.0825, 'kids', 'Come with clean, dry, detangled hair.', 'Moisturize regularly.'),
  ('b9eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kids Cornrows', 'Cornrows for kids.', 90, 7000, 50, 0.0825, 'kids', 'Come with clean, dry, detangled hair.', 'Keep scalp moisturized.'),
  ('caeebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kids Crochets', 'Crochet braids for kids.', 120, 10000, 50, 0.0825, 'kids', 'Come with cornrows ready or I can braid them.', 'Keep scalp clean and moisturized.')
ON CONFLICT (id) DO NOTHING;

-- Service tiers using uuid_generate_v4()
-- Box Braids tiers (base: $160 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large box braids, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large box braids, bra length', 2000, 0),
  ('Large - Midback Length', 'Large box braids, midback length', 4000, 30),
  ('Large - Waist Length', 'Large box braids, waist length', 6000, 30),
  ('Large - Butt Length', 'Large box braids, butt length', 8000, 60),
  ('Medium - Shoulder Length', 'Medium box braids, shoulder length', 1000, 0),
  ('Medium - Bra Length', 'Medium box braids, bra length', 3000, 0),
  ('Medium - Midback Length', 'Medium box braids, midback length', 5000, 30),
  ('Medium - Waist Length', 'Medium box braids, waist length', 8000, 60),
  ('Medium - Butt Length', 'Medium box braids, butt length', 11000, 60),
  ('Small - Shoulder Length', 'Small box braids, shoulder length', 4000, 0),
  ('Small - Bra Length', 'Small box braids, bra length', 6000, 30),
  ('Small - Midback Length', 'Small box braids, midback length', 9000, 60),
  ('Small - Waist Length', 'Small box braids, waist length', 12000, 60),
  ('Small - Butt Length', 'Small box braids, butt length', 14000, 90),
  ('Extra Small - Shoulder Length', 'Extra small box braids, shoulder length', 12000, 60),
  ('Extra Small - Bra Length', 'Extra small box braids, bra length', 14000, 60),
  ('Extra Small - Midback Length', 'Extra small box braids, midback length', 17000, 90),
  ('Extra Small - Waist Length', 'Extra small box braids, waist length', 19000, 90),
  ('Extra Small - Butt Length', 'Extra small box braids, butt length', 24000, 120)
) AS t(name, description, price_addon, duration_addon);

-- Knotless Braids tiers (base: $130 = Large bra)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Bra Length', 'Large knotless braids, bra length', 0, 0),
  ('Large - Midback Length', 'Large knotless braids, midback length', 2000, 0),
  ('Large - Waist Length', 'Large knotless braids, waist length', 5000, 30),
  ('Large - Butt Length', 'Large knotless braids, butt length', 7000, 30),
  ('Medium - Shoulder Length', 'Medium knotless braids, shoulder length', 3000, 0),
  ('Medium - Bra Length', 'Medium knotless braids, bra length', 5000, 0),
  ('Medium - Midback Length', 'Medium knotless braids, midback length', 7000, 30),
  ('Medium - Waist Length', 'Medium knotless braids, waist length', 9000, 60),
  ('Medium - Butt Length', 'Medium knotless braids, butt length', 12000, 60),
  ('Small - Shoulder Length', 'Small knotless braids, shoulder length', 7000, 30),
  ('Small - Bra Length', 'Small knotless braids, bra length', 9000, 30),
  ('Small - Midback Length', 'Small knotless braids, midback length', 12000, 60),
  ('Small - Waist Length', 'Small knotless braids, waist length', 15000, 60),
  ('Small - Butt Length', 'Small knotless braids, butt length', 17000, 90),
  ('Extra Small - Shoulder Length', 'Extra small knotless braids, shoulder length', 15000, 60),
  ('Extra Small - Bra Length', 'Extra small knotless braids, bra length', 17000, 60),
  ('Extra Small - Midback Length', 'Extra small knotless braids, midback length', 20000, 90),
  ('Extra Small - Waist Length', 'Extra small knotless braids, waist length', 25000, 90),
  ('Extra Small - Butt Length', 'Extra small knotless braids, butt length', 29000, 120)
) AS t(name, description, price_addon, duration_addon);

-- BOHO Knotless tiers (base: $150 = Large bra)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Bra Length', 'Large boho knotless, bra length', 0, 0),
  ('Large - Midback Length', 'Large boho knotless, midback length', 2000, 0),
  ('Large - Waist Length', 'Large boho knotless, waist length', 5000, 30),
  ('Large - Butt Length', 'Large boho knotless, butt length', 7000, 30),
  ('Medium - Shoulder Length', 'Medium boho knotless, shoulder length', 3000, 0),
  ('Medium - Bra Length', 'Medium boho knotless, bra length', 5000, 0),
  ('Medium - Midback Length', 'Medium boho knotless, midback length', 7000, 30),
  ('Medium - Waist Length', 'Medium boho knotless, waist length', 9000, 60),
  ('Medium - Butt Length', 'Medium boho knotless, butt length', 12000, 60),
  ('Small - Shoulder Length', 'Small boho knotless, shoulder length', 7000, 30),
  ('Small - Bra Length', 'Small boho knotless, bra length', 9000, 30),
  ('Small - Midback Length', 'Small boho knotless, midback length', 12000, 60),
  ('Small - Waist Length', 'Small boho knotless, waist length', 15000, 60),
  ('Small - Butt Length', 'Small boho knotless, butt length', 17000, 90),
  ('Extra Small - Shoulder Length', 'Extra small boho knotless, shoulder length', 13000, 60),
  ('Extra Small - Bra Length', 'Extra small boho knotless, bra length', 17000, 60),
  ('Extra Small - Midback Length', 'Extra small boho knotless, midback length', 22000, 90),
  ('Extra Small - Waist Length', 'Extra small boho knotless, waist length', 25000, 90),
  ('Extra Small - Butt Length', 'Extra small boho knotless, butt length', 29000, 120)
) AS t(name, description, price_addon, duration_addon);

-- Kinky & Havana Twist tiers (base: $140 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large twists, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large twists, bra length', 2000, 0),
  ('Large - Midback Length', 'Large twists, midback length', 6000, 30),
  ('Large - Waist Length', 'Large twists, waist length', 8000, 30),
  ('Medium - Shoulder Length', 'Medium twists, shoulder length', 4000, 0),
  ('Medium - Bra Length', 'Medium twists, bra length', 6000, 0),
  ('Medium - Midback Length', 'Medium twists, midback length', 8000, 30),
  ('Medium - Waist Length', 'Medium twists, waist length', 11000, 60),
  ('Small - Shoulder Length', 'Small twists, shoulder length', 8000, 30),
  ('Small - Bra Length', 'Small twists, bra length', 11000, 30),
  ('Small - Midback Length', 'Small twists, midback length', 14000, 60),
  ('Small - Waist Length', 'Small twists, waist length', 16000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Senegalese Twist tiers (base: $150 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large senegalese twists, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large senegalese twists, bra length', 2000, 0),
  ('Large - Midback Length', 'Large senegalese twists, midback length', 5000, 30),
  ('Large - Waist Length', 'Large senegalese twists, waist length', 7000, 30),
  ('Large - Butt Length', 'Large senegalese twists, butt length', 10000, 60),
  ('Medium - Shoulder Length', 'Medium senegalese twists, shoulder length', 3000, 0),
  ('Medium - Bra Length', 'Medium senegalese twists, bra length', 5000, 0),
  ('Medium - Midback Length', 'Medium senegalese twists, midback length', 7000, 30),
  ('Medium - Waist Length', 'Medium senegalese twists, waist length', 10000, 60),
  ('Medium - Butt Length', 'Medium senegalese twists, butt length', 13000, 60),
  ('Small - Shoulder Length', 'Small senegalese twists, shoulder length', 7000, 30),
  ('Small - Bra Length', 'Small senegalese twists, bra length', 10000, 30),
  ('Small - Midback Length', 'Small senegalese twists, midback length', 13000, 60),
  ('Small - Waist Length', 'Small senegalese twists, waist length', 15000, 60),
  ('Small - Butt Length', 'Small senegalese twists, butt length', 20000, 90),
  ('Extra Small - Shoulder Length', 'Extra small senegalese twists, shoulder length', 15000, 60),
  ('Extra Small - Bra Length', 'Extra small senegalese twists, bra length', 20000, 60),
  ('Extra Small - Midback Length', 'Extra small senegalese twists, midback length', 25000, 90),
  ('Extra Small - Waist Length', 'Extra small senegalese twists, waist length', 30000, 90),
  ('Extra Small - Butt Length', 'Extra small senegalese twists, butt length', 35000, 120)
) AS t(name, description, price_addon, duration_addon);

-- Passion Twist tiers (base: $160 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large passion twists, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large passion twists, bra length', 1000, 0),
  ('Large - Midback Length', 'Large passion twists, midback length', 2000, 0),
  ('Large - Waist Length', 'Large passion twists, waist length', 4000, 30),
  ('Large - Butt Length', 'Large passion twists, butt length', 7000, 30),
  ('Medium - Shoulder Length', 'Medium passion twists, shoulder length', 2000, 0),
  ('Medium - Bra Length', 'Medium passion twists, bra length', 4000, 0),
  ('Medium - Midback Length', 'Medium passion twists, midback length', 6000, 30),
  ('Medium - Waist Length', 'Medium passion twists, waist length', 9000, 60),
  ('Medium - Butt Length', 'Medium passion twists, butt length', 12000, 60),
  ('Small - Shoulder Length', 'Small passion twists, shoulder length', 4000, 0),
  ('Small - Bra Length', 'Small passion twists, bra length', 6000, 0),
  ('Small - Midback Length', 'Small passion twists, midback length', 9000, 30),
  ('Small - Waist Length', 'Small passion twists, waist length', 12000, 60),
  ('Small - Butt Length', 'Small passion twists, butt length', 14000, 60),
  ('Extra Small - Shoulder Length', 'Extra small passion twists, shoulder length', 16000, 60),
  ('Extra Small - Bra Length', 'Extra small passion twists, bra length', 19000, 60),
  ('Extra Small - Midback Length', 'Extra small passion twists, midback length', 22000, 90)
) AS t(name, description, price_addon, duration_addon);

-- Island Twist tiers (base: $180 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large island twists, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large island twists, bra length', 2000, 0),
  ('Large - Midback Length', 'Large island twists, midback length', 5000, 30),
  ('Large - Waist Length', 'Large island twists, waist length', 7000, 30),
  ('Large - Butt Length', 'Large island twists, butt length', 10000, 60),
  ('Medium - Shoulder Length', 'Medium island twists, shoulder length', 3000, 0),
  ('Medium - Bra Length', 'Medium island twists, bra length', 5000, 0),
  ('Medium - Midback Length', 'Medium island twists, midback length', 7000, 30),
  ('Medium - Waist Length', 'Medium island twists, waist length', 10000, 60),
  ('Medium - Butt Length', 'Medium island twists, butt length', 13000, 60),
  ('Small - Shoulder Length', 'Small island twists, shoulder length', 7000, 30),
  ('Small - Bra Length', 'Small island twists, bra length', 10000, 30),
  ('Small - Midback Length', 'Small island twists, midback length', 13000, 60),
  ('Small - Waist Length', 'Small island twists, waist length', 15000, 60),
  ('Small - Butt Length', 'Small island twists, butt length', 20000, 90),
  ('Extra Small - Shoulder Length', 'Extra small island twists, shoulder length', 15000, 60),
  ('Extra Small - Bra Length', 'Extra small island twists, bra length', 20000, 60),
  ('Extra Small - Midback Length', 'Extra small island twists, midback length', 25000, 90),
  ('Extra Small - Waist Length', 'Extra small island twists, waist length', 30000, 90),
  ('Extra Small - Butt Length', 'Extra small island twists, butt length', 35000, 120)
) AS t(name, description, price_addon, duration_addon);

-- Cornrows tiers (base: $60 = Simple no extension)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name, description, price_addon, duration_addon
FROM (VALUES
  ('Simple Style - No Extension', 'Simple cornrows, no extensions', 0, 0),
  ('Simple Style - With Extension', 'Simple cornrows with extensions', 4000, 30),
  ('Feed In Ponytail - Medium Bra', 'Feed in ponytail, medium braids', 8000, 30),
  ('Feed In Ponytail - Small Bra', 'Feed in ponytail, small braids', 11000, 60),
  ('Tribal Braids - Medium', 'Tribal braids, medium size', 9000, 30),
  ('Tribal Braids - Small', 'Tribal braids, small size', 12000, 60),
  ('Lemonade Braids', 'Lemonade style braids', 9000, 30),
  ('2 Layers - Medium Bra', '2 layers, medium braids', 16000, 60),
  ('2 Layers - Medium Midback', '2 layers, medium, midback length', 18000, 60),
  ('2 Layers - Medium Waist', '2 layers, medium, waist length', 20000, 90),
  ('2 Layers - Small Bra', '2 layers, small braids', 22000, 90),
  ('2 Layers - Small Midback', '2 layers, small, midback length', 24000, 90),
  ('2 Layers - Small Waist', '2 layers, small, waist length', 29000, 120),
  ('3 Layers - Medium Bra', '3 layers, medium braids', 24000, 90),
  ('3 Layers - Medium Midback', '3 layers, medium, midback length', 26000, 90),
  ('3 Layers - Medium Waist', '3 layers, medium, waist length', 28000, 120),
  ('3 Layers - Small Bra', '3 layers, small braids', 30000, 120),
  ('3 Layers - Small Midback', '3 layers, small, midback length', 32000, 120),
  ('3 Layers - Waist Waist', '3 layers, small, waist length', 34000, 150)
) AS t(name, description, price_addon, duration_addon);

-- Micro Braids tiers (base: $220 = Medium)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'f9eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name, description, price_addon, duration_addon
FROM (VALUES
  ('Medium', 'Medium micro braids', 0, 0),
  ('Small', 'Small micro braids', 3000, 30),
  ('Extra Small', 'Extra small micro braids', 8000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Crochet Braids tiers (base: $120 = cornrow base pre-looped)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name, description, price_addon, duration_addon
FROM (VALUES
  ('Cornrow Base - Pre-looped', 'Crochet with cornrow base, pre-looped hair', 0, 0),
  ('Cornrow Base - Not Pre-looped', 'Crochet with cornrow base, not pre-looped', 3000, 0),
  ('Individual Braids - Medium', 'Crochet with individual braids, medium', 8000, 30),
  ('Individual Braids - Small', 'Crochet with individual braids, small', 10000, 30),
  ('Butterfly Locs', 'Butterfly locs crochet install', 13000, 60),
  ('Soft Locs', 'Soft locs crochet install', 18000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Kids Box Braids tiers (base: $150 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large kids box braids, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large kids box braids, bra length', 3000, 0),
  ('Large - Midback Length', 'Large kids box braids, midback length', 5000, 30),
  ('Large - Waist Length', 'Large kids box braids, waist length', 7000, 30),
  ('Medium - Shoulder Length', 'Medium kids box braids, shoulder length', 3000, 0),
  ('Medium - Bra Length', 'Medium kids box braids, bra length', 5000, 0),
  ('Medium - Midback Length', 'Medium kids box braids, midback length', 7000, 30),
  ('Medium - Waist Length', 'Medium kids box braids, waist length', 10000, 60),
  ('Small - Shoulder Length', 'Small kids box braids, shoulder length', 5000, 0),
  ('Small - Bra Length', 'Small kids box braids, bra length', 7000, 30),
  ('Small - Midback Length', 'Small kids box braids, midback length', 10000, 60),
  ('Small - Waist Length', 'Small kids box braids, waist length', 13000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Kids Knotless tiers (base: $140 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large kids knotless, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large kids knotless, bra length', 3000, 0),
  ('Large - Midback Length', 'Large kids knotless, midback length', 5000, 30),
  ('Large - Waist Length', 'Large kids knotless, waist length', 7000, 30),
  ('Medium - Shoulder Length', 'Medium kids knotless, shoulder length', 3000, 0),
  ('Medium - Bra Length', 'Medium kids knotless, bra length', 5000, 0),
  ('Medium - Midback Length', 'Medium kids knotless, midback length', 7000, 30),
  ('Medium - Waist Length', 'Medium kids knotless, waist length', 10000, 60),
  ('Small - Shoulder Length', 'Small kids knotless, shoulder length', 5000, 0),
  ('Small - Bra Length', 'Small kids knotless, bra length', 7000, 30),
  ('Small - Midback Length', 'Small kids knotless, midback length', 10000, 60),
  ('Small - Waist Length', 'Small kids knotless, waist length', 13000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Kids Havana & Kinky Twist tiers (base: $100 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large kids twists, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large kids twists, bra length', 3000, 0),
  ('Large - Midback Length', 'Large kids twists, midback length', 5000, 30),
  ('Large - Waist Length', 'Large kids twists, waist length', 8000, 30),
  ('Medium - Shoulder Length', 'Medium kids twists, shoulder length', 5000, 0),
  ('Medium - Bra Length', 'Medium kids twists, bra length', 8000, 0),
  ('Medium - Midback Length', 'Medium kids twists, midback length', 10000, 30),
  ('Medium - Waist Length', 'Medium kids twists, waist length', 12000, 60),
  ('Small - Shoulder Length', 'Small kids twists, shoulder length', 8000, 30),
  ('Small - Bra Length', 'Small kids twists, bra length', 12000, 30),
  ('Small - Midback Length', 'Small kids twists, midback length', 15000, 60),
  ('Small - Waist Length', 'Small kids twists, waist length', 17000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Kids Senegalese Twist tiers (base: $100 = Large shoulder)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'b8eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', name, description, price_addon, duration_addon
FROM (VALUES
  ('Large - Shoulder Length', 'Large kids senegalese twists, shoulder length', 0, 0),
  ('Large - Bra Length', 'Large kids senegalese twists, bra length', 3000, 0),
  ('Large - Midback Length', 'Large kids senegalese twists, midback length', 5000, 30),
  ('Large - Waist Length', 'Large kids senegalese twists, waist length', 8000, 30),
  ('Medium - Shoulder Length', 'Medium kids senegalese twists, shoulder length', 5000, 0),
  ('Medium - Bra Length', 'Medium kids senegalese twists, bra length', 8000, 0),
  ('Medium - Midback Length', 'Medium kids senegalese twists, midback length', 10000, 30),
  ('Medium - Waist Length', 'Medium kids senegalese twists, waist length', 12000, 60),
  ('Small - Shoulder Length', 'Small kids senegalese twists, shoulder length', 8000, 30),
  ('Small - Bra Length', 'Small kids senegalese twists, bra length', 12000, 30),
  ('Small - Midback Length', 'Small kids senegalese twists, midback length', 15000, 60),
  ('Small - Waist Length', 'Small kids senegalese twists, waist length', 17000, 60)
) AS t(name, description, price_addon, duration_addon);

-- Men Braids tiers (base: $50 = 10 Cornrows simple no design)
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon)
SELECT uuid_generate_v4(), 'b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', name, description, price_addon, duration_addon
FROM (VALUES
  ('10 Cornrows - Simple No Design', '10 cornrows, simple, no design', 0, 0),
  ('10+ Cornrows - Simple No Design', '10+ cornrows, simple, no design', 2000, 0),
  ('8 Cornrows - Simple With Design', '8 cornrows, simple, with design', 3000, 0),
  ('8+ Cornrows - Simple With Design', '8+ cornrows, simple, with design', 5000, 0),
  ('Natural Hair Twist - Large', 'Natural hair twist, large', 3000, 0),
  ('Natural Hair Twist - Medium', 'Natural hair twist, medium', 5000, 0),
  ('Natural Hair Braids - Large', 'Natural hair braids, large', 3000, 0),
  ('Natural Hair Braids - Medium', 'Natural hair braids, medium', 5000, 0)
) AS t(name, description, price_addon, duration_addon);

-- Create availability (Mon-Fri 4pm-8pm, Sat 7am-8pm, Sun 1pm-8pm)
INSERT INTO availability (id, stylist_id, day_of_week, start_time, end_time, is_active) VALUES
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, '16:00:00', '20:00:00', true),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, '16:00:00', '20:00:00', true),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, '16:00:00', '20:00:00', true),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 4, '16:00:00', '20:00:00', true),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, '16:00:00', '20:00:00', true),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 6, '07:00:00', '20:00:00', true),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 0, '13:00:00', '20:00:00', true)
ON CONFLICT (stylist_id, day_of_week) DO NOTHING;

-- Create portfolio items
INSERT INTO portfolio_items (id, stylist_id, title, description, image_url, service_category, hair_length) VALUES
  ('11111111-1111-1111-1111-111111111130', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Jumbo Box Braids', 'Beautiful jumbo box braids with curls at the ends', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', 'braids', 'long'),
  ('22222222-2222-2222-2222-222222222231', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Feed-in Cornrows', 'Sleek feed-in cornrows going straight back', 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=400', 'cornrows', 'medium'),
  ('33333333-3333-3333-3333-333333333332', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Knotless Boho Braids', 'Trendy knotless braids with boho curls', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400', 'braids', 'long')
ON CONFLICT (id) DO NOTHING;

-- Create sample reviews
INSERT INTO reviews (id, appointment_id, client_id, rating, comment) VALUES
  ('11111111-1111-1111-1111-111111111140', NULL, NULL, 5, 'Amazing work! QueenG took her time and made sure everything was perfect. My box braids have never looked better!'),
  ('22222222-2222-2222-2222-222222222241', NULL, NULL, 5, 'Best braiding experience I have ever had. Professional, clean, and my hair looks incredible. Will definitely be back!'),
  ('33333333-3333-3333-3333-333333333342', NULL, NULL, 5, 'Love my knotless braids! QueenG was so patient and made sure I was comfortable throughout the whole process.')
ON CONFLICT (id) DO NOTHING;
