import Stripe from "stripe";

// Empty-string fallback keeps module import from throwing during build when the
// env var is absent; real routes require a valid test/live key at runtime.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
