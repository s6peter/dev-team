import "server-only";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type Stylist = Database["public"]["Tables"]["stylists"]["Row"];

/**
 * Stripe Connect (Express, TEST mode) helpers for stylist payouts.
 *
 * Every call is wrapped so it DEGRADES GRACEFULLY when Connect is not enabled on
 * the platform test account (or Stripe isn't configured at all): callers get a
 * clear { ok: false, error } instead of a thrown exception. We NEVER touch real
 * bank details — the stylist finishes Stripe's hosted onboarding themselves.
 */

export type ConnectResult<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Human-readable reason Connect could not be used, or null if it's available. */
function connectUnavailable(): string | null {
  if (!stripeConfigured) return "Payments are not configured.";
  return null;
}

function toError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Stripe Connect is not available. Enable Connect on the platform account and try again.";
}

/**
 * Find-or-create an Express account for a stylist and persist its id on the
 * stylists row via the service-role client (the guard trigger blocks the browser
 * from writing stripe_account_id, so this is the only sanctioned writer).
 */
export async function ensureConnectAccount(
  stylist: Pick<Stylist, "id" | "email" | "name" | "stripe_account_id">
): Promise<ConnectResult<{ accountId: string }>> {
  const unavailable = connectUnavailable();
  if (unavailable) return { ok: false, error: unavailable };

  // Already linked — reuse it (verify it still exists; if not, recreate).
  if (stylist.stripe_account_id) {
    try {
      await stripe.accounts.retrieve(stylist.stripe_account_id);
      return { ok: true, accountId: stylist.stripe_account_id };
    } catch {
      // Fall through and create a fresh account below.
    }
  }

  try {
    const account = await stripe.accounts.create({
      type: "express",
      email: stylist.email || undefined,
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: {
        name: stylist.name || undefined,
      },
      metadata: { stylist_id: stylist.id },
    });

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("stylists")
      .update({ stripe_account_id: account.id })
      .eq("id", stylist.id);
    if (error) return { ok: false, error: error.message };

    return { ok: true, accountId: account.id };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

/** Create a hosted onboarding Account Link the stylist completes themselves. */
export async function createOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<ConnectResult<{ url: string }>> {
  const unavailable = connectUnavailable();
  if (unavailable) return { ok: false, error: unavailable };

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
    return { ok: true, url: link.url };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

/**
 * Report whether the account can actually receive payouts:
 * payoutsEnabled = charges_enabled && payouts_enabled (Stripe's own flags).
 */
export async function getAccountStatus(
  accountId: string
): Promise<ConnectResult<{ payoutsEnabled: boolean }>> {
  const unavailable = connectUnavailable();
  if (unavailable) return { ok: false, error: unavailable };

  try {
    const account = await stripe.accounts.retrieve(accountId);
    const payoutsEnabled = Boolean(account.charges_enabled && account.payouts_enabled);
    return { ok: true, payoutsEnabled };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

/** Transfer commission (integer cents, USD) from the platform to the stylist. */
export async function createTransfer(
  accountId: string,
  amountCents: number,
  metadata: Record<string, string> = {}
): Promise<ConnectResult<{ transferId: string }>> {
  const unavailable = connectUnavailable();
  if (unavailable) return { ok: false, error: unavailable };

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: "Transfer amount must be a positive number of cents." };
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amountCents),
      currency: "usd",
      destination: accountId,
      metadata,
    });
    return { ok: true, transferId: transfer.id };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}
