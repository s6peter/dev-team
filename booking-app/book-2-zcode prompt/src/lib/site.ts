/** Canonical business facts — single source of truth (fixes v1's NAP inconsistency). */
export const SITE = {
  name: "QueenG Braids & Essentials",
  shortName: "QueenG Braids",
  tagline: "Protective styling, done right.",
  description:
    "Denton, TX braiding studio specializing in knotless box braids, twists, cornrows, and locs. See real prices, pick your time, and book online with a deposit.",
  phone: "(901) 631-1481",
  phoneHref: "tel:+19016311481",
  email: "queengbraids@gmail.com",
  instagram: "queengbraids",
  instagramUrl: "https://instagram.com/queengbraids",
  address: {
    street: "4909 Beaver Creek Ave",
    city: "Denton",
    state: "TX",
    zip: "76207",
  },
  geo: { lat: 33.2148, lng: -97.1331 }, // Denton, TX
  hours: [
    { day: "Sunday", open: "1:00 PM", close: "8:00 PM" },
    { day: "Monday", open: "4:00 PM", close: "8:00 PM" },
    { day: "Tuesday", open: "4:00 PM", close: "8:00 PM" },
    { day: "Wednesday", open: "4:00 PM", close: "8:00 PM" },
    { day: "Thursday", open: "4:00 PM", close: "8:00 PM" },
    { day: "Friday", open: "9:00 AM", close: "8:00 PM" },
    { day: "Saturday", open: "7:00 AM", close: "8:00 PM" },
  ],
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456",
} as const;

export function fullAddress(): string {
  const a = SITE.address;
  return `${a.street}, ${a.city}, ${a.state} ${a.zip}`;
}

/** Google Maps embed + directions for the real address. */
export function mapEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(fullAddress())}&output=embed`;
}
export function mapDirectionsUrl(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress())}`;
}

/** LocalBusiness / HairSalon JSON-LD for SEO. */
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: SITE.name,
    description: SITE.description,
    telephone: SITE.phone,
    email: SITE.email,
    url: SITE.url,
    image: `${SITE.url}/og.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.state,
      postalCode: SITE.address.zip,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    sameAs: [SITE.instagramUrl],
    priceRange: "$$",
  };
}
