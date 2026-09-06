import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import type { CatalogGroup } from "@/types/catalog";
import { ServicesGrid } from "./ServicesGrid";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description: `Full service menu and real starting prices for ${SITE.name} in ${SITE.address.city}, ${SITE.address.state}. Pick a style and book online.`,
};

export const dynamic = "force-dynamic";
const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/** Fetch the owner's grouped catalog (4 tiles → services → priced variants). */
async function loadCatalog(): Promise<{ groups: CatalogGroup[]; depositCents: number }> {
  try {
    const res = await fetch(`${SITE.url}/api/catalog?stylistId=${STYLIST_ID}`, {
      cache: "no-store",
    });
    if (!res.ok) return { groups: [], depositCents: 5000 };
    const data = await res.json();
    return { groups: (data.groups ?? []) as CatalogGroup[], depositCents: data.policy?.deposit_cents ?? 5000 };
  } catch {
    return { groups: [], depositCents: 5000 };
  }
}

export default async function ServicesPage() {
  const { groups, depositCents } = await loadCatalog();

  return (
    <div className="flex min-h-screen flex-col bg-luxury-black">
      <Header />
      <main className="flex-1">
        {/* Intro */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand-500/10 to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-3xl px-6 pb-10 pt-20 text-center sm:pt-24 lg:px-8">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Crown className="h-8 w-8 text-brand-400" aria-hidden="true" />
              <Sparkles className="h-6 w-6 text-brand-300" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Services &amp; <span className="text-brand-400">Pricing</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/60">
              Every {SITE.shortName} style with real, upfront pricing — no guessing. Prices marked
              with a <span className="font-semibold text-brand-300">+</span> are starting prices;
              your final total is confirmed at your appointment.
            </p>
            <div className="mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-white/70">
                A ${Math.round(depositCents / 100)} deposit locks in your appointment. It is applied toward your
                service total, and the remaining balance is paid in person on the day of your visit.
              </p>
            </div>
          </div>
        </section>

        {/* Menu — grouped by the 4 booking tiles */}
        <section className="mx-auto max-w-5xl px-6 pb-20 lg:px-8">
          <ServicesGrid groups={groups} />
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to book your appointment?</h2>
            <p className="mt-3 text-white/60">
              Pick your style, choose a time, and secure it with a deposit in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-brand-500 text-white hover:bg-brand-600">
                <Link href="/book">
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white"
              >
                <a href={SITE.phoneHref}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                  {SITE.phone}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
