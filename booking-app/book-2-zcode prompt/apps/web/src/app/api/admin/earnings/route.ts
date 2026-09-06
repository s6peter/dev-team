import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { computeEarnings } from "@/lib/payouts";

// Neutralize CSV formula injection: fields starting with = + - @ (or tab/CR) get a leading '.
const esc = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cents = (c: number | null | undefined) => ((c ?? 0) / 100).toFixed(2);

/** First and last day (YYYY-MM-DD) of the month containing `now`. */
function currentMonthRange(now = new Date()): { from: string; to: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(y, m + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

/**
 * GET /api/admin/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns the CALLER's own earnings statement over [from, to] (inclusive).
 * Add &format=csv for a downloadable line-item statement.
 * Dates default to the current calendar month when omitted.
 */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const defaults = currentMonthRange();
  const from = searchParams.get("from") || defaults.from;
  const to = searchParams.get("to") || defaults.to;
  const format = searchParams.get("format");

  const result = await computeEarnings(stylist.id, from, to);

  if (format === "csv") {
    const header = [
      "Date",
      "Service",
      "Gross",
      "Commission",
      "Withholding",
      "Net",
    ];
    const lines = result.lineItems.map((li) =>
      [
        li.date,
        li.service,
        cents(li.gross_cents),
        cents(li.commission_cents),
        cents(li.withholding_cents),
        cents(li.net_cents),
      ]
        .map(esc)
        .join(",")
    );
    const totalsRow = [
      "TOTAL",
      `${result.totals.count} appt(s)`,
      cents(result.totals.gross_cents),
      cents(result.totals.commission_cents),
      cents(result.totals.withholding_cents),
      cents(result.totals.net_cents),
    ]
      .map(esc)
      .join(",");
    const csv = [header.join(","), ...lines, totalsRow].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="queeng-earnings-${from}_to_${to}.csv"`,
      },
    });
  }

  return NextResponse.json({ from, to, ...result });
}
