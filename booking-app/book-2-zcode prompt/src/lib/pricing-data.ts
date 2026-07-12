export interface PricingCell {
  label: string;
  price: number;
}

export interface PricingRow {
  size: string;
  lengths: PricingCell[];
}

export interface ServicePricingItem {
  id: string;
  name: string;
  pricing: PricingRow[];
  note?: string;
}

export interface CategoryPricing {
  name: string;
  icon: string;
  services: ServicePricingItem[];
}

const STORAGE_KEY = "queeng_pricing";

export const defaultPricingData: CategoryPricing[] = [
  {
    name: "Box Braids", icon: "✨",
    services: [{
      id: "bb-1", name: "Box Braids", pricing: [
        { size: "Large", lengths: [{ label: "Shoulder", price: 160 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 240 }] },
        { size: "Medium", lengths: [{ label: "Shoulder", price: 170 }, { label: "Bra", price: 190 }, { label: "Midback", price: 210 }, { label: "Waist", price: 240 }, { label: "Butt", price: 270 }] },
        { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 300 }] },
        { size: "Extra Small", lengths: [{ label: "Shoulder", price: 280 }, { label: "Bra", price: 300 }, { label: "Midback", price: 330 }, { label: "Waist", price: 350 }, { label: "Butt", price: 400 }] },
      ],
    }],
  },
  {
    name: "Knotless Braids", icon: "💫",
    services: [
      {
        id: "kn-1", name: "Knotless Braids", pricing: [
          { size: "Large", lengths: [{ label: "Bra", price: 130 }, { label: "Midback", price: 150 }, { label: "Waist", price: 180 }, { label: "Butt", price: 200 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 160 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 250 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 300 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 260 }, { label: "Bra", price: 300 }, { label: "Midback", price: 330 }, { label: "Waist", price: 380 }, { label: "Butt", price: 420 }] },
        ],
      },
      {
        id: "kn-2", name: "BOHO Knotless", pricing: [
          { size: "Large", lengths: [{ label: "Bra", price: 150 }, { label: "Midback", price: 170 }, { label: "Waist", price: 200 }, { label: "Butt", price: 220 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 240 }, { label: "Butt", price: 270 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 240 }, { label: "Midback", price: 270 }, { label: "Waist", price: 300 }, { label: "Butt", price: 320 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 280 }, { label: "Bra", price: 320 }, { label: "Midback", price: 370 }, { label: "Waist", price: 400 }, { label: "Butt", price: 440 }] },
        ],
      },
    ],
  },
  {
    name: "Twists", icon: "🌸",
    services: [
      {
        id: "tw-1", name: "Kinky & Havana Twist", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 140 }, { label: "Bra", price: 160 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 230 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 250 }, { label: "Midback", price: 280 }, { label: "Waist", price: 300 }] },
        ],
      },
      {
        id: "tw-2", name: "Senegalese Twist", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 170 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 250 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 250 }, { label: "Midback", price: 280 }, { label: "Waist", price: 300 }, { label: "Butt", price: 350 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 300 }, { label: "Bra", price: 350 }, { label: "Midback", price: 400 }, { label: "Waist", price: 450 }, { label: "Butt", price: 500 }] },
        ],
      },
      {
        id: "tw-3", name: "Passion Twist", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 160 }, { label: "Bra", price: 170 }, { label: "Midback", price: 180 }, { label: "Waist", price: 200 }, { label: "Butt", price: 230 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 300 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 320 }, { label: "Bra", price: 350 }, { label: "Midback", price: 380 }] },
        ],
      },
      {
        id: "tw-4", name: "Island Twist", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 230 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 210 }, { label: "Bra", price: 230 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 310 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 250 }, { label: "Bra", price: 280 }, { label: "Midback", price: 310 }, { label: "Waist", price: 330 }, { label: "Butt", price: 380 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 330 }, { label: "Bra", price: 380 }, { label: "Midback", price: 430 }, { label: "Waist", price: 480 }, { label: "Butt", price: 530 }] },
        ],
      },
    ],
  },
  {
    name: "Cornrows", icon: "👑",
    services: [
      {
        id: "cr-1", name: "Cornrows", pricing: [
          { size: "Simple no extension", lengths: [{ label: "Starting at", price: 60 }] },
          { size: "Simple with extension", lengths: [{ label: "Starting at", price: 100 }] },
          { size: "Feed In Ponytail medium", lengths: [{ label: "Starting at", price: 140 }] },
          { size: "Feed In Ponytail small", lengths: [{ label: "Starting at", price: 170 }] },
          { size: "Tribal Braids medium", lengths: [{ label: "Starting at", price: 150 }] },
          { size: "Tribal Braids small", lengths: [{ label: "Starting at", price: 180 }] },
          { size: "Lemonade Braids", lengths: [{ label: "Starting at", price: 150 }] },
        ],
      },
      {
        id: "cr-2", name: "Cornrows - Multi Layer", pricing: [
          { size: "2 layers medium", lengths: [{ label: "Bra", price: 220 }, { label: "Midback", price: 240 }, { label: "Waist", price: 260 }] },
          { size: "2 layers small", lengths: [{ label: "Bra", price: 280 }, { label: "Midback", price: 300 }, { label: "Waist", price: 350 }] },
          { size: "3 layers medium", lengths: [{ label: "Bra", price: 300 }, { label: "Midback", price: 320 }, { label: "Waist", price: 340 }] },
          { size: "3 layers small", lengths: [{ label: "Bra", price: 360 }, { label: "Midback", price: 380 }, { label: "Waist", price: 400 }] },
        ],
      },
    ],
  },
  {
    name: "Crochets", icon: "🪝",
    services: [
      {
        id: "cc-1", name: "Crochets", pricing: [
          { size: "Cornrow base (pre-looped)", lengths: [{ label: "Starting at", price: 120 }] },
          { size: "Cornrow base (not pre-looped)", lengths: [{ label: "Starting at", price: 150 }] },
          { size: "Individual braids medium", lengths: [{ label: "Starting at", price: 200 }] },
          { size: "Individual braid small", lengths: [{ label: "Starting at", price: 220 }] },
          { size: "Butterfly locks", lengths: [{ label: "Starting at", price: 250 }] },
          { size: "Soft Locks", lengths: [{ label: "Starting at", price: 300 }] },
        ],
      },
    ],
  },
  {
    name: "Micro Braids", icon: "💎",
    services: [
      {
        id: "mb-1", name: "Micro Braids", pricing: [
          { size: "Medium", lengths: [{ label: "Starting at", price: 220 }] },
          { size: "Small", lengths: [{ label: "Starting at", price: 250 }] },
          { size: "Extra Small", lengths: [{ label: "Starting at", price: 300 }] },
        ],
      },
    ],
  },
  {
    name: "Other Services", icon: "💇‍♀️",
    services: [
      {
        id: "os-1", name: "Braids Take Down", pricing: [{ size: "Standard", lengths: [{ label: "Price", price: 60 }] }],
      },
      {
        id: "os-2", name: "Wig Take Down", pricing: [{ size: "Standard", lengths: [{ label: "Price", price: 50 }] }],
      },
      {
        id: "os-3", name: "Tree Braids", pricing: [{ size: "Standard", lengths: [{ label: "Price", price: 250 }] }],
      },
      {
        id: "os-4", name: "Natural Hair Twist", pricing: [{ size: "Standard", lengths: [{ label: "Price", price: 80 }] }],
      },
      {
        id: "os-5", name: "Fulani Braids", pricing: [{ size: "Standard", lengths: [{ label: "Price", price: 200 }] }],
      },
      {
        id: "os-6", name: "Sew Ins", pricing: [{ size: "Standard", lengths: [{ label: "Price", price: 80 }] }],
      },
    ],
  },
  {
    name: "Kids Services", icon: "👶",
    services: [
      {
        id: "ks-1", name: "Kids Kinky & Havana Twist", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 100 }, { label: "Bra", price: 130 }, { label: "Midback", price: 150 }, { label: "Waist", price: 180 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 270 }] },
        ],
      },
      {
        id: "ks-2", name: "Kids Senegalese Twist", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 100 }, { label: "Bra", price: 130 }, { label: "Midback", price: 150 }, { label: "Waist", price: 180 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 270 }] },
        ],
      },
      {
        id: "ks-3", name: "Kids Box Braids", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }] },
        ],
      },
      {
        id: "ks-4", name: "Kids Boho Knotless", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 170 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 240 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 240 }, { label: "Waist", price: 270 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 240 }, { label: "Midback", price: 270 }, { label: "Waist", price: 300 }] },
        ],
      },
      {
        id: "ks-5", name: "Kids Knotless", pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 140 }, { label: "Bra", price: 170 }, { label: "Midback", price: 190 }, { label: "Waist", price: 210 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 170 }, { label: "Bra", price: 190 }, { label: "Midback", price: 210 }, { label: "Waist", price: 240 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 190 }, { label: "Bra", price: 210 }, { label: "Midback", price: 240 }, { label: "Waist", price: 270 }] },
        ],
      },
      {
        id: "ks-6", name: "Kids Braids", pricing: [
          { size: "Kids Cornrows", lengths: [{ label: "Starting at", price: 70 }] },
          { size: "Kids Crochets", lengths: [{ label: "Starting at", price: 100 }] },
        ],
      },
    ],
  },
];

export function loadPricingData(): CategoryPricing[] {
  if (typeof window === "undefined") return defaultPricingData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPricingData));
  return defaultPricingData;
}

export function savePricingData(data: CategoryPricing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
