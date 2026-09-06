import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Payout / commission math. Everything is INTEGER CENTS end to end, mirroring
 * lib/pricing.ts and the SQL. Per COMPLETED appointment:
 *   gross        = service_total_cents
 *   commission   = round(gross * commission_rate)
 *   withholding  = is_w2 ? round(commission * tax_withholding_rate) : 0
 *   net          = commission - withholding
 * A statement sums these over a [from, to] date range (inclusive).
 */

export interface EarningsLineItem {
  appointmentId: string;
  date: string; // 'YYYY-MM-DD'
  service: string;
  gross_cents: number;
  commission_cents: number;
  withholding_cents: number;
  net_cents: number;
}

export interface EarningsTotals {
  count: number;
  gross_cents: number;
  commission_cents: number;
  withholding_cents: number;
  net_cents: number;
}

export interface EarningsResult {
  rate: number; // commission_rate (e.g. 0.55)
  isW2: boolean;
  withholdingRate: number; // tax_withholding_rate (0 when not W2)
  lineItems: EarningsLineItem[];
  totals: EarningsTotals;
}

export interface AppointmentEarningInputs {
  grossCents: number;
  commissionRate: number;
  isW2: boolean;
  withholdingRate: number;
}

export interface AppointmentEarning {
  gross_cents: number;
  commission_cents: number;
  withholding_cents: number;
  net_cents: number;
}

/**
 * Pure per-appointment math. Rounding is identical to the SQL/contract:
 * commission and withholding each use Math.round on integer-cents products.
 */
export function computeAppointmentEarning(input: AppointmentEarningInputs): AppointmentEarning {
  const gross_cents = Math.round(input.grossCents);
  const commission_cents = Math.round(gross_cents * input.commissionRate);
  const withholding_cents = input.isW2
    ? Math.round(commission_cents * input.withholdingRate)
    : 0;
  const net_cents = commission_cents - withholding_cents;
  return { gross_cents, commission_cents, withholding_cents, net_cents };
}

const PAGE_SIZE = 1000;

/**
 * Compute a stylist's earnings statement over [from, to] (inclusive 'YYYY-MM-DD').
 * Reads the stylist's commission_rate / is_w2 / tax_withholding_rate and their
 * COMPLETED appointments in range (joining the service name), then applies the
 * exact per-appointment cents math and totals it. DB reads are paginated so a
 * long history never truncates. SERVER ONLY (service-role client).
 */
export async function computeEarnings(
  stylistId: string,
  from: string,
  to: string
): Promise<EarningsResult> {
  const supabase = createSupabaseAdminClient();

  const { data: stylist, error: stylistErr } = await supabase
    .from("stylists")
    .select("commission_rate, is_w2, tax_withholding_rate")
    .eq("id", stylistId)
    .maybeSingle();
  if (stylistErr) throw stylistErr;

  const rate = Number(stylist?.commission_rate ?? 0);
  const isW2 = Boolean(stylist?.is_w2);
  const withholdingRate = isW2 ? Number(stylist?.tax_withholding_rate ?? 0) : 0;

  const lineItems: EarningsLineItem[] = [];
  const totals: EarningsTotals = {
    count: 0,
    gross_cents: 0,
    commission_cents: 0,
    withholding_cents: 0,
    net_cents: 0,
  };

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, date, service_total_cents, services(name), service_variants(label)")
      .eq("stylist_id", stylistId)
      .eq("status", "completed")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];

    for (const row of rows) {
      const svc = row.services as { name: string } | { name: string }[] | null;
      const serviceName = Array.isArray(svc) ? svc[0]?.name : svc?.name;
      const variant = row.service_variants as { label: string } | { label: string }[] | null;
      const variantLabel = Array.isArray(variant) ? variant[0]?.label : variant?.label;
      const baseName = serviceName ?? "Service";
      const service = variantLabel ? `${baseName} — ${variantLabel}` : baseName;
      const earning = computeAppointmentEarning({
        grossCents: row.service_total_cents ?? 0,
        commissionRate: rate,
        isW2,
        withholdingRate,
      });
      lineItems.push({
        appointmentId: row.id,
        date: row.date,
        service,
        ...earning,
      });
      totals.count += 1;
      totals.gross_cents += earning.gross_cents;
      totals.commission_cents += earning.commission_cents;
      totals.withholding_cents += earning.withholding_cents;
      totals.net_cents += earning.net_cents;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return { rate, isW2, withholdingRate, lineItems, totals };
}
