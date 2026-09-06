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

/** An explicit, priced booking option (size × length → price/duration). */
export interface CatalogVariant {
  id: string;
  service_id?: string;
  size: string | null;
  length: string | null;
  label: string;
  price_cents: number;
  price_from: boolean; // "starting at" ($60+) — final price confirmed at the appointment
  duration_minutes: number;
  sort_order?: number;
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
  group_id?: string | null;
  /** v3 grouped catalog: explicit priced variants for this service. */
  variants?: CatalogVariant[];
  /** Legacy additive tier model (kept for the services marketing page). */
  tiers: CatalogTier[];
}

/** One of the 4 booking tiles (Adult / Kids / Mens / Custom). */
export interface CatalogGroup {
  id: string;
  name: string;
  slug: string;
  kind: "standard" | "custom";
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  services: CatalogService[];
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
  openDays: number[];
  /** v3 grouped catalog: 4 group tiles → services → variants. */
  groups: CatalogGroup[];
  /** Legacy flat list (retained for callers not yet migrated to groups). */
  services: CatalogService[];
}
