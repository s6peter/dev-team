"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Check, ChevronLeft, Clock, Loader2, MapPin, Upload, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe-client";
import { computePricing, formatCents } from "@/lib/pricing";
import { addDays, formatDateLabel, formatTimeLabel, nowInSalonTz } from "@/lib/time";
import { formatDuration } from "@/lib/utils";
import type { Catalog, CatalogService, CatalogTier } from "@/types/catalog";

type Step = 0 | 1 | 2 | 3 | 4;
const STEPS = ["Service", "Date & Time", "Your details", "Deposit", "Done"];

interface IntakeAnswers {
  hairPrepped: string;
  scalpNotes: string;
  photoConsent: string;
}

export default function BookPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(0);

  // selection
  const [category, setCategory] = useState<string | null>(null);
  const [service, setService] = useState<CatalogService | null>(null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [lengthId, setLengthId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);

  // datetime
  const [monthOffset, setMonthOffset] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotReason, setSlotReason] = useState<string | undefined>();
  const [startTime, setStartTime] = useState<string | null>(null);

  // details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [intake, setIntake] = useState<IntakeAnswers>({ hairPrepped: "", scalpNotes: "", photoConsent: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // waitlist
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  // payment
  const [policyConsented, setPolicyConsented] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        setCatalog(d);
        setOpenDays(d.openDays ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    if (!catalog) return [];
    return Array.from(new Set(catalog.services.map((s) => s.category)));
  }, [catalog]);

  const sizeTiers = service?.tiers.filter((t) => t.kind === "size") ?? [];
  const lengthTiers = service?.tiers.filter((t) => t.kind === "length") ?? [];
  const addonTiers = service?.tiers.filter((t) => t.kind === "addon") ?? [];

  const selectedTiers: CatalogTier[] = useMemo(() => {
    if (!service) return [];
    const ids = new Set([sizeId, lengthId, ...addonIds].filter(Boolean) as string[]);
    return service.tiers.filter((t) => ids.has(t.id));
  }, [service, sizeId, lengthId, addonIds]);

  const tierAddonCents = selectedTiers.reduce((n, t) => n + t.price_addon, 0);
  const workMinutes = (service?.duration_minutes ?? 0) + selectedTiers.reduce((n, t) => n + t.duration_addon, 0);

  const pricing = useMemo(() => {
    if (!service) return null;
    return computePricing({
      basePriceCents: service.base_price,
      tierPriceAddonCents: tierAddonCents,
      taxRate: service.tax_rate,
      depositPercent: service.deposit_percent,
      requiresDeposit: service.requires_deposit,
      depositFlatCents: service.deposit_flat_cents,
    });
  }, [service, tierAddonCents]);

  const canContinueService = Boolean(service && (sizeTiers.length === 0 || sizeId));

  // fetch slots when date/duration changes
  useEffect(() => {
    if (!date || !service) return;
    setSlotsLoading(true);
    setStartTime(null);
    const params = new URLSearchParams({ date, serviceId: service.id, minutes: String(workMinutes) });
    if (sizeId) params.set("tierId", sizeId);
    fetch(`/api/availability?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        setSlotReason(d.reason);
      })
      .finally(() => setSlotsLoading(false));
  }, [date, service, workMinutes, sizeId]);

  async function joinWaitlist() {
    if (!service || !date) return;
    const emailToUse = clientEmail || waitlistEmail;
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        tierId: sizeId,
        clientName: clientName || "Waitlist guest",
        clientEmail: emailToUse,
        clientPhone,
        desiredDate: date,
        flexibility: "plus_minus_3",
      }),
    });
    if (res.ok) setWaitlistJoined(true);
  }

  function selectService(s: CatalogService) {
    setService(s);
    setSizeId(null);
    setLengthId(null);
    setAddonIds([]);
    setDate(null);
    setStartTime(null);
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setPhotos((p) => [...p, data.url]);
    }
    setUploading(false);
  }

  async function startCheckout() {
    if (!service || !date || !startTime) return;
    setSubmitting(true);
    setHoldError(null);
    const intakeArr = [
      { question: "Will you arrive with hair washed, blow-dried and detangled?", answer: intake.hairPrepped },
      { question: "Scalp sensitivity, allergies, or prior damage to note?", answer: intake.scalpNotes },
      { question: "Consent to use finished photos on social/portfolio?", answer: intake.photoConsent },
    ].filter((q) => q.answer);

    const res = await fetch("/api/bookings/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        tierId: sizeId,
        addonIds,
        date,
        startTime,
        clientName,
        clientEmail,
        clientPhone,
        notes,
        intake: intakeArr,
        inspirationPhotos: photos,
        policyConsented,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setHoldError(data.error || "Something went wrong.");
      if (res.status === 409) {
        setStep(1);
        setStartTime(null);
      }
      return;
    }
    if (data.requiresPayment === false) {
      setStep(4);
      return;
    }
    setClientSecret(data.clientSecret);
    setPaymentIntentId(data.paymentIntentId);
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading services…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <ol className="mb-8 flex items-center gap-2" aria-label="Booking progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i < step ? "bg-brand-500 text-white" : i === step ? "bg-brand-500 text-white ring-4 ring-brand-100" : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-center text-xs sm:block ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </li>
          ))}
        </ol>

        {step > 0 && step < 4 && (
          <button onClick={() => setStep((s) => (s - 1) as Step)} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </button>
        )}

        {step === 0 && (
          <div>
            <h1 className="mb-1 text-2xl font-bold">Choose your style</h1>
            <p className="mb-6 text-muted-foreground">Prices and times shown up front — no surprises.</p>

            <div className="mb-6 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c === category ? null : c)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${category === c ? "border-brand-500 bg-brand-500 text-white" : "border-border hover:border-brand-300"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {catalog!.services
                .filter((s) => !category || s.category === category)
                .map((s) => {
                  const p = computePricing({ basePriceCents: s.base_price, taxRate: s.tax_rate, depositPercent: s.deposit_percent, requiresDeposit: s.requires_deposit, depositFlatCents: s.deposit_flat_cents });
                  const selected = service?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectService(s)}
                      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${selected ? "border-brand-500 ring-2 ring-brand-100" : "border-border hover:border-brand-300"}`}
                    >
                      {s.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image_url} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">{s.name}</span>
                          <span className="whitespace-nowrap font-semibold text-brand-600">from {formatCents(p.serviceTotalCents)}</span>
                        </div>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{s.description}</p>
                        <span className="mt-1 inline-flex items-center text-xs text-muted-foreground"><Clock className="mr-1 h-3 w-3" />{formatDuration(s.duration_minutes)}</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            {service && (
              <div className="mt-6 space-y-5 rounded-xl border border-border bg-muted/30 p-4">
                {sizeTiers.length > 0 && (
                  <TierGroup label="Size" required tiers={sizeTiers} value={sizeId} onChange={(v) => setSizeId(v as string | null)} single />
                )}
                {lengthTiers.length > 0 && (
                  <TierGroup label="Length" tiers={lengthTiers} value={lengthId} onChange={(v) => setLengthId(v as string | null)} single />
                )}
                {addonTiers.length > 0 && (
                  <TierGroup label="Add-ons" tiers={addonTiers} value={addonIds} onChange={(v) => setAddonIds(v as string[])} />
                )}
                {pricing && (
                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">Estimated total · {formatDuration(workMinutes)}</span>
                    <span className="text-lg font-bold">{formatCents(pricing.serviceTotalCents)}</span>
                  </div>
                )}
              </div>
            )}

            <Button className="mt-6 w-full bg-brand-500 hover:bg-brand-600" disabled={!canContinueService} onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        )}

        {step === 1 && service && (
          <div>
            <h1 className="mb-1 text-2xl font-bold">Pick a date & time</h1>
            <p className="mb-6 text-muted-foreground">{service.name} · {formatDuration(workMinutes)}</p>
            <Calendar monthOffset={monthOffset} setMonthOffset={setMonthOffset} openDays={openDays} selected={date} onSelect={setDate} />
            {date && (
              <div className="mt-6">
                <h2 className="mb-3 font-semibold">{formatDateLabel(date)}</h2>
                {slotsLoading ? (
                  <div className="flex items-center py-6 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finding open times…</div>
                ) : slots.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((t) => (
                      <button key={t} onClick={() => setStartTime(t)} className={`rounded-lg border py-2 text-sm font-medium ${startTime === t ? "border-brand-500 bg-brand-500 text-white" : "border-border hover:border-brand-300"}`}>
                        {formatTimeLabel(t)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="text-muted-foreground">{slotReason || "No open times"} for this day — try another date, or join the waitlist and we&apos;ll text you if a spot opens near this date.</p>
                    {waitlistJoined ? (
                      <p className="mt-3 font-medium text-green-700">You&apos;re on the waitlist! 🎉 We&apos;ll reach out if a slot frees up.</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!clientEmail && (
                          <input type="email" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} placeholder="you@email.com" className="rounded-lg border border-border p-2 text-sm" />
                        )}
                        <Button size="sm" variant="outline" disabled={!/^[^@]+@[^@]+\.[^@]+$/.test(clientEmail || waitlistEmail)} onClick={joinWaitlist}>
                          Join the waitlist
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Button className="mt-6 w-full bg-brand-500 hover:bg-brand-600" disabled={!startTime} onClick={() => setStep(2)}>Continue</Button>
          </div>
        )}

        {step === 2 && service && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Your details</h1>
            <p className="text-muted-foreground">No account needed — we&apos;ll email you a confirmation.</p>
            <Field label="Full name" value={clientName} onChange={setClientName} required autoComplete="name" />
            <Field label="Email" type="email" value={clientEmail} onChange={setClientEmail} required autoComplete="email" />
            <Field label="Phone (for reminders)" type="tel" value={clientPhone} onChange={setClientPhone} autoComplete="tel" />

            <div>
              <label className="mb-1 block text-sm font-medium">Anything I should know? (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-border p-2.5 text-sm" placeholder="Style ideas, parting preferences, etc." />
            </div>

            <SelectField label="Will you arrive with hair washed, blow-dried & detangled?" value={intake.hairPrepped} onChange={(v) => setIntake({ ...intake, hairPrepped: v })} options={["Yes", "I'd like a wash/blow-dry add-on", "Not sure"]} />
            <Field label="Scalp sensitivity, allergies, or prior damage? (optional)" value={intake.scalpNotes} onChange={(v) => setIntake({ ...intake, scalpNotes: v })} />
            <SelectField label="Can I share finished photos on my portfolio?" value={intake.photoConsent} onChange={(v) => setIntake({ ...intake, photoConsent: v })} options={["Yes", "No"]} />

            <div>
              <label className="mb-1 block text-sm font-medium">Inspiration photos (optional)</label>
              <div className="flex flex-wrap gap-2">
                {photos.map((url) => (
                  <div key={url} className="relative h-20 w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="inspiration" className="h-20 w-20 rounded-lg object-cover" />
                    <button onClick={() => setPhotos((p) => p.filter((u) => u !== url))} className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-brand-300">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
                  </label>
                )}
              </div>
            </div>

            <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={!clientName || !/^[^@]+@[^@]+\.[^@]+$/.test(clientEmail)} onClick={() => setStep(3)}>Continue to deposit</Button>
          </div>
        )}

        {step === 3 && service && pricing && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold">Review & secure your spot</h1>
            <div className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{service.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedTiers.map((t) => t.name).join(" · ") || "Standard"}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{date && formatDateLabel(date)} · {startTime && formatTimeLabel(startTime)} · {formatDuration(workMinutes)}</div>
                </div>
              </div>
              <dl className="space-y-1 border-t border-border pt-3 text-sm">
                <Row k="Service total" v={formatCents(pricing.serviceTotalCents)} />
                <Row k="Deposit (non-refundable)" v={formatCents(pricing.depositCents)} />
                <Row k="Tax (on deposit)" v={formatCents(pricing.taxCents)} />
                <Row k="Due now" v={formatCents(pricing.chargedNowCents)} bold />
                <Row k="Balance due in person (no tax)" v={formatCents(pricing.balanceDueCents)} muted />
              </dl>
            </div>

            {catalog?.policy?.policy_text && (
              <label className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                <input type="checkbox" checked={policyConsented} onChange={(e) => setPolicyConsented(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span className="text-muted-foreground">I agree to the cancellation policy: {catalog.policy.policy_text}</span>
              </label>
            )}

            {holdError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{holdError}</p>}

            {!clientSecret ? (
              <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={!policyConsented || submitting} onClick={startCheckout}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reserving your slot…</> : `Pay deposit ${formatCents(pricing.chargedNowCents)}`}
              </Button>
            ) : (
              <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#db2777" } } }}>
                <PaymentForm
                  depositLabel={formatCents(pricing.chargedNowCents)}
                  onPaid={async () => {
                    await fetch("/api/bookings/confirm", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ paymentIntentId }),
                    });
                    setStep(4);
                  }}
                />
              </Elements>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"><Check className="h-8 w-8" /></div>
            <h1 className="mb-2 text-2xl font-bold">Booking request received! 🎉</h1>
            <p className="mx-auto max-w-md text-muted-foreground">
              Your deposit is in and your spot is held. Your appointment is <strong>pending approval</strong> — QueenG will confirm shortly, and you&apos;ll get an email {clientPhone && "and text "}confirmation.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/account"><Button className="bg-brand-500 hover:bg-brand-600">View my appointment</Button></Link>
              <Link href="/"><Button variant="outline">Back home</Button></Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ---------- helpers ---------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function PaymentForm({ depositLabel, onPaid }: { depositLabel: string; onPaid: () => Promise<void> }) {
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
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : `Pay deposit ${depositLabel}`}
      </Button>
      <p className="flex items-center justify-center text-xs text-muted-foreground"><MapPin className="mr-1 h-3 w-3" />Secured by Stripe · test mode</p>
    </div>
  );
}

function TierGroup({
  label,
  tiers,
  value,
  onChange,
  single,
  required,
}: {
  label: string;
  tiers: CatalogTier[];
  value: string | string[] | null;
  onChange: (v: string | string[] | null) => void;
  single?: boolean;
  required?: boolean;
}) {
  const selected = (id: string) => (single ? value === id : (value as string[])?.includes(id));
  function toggle(id: string) {
    if (single) onChange(value === id ? null : id);
    else {
      const arr = (value as string[]) ?? [];
      onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    }
  }
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}{required && <span className="text-brand-500"> *</span>}</div>
      <div className="flex flex-wrap gap-2">
        {tiers.map((t) => (
          <button key={t.id} onClick={() => toggle(t.id)} className={`rounded-lg border px-3 py-1.5 text-sm ${selected(t.id) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border hover:border-brand-300"}`}>
            {t.name}{t.price_addon > 0 && <span className="text-muted-foreground"> +{formatCents(t.price_addon)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Calendar({ monthOffset, setMonthOffset, openDays, selected, onSelect }: {
  monthOffset: number; setMonthOffset: (n: number) => void; openDays: number[]; selected: string | null; onSelect: (d: string) => void;
}) {
  const now = nowInSalonTz();
  const [y, m] = now.dateStr.split("-").map(Number);
  const view = new Date(Date.UTC(y, m - 1 + monthOffset, 1));
  const monthName = view.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const firstDow = view.getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 0)).getUTCDate();
  const lastBookable = addDays(now.dateStr, 60);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${view.getUTCFullYear()}-${String(view.getUTCMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button disabled={monthOffset === 0} onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))} className="rounded p-1 disabled:opacity-30" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
        <span className="font-semibold">{monthName}</span>
        <button onClick={() => setMonthOffset(monthOffset + 1)} className="rounded p-1" aria-label="Next month"><ChevronLeft className="h-5 w-5 rotate-180" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const dow = new Date(cell + "T12:00:00Z").getUTCDay();
          const disabled = cell < now.dateStr || cell > lastBookable || !openDays.includes(dow);
          const day = Number(cell.split("-")[2]);
          return (
            <button key={i} disabled={disabled} onClick={() => onSelect(cell)}
              className={`aspect-square rounded-lg text-sm ${selected === cell ? "bg-brand-500 text-white" : disabled ? "cursor-not-allowed text-muted-foreground/30" : "hover:bg-brand-50"}`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, autoComplete }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; autoComplete?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}{required && <span className="text-brand-500"> *</span>}</label>
      <input type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border p-2.5 text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-white p-2.5 text-sm">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
