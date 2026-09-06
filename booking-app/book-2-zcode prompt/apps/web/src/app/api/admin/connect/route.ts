import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { ensureConnectAccount, createOnboardingLink, getAccountStatus } from "@/lib/connect";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";

/**
 * GET /api/admin/connect -> { accountId, payoutsEnabled } for the caller.
 * Reports the stylist's current Stripe Connect linkage. Degrades gracefully:
 * if Connect/Stripe is unavailable we still return the stored accountId (if any)
 * with payoutsEnabled=false rather than crashing.
 */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = stylist.stripe_account_id ?? null;
  if (!accountId) {
    return NextResponse.json({ accountId: null, payoutsEnabled: false });
  }

  const status = await getAccountStatus(accountId);
  if (!status.ok) {
    // Fall back to the persisted flag; never crash if Stripe is unreachable.
    return NextResponse.json({
      accountId,
      payoutsEnabled: Boolean(stylist.payouts_enabled),
    });
  }
  return NextResponse.json({ accountId, payoutsEnabled: status.payoutsEnabled });
}

/**
 * POST /api/admin/connect -> { url }. Find-or-create the caller's Express account
 * and return a hosted onboarding Account Link. The stylist completes Stripe's
 * onboarding themselves; we never touch bank details.
 */
export async function POST() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await ensureConnectAccount({
    id: stylist.id,
    email: stylist.email,
    name: stylist.name,
    stripe_account_id: stylist.stripe_account_id,
  });
  if (!account.ok) {
    return NextResponse.json({ error: account.error }, { status: 503 });
  }

  const returnUrl = `${APP_URL}/admin`;
  const refreshUrl = `${APP_URL}/admin`;
  const link = await createOnboardingLink(account.accountId, returnUrl, refreshUrl);
  if (!link.ok) {
    return NextResponse.json({ error: link.error }, { status: 503 });
  }

  return NextResponse.json({ url: link.url });
}
