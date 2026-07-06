-- Local seed data (without auth dependencies)
-- This runs after schema.sql

-- Create stylist
INSERT INTO stylists (id, name, email, phone, bio, avatar_url) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'QueenG', 'queengbraids@gmail.com', '+19016311481', 'Professional braiding artist with over 10 years of experience specializing in box braids, cornrows, knotless braids, and protective styles. Located in Denton, TX.', 'https://qgbraids.square.site/uploads/b/78791a80-53df-11ef-a602-c50e6563f189/logo_EE079BAD-2163-4AC9-80E2-6FF1A713FA0E.jpeg?width=400')
ON CONFLICT (email) DO NOTHING;

-- Create services
INSERT INTO services (id, stylist_id, name, description, duration_minutes, base_price, deposit_percent, tax_rate, category, prep_notes, care_notes) VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Box Braids', 'Classic box braids in various sizes and lengths. Price ranges from $210-$230 depending on size.', 180, 21000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair. No heavy oils or products.', 'Moisturize scalp daily. Sleep with a satin bonnet. Avoid heavy products.'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cornrows', 'Traditional cornrows in various patterns', 120, 10000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Keep scalp moisturized. Avoid pulling too tight.'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Knotless Braids', 'Gentle knotless braids for a natural look. Starting at $230.', 240, 23000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Crochet Braids', 'Quick crochet install with various hair textures', 150, 12000, 50, 0.0825, 'braids', 'Come with cornrows already installed or I can braid them.', 'Keep scalp clean and moisturized.'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Havana Twists', 'Havana twists in various sizes', 180, 18000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kinky Twists', 'Kinky twists for a natural look', 180, 18000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Passion Twists', 'Trendy passion twists for a boho look', 180, 18000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Senegalese Twists', 'Senegalese twists in various sizes', 180, 18000, 50, 0.0825, 'twists', 'Come with clean, dry, detangled hair.', 'Moisturize regularly. Avoid heavy products.'),
  ('f9eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Micro Braids', 'Small micro braids for a detailed look', 300, 25000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('faeebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tree Braids', 'Tree braids with various hair textures', 180, 18000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Keep scalp clean and moisturized.'),
  ('fbeebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sew-Ins', 'Sew-in weave installations', 180, 20000, 50, 0.0825, 'sew-ins', 'Come with clean, braided hair ready for install.', 'Keep scalp clean. Avoid excessive heat.'),
  ('fceebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Boho Knotless', 'Knotless braids with boho curls', 240, 25000, 50, 0.0825, 'braids', 'Come with clean, dry, detangled hair.', 'Moisturize scalp daily. Sleep with a satin bonnet.'),
  ('fdeebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Natural Hair Twists', 'Twists for natural hair', 120, 10000, 50, 0.0825, 'twists', 'Come with clean, detangled natural hair.', 'Moisturize regularly. Avoid heavy products.')
ON CONFLICT (id) DO NOTHING;

-- Create service tiers for Box Braids
INSERT INTO service_tiers (id, service_id, name, description, price_addon, duration_addon) VALUES
  ('11111111-1111-1111-1111-111111111117', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Small', 'Small box braids for a fuller look', 2000, 60),
  ('22222222-2222-2222-2222-222222222218', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Medium', 'Medium box braids, most popular size', 0, 0),
  ('33333333-3333-3333-3333-333333333319', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Large', 'Large box braids for a quicker install', -1000, -30)
ON CONFLICT (id) DO NOTHING;

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
