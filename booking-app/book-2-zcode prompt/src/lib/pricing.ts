/**
 * Single source of truth for money. Everything is INTEGER CENTS end to end
 * (DB columns, Stripe amounts, and these helpers). Mirrors the SQL in hold_slot().
 */

export interface PricingInputs {
  basePriceCents: number;
  tierPriceAddonCents?: number;
  taxRate: number; // e.g. 0.0825
  depositPercent: number; // e.g. 50
  requiresDeposit?: boolean;
  depositFlatCents?: number | null;
}

export interface PricingResult {
  serviceTotalCents: number; // base + tier add-on
  depositCents: number; // the deposit itself (flat, non-refundable)
  taxCents: number; // tax charged on the DEPOSIT only
  chargedNowCents: number; // deposit + tax — the Stripe amount
  balanceDueCents: number; // serviceTotal − deposit, paid in person, no tax
  grandTotalCents: number; // serviceTotal + tax
}

/**
 * Tax is charged on the DEPOSIT only (per salon policy), not the whole service.
 * Deposits are flat + non-refundable by default. Mirrors the SQL in hold_slot().
 */
export function computePricing(input: PricingInputs): PricingResult {
  const serviceTotalCents =
    Math.round(input.basePriceCents) + Math.round(input.tierPriceAddonCents ?? 0);

  let depositCents = 0;
  if (input.requiresDeposit !== false) {
    depositCents =
      input.depositFlatCents != null
        ? Math.round(input.depositFlatCents)
        : Math.round(serviceTotalCents * (input.depositPercent / 100));
  }
  const taxCents = Math.round(depositCents * input.taxRate);
  const chargedNowCents = depositCents + taxCents;
  const balanceDueCents = serviceTotalCents - depositCents;
  const grandTotalCents = serviceTotalCents + taxCents;

  return { serviceTotalCents, depositCents, taxCents, chargedNowCents, balanceDueCents, grandTotalCents };
}

/** Cents -> "$1,234.56" */
export function formatCents(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/** Cents -> "160" or "160–400" for a range (dollars, no cents when whole). */
export function dollars(cents: number): string {
  const v = cents / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
