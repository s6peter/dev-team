export interface CatalogTier {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  kind: "size" | "length" | "addon";
  price_addon: number;
  duration_addon: number;
  sort_order: number;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  buffer_minutes: number;
  base_price: number;
  deposit_percent: number;
  deposit_flat_cents: number | null;
  requires_deposit: boolean;
  tax_rate: number;
  image_url: string | null;
  prep_notes: string | null;
  care_notes: string | null;
  tiers: CatalogTier[];
}

export interface CatalogPolicy {
  policy_text: string;
  cancel_notice_hours: number;
  reschedule_notice_hours: number;
}

export interface CatalogStylist {
  id: string;
  name: string;
  bio: string | null;
  phone: string | null;
  instagram: string | null;
  avatar_url: string | null;
}

export interface Catalog {
  stylist: CatalogStylist | null;
  policy: CatalogPolicy | null;
  services: CatalogService[];
}
