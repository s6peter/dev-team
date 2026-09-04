import Stripe from "stripe";

// Empty-string fallback keeps module import from throwing during build when the
// env var is absent; real routes require a valid test/live key at runtime.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

/** Find-or-create a Stripe customer by email (so cards can be saved for later). */
export async function ensureStripeCustomer(email: string, name?: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const created = await stripe.customers.create({ email, name });
  return created.id;
}
