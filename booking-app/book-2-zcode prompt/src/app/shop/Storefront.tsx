"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Check, Loader2, Lock, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe-client";
import { formatCents } from "@/lib/pricing";

interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number | null;
  sort_order: number;
}

interface CartLine {
  product: Product;
  qty: number;
}

type Stage = "shopping" | "details" | "payment" | "done";

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("shopping");

  // checkout customer
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [checkoutSubtotal, setCheckoutSubtotal] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const lines = useMemo(() => Object.values(cart), [cart]);
  const itemCount = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);
  const subtotalCents = useMemo(
    () => lines.reduce((n, l) => n + l.product.price_cents * l.qty, 0),
    [lines]
  );

  // Group products by category, preserving the sort_order the API returned.
  // Uncategorized products fall into a trailing "More essentials" group.
  const categories = useMemo(() => {
    const OTHER = "More essentials";
    const order: string[] = [];
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category?.trim() || OTHER;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(p);
    }
    // Keep the catch-all group last if it exists alongside real categories.
    order.sort((a, b) => (a === OTHER ? 1 : 0) - (b === OTHER ? 1 : 0));
    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [products]);

  function maxFor(p: Product) {
    return p.stock == null ? 99 : p.stock;
  }

  function addToCart(p: Product) {
    setCart((c) => {
      const existing = c[p.id];
      const qty = Math.min((existing?.qty ?? 0) + 1, maxFor(p));
      return { ...c, [p.id]: { product: p, qty } };
    });
    setDrawerOpen(true);
  }

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const line = c[id];
      if (!line) return c;
      if (qty <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: { ...line, qty: Math.min(qty, maxFor(line.product)) } };
    });
  }

  function removeLine(id: string) {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }

  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const emailOk = /^[^@]+@[^@]+\.[^@]+$/.test(email);
  const detailsValid = name.trim().length > 0 && emailOk && phoneOk;

  async function startCheckout() {
    if (!detailsValid || lines.length === 0) return;
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          customer: { name, email, phone },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Could not start checkout.");
        setSubmitting(false);
        return;
      }
      setClientSecret(data.clientSecret);
      // The checkout contract returns clientSecret/orderId/subtotalCents; the
      // PaymentIntent id is the prefix of the client secret (see piFromSecret).
      setPaymentIntentId(null);
      setCheckoutSubtotal(data.subtotalCents ?? subtotalCents);
      setStage("payment");
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // The confirm step needs the PaymentIntent id. The checkout response returns
  // clientSecret (which embeds the PI id as the prefix before "_secret_").
  const piFromSecret = clientSecret ? clientSecret.split("_secret_")[0] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the shop…
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Order confirmed! 🎉</h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          Thank you, {name.split(" ")[0] || "friend"}! Your payment of{" "}
          <strong>{formatCents(checkoutSubtotal)}</strong> went through. We&apos;ve emailed a receipt to{" "}
          <strong>{email}</strong> and QueenG will be in touch about pickup or shipping.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/">
            <Button variant="outline">Back home</Button>
          </Link>
          <Button
            className="bg-brand-500 hover:bg-brand-600"
            onClick={() => {
              setCart({});
              setName("");
              setEmail("");
              setPhone("");
              setClientSecret(null);
              setPaymentIntentId(null);
              setStage("shopping");
            }}
          >
            Keep shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Header row */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="mt-1 text-muted-foreground">Salon-quality essentials to keep your style fresh.</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-400"
        >
          <ShoppingBag className="h-4 w-4" />
          Cart
          {itemCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/40 p-10 text-center text-muted-foreground">
          No products are available right now — check back soon.
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map((cat) => (
            <section key={cat.name}>
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-xl font-bold text-brand-700">{cat.name}</h2>
                <span className="h-px flex-1 bg-brand-100" />
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                  {cat.items.length} {cat.items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((p) => {
                  const inCart = cart[p.id]?.qty ?? 0;
                  const soldOut = p.stock != null && p.stock <= 0;
                  return (
                    <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition hover:shadow-md">
                      <div className="aspect-square w-full overflow-hidden bg-brand-50">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-brand-200">
                            <ShoppingBag className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="font-semibold">{p.name}</h3>
                        {p.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                          <span className="text-lg font-bold text-brand-600">{formatCents(p.price_cents)}</span>
                          {soldOut ? (
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Sold out</span>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-brand-500 hover:bg-brand-600"
                              disabled={inCart >= maxFor(p)}
                              onClick={() => addToCart(p)}
                            >
                              {inCart > 0 ? `Add (${inCart})` : "Add to cart"}
                            </Button>
                          )}
                        </div>
                        {p.stock != null && p.stock > 0 && p.stock <= 5 && (
                          <p className="mt-2 text-xs text-brand-600">Only {p.stock} left</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Cart drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-bold">
                {stage === "payment" ? "Checkout" : stage === "details" ? "Your details" : "Your cart"}
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Close cart">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <ShoppingBag className="mb-3 h-10 w-10 text-brand-200" />
                  <p>Your cart is empty.</p>
                  <button className="mt-3 text-sm font-medium text-brand-600 hover:underline" onClick={() => setDrawerOpen(false)}>
                    Continue shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Line items — always visible */}
                  <ul className="space-y-3">
                    {lines.map((l) => (
                      <li key={l.product.id} className="flex gap-3">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-brand-50">
                          {l.product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.product.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-brand-200">
                              <ShoppingBag className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">{l.product.name}</p>
                            {stage === "shopping" && (
                              <button onClick={() => removeLine(l.product.id)} className="text-muted-foreground hover:text-red-600" aria-label="Remove item">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{formatCents(l.product.price_cents)}</p>
                          {stage === "shopping" ? (
                            <div className="mt-1.5 inline-flex items-center rounded-lg border border-border">
                              <button onClick={() => setQty(l.product.id, l.qty - 1)} className="px-2 py-1 text-muted-foreground hover:text-foreground" aria-label="Decrease quantity">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-8 text-center text-sm font-medium">{l.qty}</span>
                              <button onClick={() => setQty(l.product.id, l.qty + 1)} disabled={l.qty >= maxFor(l.product)} className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Increase quantity">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="mt-0.5 text-sm">Qty {l.qty}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right text-sm font-semibold">
                          {formatCents(l.product.price_cents * l.qty)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Details form */}
                  {stage === "details" && (
                    <div className="mt-6 space-y-3 border-t border-border pt-5">
                      <p className="text-sm text-muted-foreground">No account needed — we&apos;ll email your receipt.</p>
                      <Field label="Full name" value={name} onChange={setName} required autoComplete="name" />
                      <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
                      <Field label="Phone" type="tel" value={phone} onChange={setPhone} required autoComplete="tel" />
                      {checkoutError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{checkoutError}</p>}
                    </div>
                  )}

                  {/* Payment */}
                  {stage === "payment" && clientSecret && (
                    <div className="mt-6 border-t border-border pt-5">
                      <Elements
                        stripe={getStripe()}
                        options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#db2777" } } }}
                      >
                        <PaymentForm
                          amountLabel={formatCents(checkoutSubtotal)}
                          onPaid={async () => {
                            const pid = paymentIntentId || piFromSecret;
                            if (pid) {
                              await fetch("/api/shop/confirm", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ paymentIntentId: pid }),
                              });
                            }
                            setStage("done");
                            setDrawerOpen(false);
                          }}
                        />
                      </Elements>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer / actions */}
            {lines.length > 0 && stage !== "payment" && (
              <div className="border-t border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold">{formatCents(subtotalCents)}</span>
                </div>
                {stage === "shopping" && (
                  <Button className="w-full bg-brand-500 hover:bg-brand-600" onClick={() => setStage("details")}>
                    Checkout
                  </Button>
                )}
                {stage === "details" && (
                  <div className="space-y-2">
                    <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={!detailsValid || submitting} onClick={startCheckout}>
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting checkout…</>
                      ) : (
                        `Continue to payment · ${formatCents(subtotalCents)}`
                      )}
                    </Button>
                    <button className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setStage("shopping")}>
                      Back to cart
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentForm({ amountLabel, onPaid }: { amountLabel: string; onPaid: () => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Please check your card details.");
      setBusy(false);
      return;
    }
    const { error: payErr } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (payErr) {
      setError(payErr.message ?? "Payment failed.");
      setBusy(false);
      return;
    }
    await onPaid();
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={!stripe || busy} onClick={pay}>
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : `Pay ${amountLabel}`}
      </Button>
      <p className="flex items-center justify-center text-xs text-muted-foreground">
        <Lock className="mr-1 h-3 w-3" />Secured by Stripe · test mode
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border p-2.5 text-sm"
      />
    </div>
  );
}
