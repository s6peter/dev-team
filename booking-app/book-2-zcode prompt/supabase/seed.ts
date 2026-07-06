import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding database...");

  // Create stylist
  const { data: stylist, error: stylistError } = await supabase
    .from("stylists")
    .insert({
      name: "QueenG",
      email: "hello@queengbraids.com",
      phone: "+1234567890",
      bio: "Professional braiding artist with over 10 years of experience specializing in box braids, cornrows, and protective styles.",
      avatar_url: "https://qgbraids.square.site/uploads/b/78791a80-53df-11ef-a602-c50e6563f189/logo_EE079BAD-2163-4AC9-80E2-6FF1A713FA0E.jpeg?width=400",
    })
    .select()
    .single();

  if (stylistError) {
    console.error("Error creating stylist:", stylistError);
    return;
  }

  console.log("Created stylist:", stylist.id);

  // Create services
  const services = [
    {
      stylist_id: stylist.id,
      name: "Box Braids",
      description: "Classic box braids in various sizes and lengths",
      duration_minutes: 180,
      base_price: 15000,
      deposit_percent: 50,
      tax_rate: 0.0825,
      category: "braids",
      prep_notes: "Come with clean, dry, detangled hair. No heavy oils or products.",
      care_notes: "Moisturize scalp daily. Sleep with a satin bonnet. Avoid heavy products.",
    },
    {
      stylist_id: stylist.id,
      name: "Cornrows",
      description: "Traditional cornrows in various patterns",
      duration_minutes: 120,
      base_price: 10000,
      deposit_percent: 50,
      tax_rate: 0.0825,
      category: "braids",
      prep_notes: "Come with clean, dry, detangled hair.",
      care_notes: "Keep scalp moisturized. Avoid pulling too tight.",
    },
    {
      stylist_id: stylist.id,
      name: "Knotless Braids",
      description: "Gentle knotless braids for a natural look",
      duration_minutes: 240,
      base_price: 20000,
      deposit_percent: 50,
      tax_rate: 0.0825,
      category: "braids",
      prep_notes: "Come with clean, dry, detangled hair.",
      care_notes: "Moisturize scalp daily. Sleep with a satin bonnet.",
    },
    {
      stylist_id: stylist.id,
      name: "Crochet Braids",
      description: "Quick crochet install with various hair textures",
      duration_minutes: 150,
      base_price: 12000,
      deposit_percent: 50,
      tax_rate: 0.0825,
      category: "braids",
      prep_notes: "Come with cornrows already installed or I can braid them.",
      care_notes: "Keep scalp clean and moisturized.",
    },
    {
      stylist_id: stylist.id,
      name: "Twists",
      description: "Senegalese or rope twists in various sizes",
      duration_minutes: 180,
      base_price: 14000,
      deposit_percent: 50,
      tax_rate: 0.0825,
      category: "twists",
      prep_notes: "Come with clean, dry, detangled hair.",
      care_notes: "Moisturize regularly. Avoid heavy products.",
    },
  ];

  const { data: createdServices, error: servicesError } = await supabase
    .from("services")
    .insert(services)
    .select();

  if (servicesError) {
    console.error("Error creating services:", servicesError);
    return;
  }

  console.log("Created services:", createdServices?.length);

  // Create service tiers for Box Braids
  if (createdServices && createdServices[0]) {
    const boxBraidTiers = [
      {
        service_id: createdServices[0].id,
        name: "Small",
        description: "Small box braids for a fuller look",
        price_addon: 5000,
        duration_addon: 60,
      },
      {
        service_id: createdServices[0].id,
        name: "Medium",
        description: "Medium box braids, most popular size",
        price_addon: 0,
        duration_addon: 0,
      },
      {
        service_id: createdServices[0].id,
        name: "Large",
        description: "Large box braids for a quicker install",
        price_addon: -3000,
        duration_addon: -30,
      },
    ];

    const { error: tiersError } = await supabase
      .from("service_tiers")
      .insert(boxBraidTiers);

    if (tiersError) {
      console.error("Error creating tiers:", tiersError);
    }
  }

  // Create availability (Mon-Sat, 9am-6pm)
  const availabilitySlots = [];
  for (let day = 1; day <= 6; day++) {
    availabilitySlots.push({
      stylist_id: stylist.id,
      day_of_week: day,
      start_time: "09:00:00",
      end_time: "18:00:00",
      is_active: true,
    });
  }

  const { error: availabilityError } = await supabase
    .from("availability")
    .insert(availabilitySlots);

  if (availabilityError) {
    console.error("Error creating availability:", availabilityError);
  }

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
