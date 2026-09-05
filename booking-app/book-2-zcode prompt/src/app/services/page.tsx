import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import type { CatalogService, CatalogTier } from "@/types/catalog";
import { ServicesGrid } from "./ServicesGrid";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description: `Full service menu and real starting prices for ${SITE.name} in ${SITE.address.city}, ${SITE.address.state}. Pick a style and book online.`,
};

export const dynamic = "force-dynamic";
const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/** Fetch active services + their tiers, shaped into the catalog model. */
async function loadServices(): Promise<CatalogService[]> {
  const supabase = createSupabaseServerClient();
  const [{ data: serviceRows }, { data: tierRows }] = await Promise.all([
    supabase.from("services").select("*").eq("stylist_id", STYLIST_ID).eq("is_active", true).order("sort_order"),
    supabase.from("service_tiers").select("*").order("sort_order"),
  ]);

  const serviceIds = new Set((serviceRows ?? []).map((s) => s.id));
  const tiersByService = new Map<string, CatalogTier[]>();
  for (const t of tierRows ?? []) {
    if (!serviceIds.has(t.service_id)) continue;
    const tier: CatalogTier = {
      id: t.id, service_id: t.service_id, name: t.name, description: t.description,
      kind: (t.kind as CatalogTier["kind"]) ?? "size", price_addon: t.price_addon,
      duration_addon: t.duration_addon, sort_order: t.sort_order,
    };
    const existing = tiersByService.get(t.service_id);
    if (existing) existing.push(tier);
    else tiersByService.set(t.service_id, [tier]);
  }

  return (serviceRows ?? []).map<CatalogService>((s) => ({
    id: s.id, name: s.name, description: s.description, category: s.category,
    duration_minutes: s.duration_minutes, buffer_minutes: s.buffer_minutes, base_price: s.base_price,
    deposit_percent: s.deposit_percent, deposit_flat_cents: s.deposit_flat_cents, requires_deposit: s.requires_deposit,
    tax_rate: s.tax_rate, image_url: s.image_url, prep_notes: s.prep_notes, care_notes: s.care_notes,
    tiers: tiersByService.get(s.id) ?? [],
  }));
}

export default async function ServicesPage() {
  const services = await loadServices();

  return (
    <div className="flex min-h-screen flex-col bg-luxury-black">
      <Header />
      <main className="flex-1">
        {/* Intro */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand-500/10 to-transparent" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-6 pb-10 pt-20 text-center sm:pt-24 lg:px-8">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Crown className="h-8 w-8 text-brand-400" aria-hidden="true" />
              <Sparkles className="h-6 w-6 text-brand-300" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Services &amp; <span className="text-brand-400">Pricing</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/60">
              Every {SITE.shortName} style with real, upfront pricing — no guessing. Prices shown are
              starting prices; your final total depends on the size and length you choose.
            </p>
            <div className="mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-white/70">
                A deposit is required to lock in your appointment. It is applied toward your service
                total, and the remaining balance is paid in person on the day of your visit.
              </p>
            </div>
          </div>
        </section>

        {/* Menu — flat 4-up grid with category filter */}
        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          <ServicesGrid services={services} />
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to book your appointment?</h2>
            <p className="mt-3 text-white/60">Pick your style, choose a time, and secure it with a deposit in minutes.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-brand-500 text-white hover:bg-brand-600">
                <Link href="/book">Book Now<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white">
                <a href={SITE.phoneHref}><Phone className="mr-2 h-4 w-4" aria-hidden="true" />{SITE.phone}</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
