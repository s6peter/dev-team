export interface Stylist {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

export interface Service {
  id: string;
  stylist_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  base_price: number;
  deposit_percent: number;
  tax_rate: number;
  category: string;
  image_url: string;
  prep_notes: string;
  care_notes: string;
  created_at: string;
}

export interface ServiceTier {
  id: string;
  service_id: string;
  name: string;
  description: string;
  price_addon: number;
  duration_addon: number;
}

export interface Availability {
  id: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface AvailabilityOverride {
  id: string;
  stylist_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  reason: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  allergies: string;
  preferences: string;
  tags: string[];
  lifetime_spend: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  stylist_id: string;
  service_id: string;
  service_tier_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "declined" | "completed" | "no_show" | "cancelled";
  notes: string;
  inspiration_photos: string[];
  created_at: string;
}

export interface Payment {
  id: string;
  appointment_id: string;
  type: "deposit" | "balance" | "tip";
  amount: number;
  stripe_payment_id: string | null;
  status: "pending" | "completed" | "refunded" | "failed";
  created_at: string;
}

export interface SlotHold {
  id: string;
  stylist_id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  client_email: string;
  expires_at: string;
  created_at: string;
}

export interface Review {
  id: string;
  appointment_id: string;
  client_id: string;
  rating: number;
  comment: string;
  stylist_response: string | null;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  stylist_id: string;
  title: string;
  description: string;
  image_url: string;
  service_category: string;
  hair_length: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  appointment_id: string | null;
  content: string;
  read: boolean;
  created_at: string;
}
