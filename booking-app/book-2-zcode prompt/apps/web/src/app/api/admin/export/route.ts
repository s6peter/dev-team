import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Neutralize CSV formula injection: fields starting with = + - @ (or tab/CR) get a leading '.
const esc = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cents = (c: number | null | undefined) => ((c ?? 0) / 100).toFixed(2);

/** GET /api/admin/export?from=YYYY-MM-DD&to=YYYY-MM-DD — tax-ready appointments CSV. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createSupabaseAdminClient();
  const PAGE = 1000;
  const rows: string[] = [];
  // Paginate past PostgREST's max_rows cap so long exports aren't silently truncated.
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from("appointments")
      .select("date,start_time,status,service_total_cents,deposit_cents,tax_cents,balance_due_cents,fee_charged_cents,service:services(name),client:clients(name,email,phone)")
      .eq("stylist_id", stylist.id)
      .order("date")
      .order("start_time")
      .range(offset, offset + PAGE - 1);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data } = await q;
    const batch = data ?? [];
    for (const a of batch) {
      const svc = a.service as unknown as { name: string } | null;
      const c = a.client as unknown as { name: string; email: string; phone: string | null } | null;
      rows.push([a.date, a.start_time?.slice(0, 5), a.status, svc?.name ?? "", c?.name ?? "", c?.email ?? "", c?.phone ?? "",
        cents(a.service_total_cents), cents(a.deposit_cents), cents(a.tax_cents), cents(a.balance_due_cents), cents(a.fee_charged_cents)].map(esc).join(","));
    }
    if (batch.length < PAGE) break;
  }

  const header = ["Date","Time","Status","Service","Client","Email","Phone","Service Total","Deposit","Tax","Balance","Fee Charged"];
  const csv = [header.join(","), ...rows].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="queeng-appointments.csv"` } });
}
