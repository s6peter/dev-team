import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Crown,
  HeartHandshake,
  Info,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computePricing, formatCents } from "@/lib/pricing";
import { formatDuration } from "@/lib/utils";
import { SITE } from "@/lib/site";
import type { CatalogService, CatalogTier } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description: `Full service menu and real starting prices for ${SITE.name} in ${SITE.address.city}, ${SITE.address.state}. Pick a style and book online.`,
};

// Reads request cookies (createSupabaseServerClient), so render per-request.
export const dynamic = "force-dynamic";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/** "Box Braids" -> "box-braids" so Footer anchors like /services#box-braids resolve. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CategoryGroup {
  name: string;
  services: CatalogService[];
}

/** Fetch active services + their tiers directly, then shape into the catalog model. */
async function loadServices(): Promise<CatalogService[]> {
  const supabase = createSupabaseServerClient();

  const [{ data: serviceRows }, { data: tierRows }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("stylist_id", STYLIST_ID)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("service_tiers").select("*").order("sort_order"),
  ]);

  const serviceIds = new Set((serviceRows ?? []).map((s) => s.id));
  const tiersByService = new Map<string, CatalogTier[]>();
  for (const t of tierRows ?? []) {
    if (!serviceIds.has(t.service_id)) continue;
    const tier: CatalogTier = {
      id: t.id,
      service_id: t.service_id,
      name: t.name,
      description: t.description,
      kind: (t.kind as CatalogTier["kind"]) ?? "size",
      price_addon: t.price_addon,
      duration_addon: t.duration_addon,
      sort_order: t.sort_order,
    };
    const existing = tiersByService.get(t.service_id);
    if (existing) existing.push(tier);
    else tiersByService.set(t.service_id, [tier]);
  }

  return (serviceRows ?? []).map<CatalogService>((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    duration_minutes: s.duration_minutes,
    buffer_minutes: s.buffer_minutes,
    base_price: s.base_price,
    deposit_percent: s.deposit_percent,
    deposit_flat_cents: s.deposit_flat_cents,
    requires_deposit: s.requires_deposit,
    tax_rate: s.tax_rate,
    image_url: s.image_url,
    prep_notes: s.prep_notes,
    care_notes: s.care_notes,
    tiers: tiersByService.get(s.id) ?? [],
  }));
}

/** Preserve DB order: categories in first-seen order, services already sorted by sort_order. */
function groupByCategory(services: CatalogService[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const index = new Map<string, CategoryGroup>();
  for (const service of services) {
    let group = index.get(service.category);
    if (!group) {
      group = { name: service.category, services: [] };
      index.set(service.category, group);
      groups.push(group);
    }
    group.services.push(service);
  }
  return groups;
}

const TIER_KINDS: { kind: CatalogTier["kind"]; label: string }[] = [
  { kind: "size", label: "Size options" },
  { kind: "length", label: "Length options" },
  { kind: "addon", label: "Add-ons" },
];

function TierGroups({ tiers }: { tiers: CatalogTier[] }) {
  const groups = TIER_KINDS.map((k) => ({
    ...k,
    items: tiers.filter((t) => t.kind === k.kind),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.kind}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-300">
            {group.label}
          </p>
          <ul className="space-y-1.5">
            {group.items.map((tier) => (
              <li
                key={tier.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-white/80">
                  {tier.name}
                  {tier.duration_addon > 0 && (
                    <span className="ml-2 text-xs text-white/40">
                      +{formatDuration(tier.duration_addon)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium text-white/90">
                  {tier.price_addon > 0 ? `+${formatCents(tier.price_addon)}` : "Included"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ServiceCard({ service }: { service: CatalogService }) {
  const pricing = computePricing({
    basePriceCents: service.base_price,
    taxRate: service.tax_rate,
    depositPercent: service.deposit_percent,
    requiresDeposit: service.requires_deposit,
    depositFlatCents: service.deposit_flat_cents,
  });

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-luxury-card shadow-sm transition-colors hover:border-brand-500/40">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-luxury-dark">
        {service.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote catalog URLs; avoids next/image domain config.
          <img
            src={service.image_url}
            alt={`${service.name} — ${service.category} at ${SITE.shortName}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-luxury-dark to-luxury-black">
            <Scissors className="h-10 w-10 text-brand-500/60" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{service.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/50">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatDuration(service.duration_minutes)}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-xs uppercase tracking-wide text-white/40">
              from
            </span>
            <span className="text-xl font-bold text-brand-400">
              {formatCents(pricing.serviceTotalCents)}
            </span>
          </div>
        </div>

        {service.description && (
          <p className="text-sm leading-relaxed text-white/60">
            {service.description}
          </p>
        )}

        <TierGroups tiers={service.tiers} />

        {(service.prep_notes || service.care_notes) && (
          <div className="space-y-2 rounded-xl border border-white/5 bg-black/20 p-3">
            {service.prep_notes && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-white/60">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-300"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-semibold text-white/80">Before you come in: </span>
                  {service.prep_notes}
                </span>
              </p>
            )}
            {service.care_notes && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-white/60">
                <HeartHandshake
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-300"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-semibold text-white/80">Aftercare: </span>
                  {service.care_notes}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="mt-auto space-y-3 pt-2">
          {service.requires_deposit && pricing.depositCents > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-white/50">
              <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
              {formatCents(pricing.depositCents)} deposit to book · balance{" "}
              {formatCents(pricing.balanceDueCents)} in person
            </p>
          )}
          <Button
            asChild
            className="w-full bg-brand-500 text-white hover:bg-brand-600"
          >
            <Link href="/book">
              Book this style
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default async function ServicesPage() {
  const services = await loadServices();
  const categories = groupByCategory(services);

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
              Every {SITE.shortName} style with real, upfront pricing — no
              guessing. Prices shown are starting prices; your final total
              depends on the size and length you choose.
            </p>
            <div className="mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 text-left">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-brand-400"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-white/70">
                A deposit is required to lock in your appointment. It is applied
                toward your service total, and the remaining balance is paid in
                person on the day of your visit.
              </p>
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          {categories.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-luxury-card p-10 text-center">
              <Scissors
                className="mx-auto mb-4 h-10 w-10 text-brand-500/60"
                aria-hidden="true"
              />
              <p className="text-white/70">
                Our service menu is being updated. Please check back soon or
                reach out and we&apos;ll help you book.
              </p>
              <a
                href={SITE.phoneHref}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:text-brand-300"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {SITE.phone}
              </a>
            </div>
          ) : (
            <div className="space-y-16">
              {categories.map((category) => (
                <div
                  key={category.name}
                  id={slugify(category.name)}
                  className="scroll-mt-24"
                >
                  <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">
                      {category.name}
                    </h2>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/50">
                      {category.services.length}{" "}
                      {category.services.length === 1 ? "style" : "styles"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {category.services.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to book your appointment?
            </h2>
            <p className="mt-3 text-white/60">
              Pick your style, choose a time, and secure it with a deposit in
              minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-brand-500 text-white hover:bg-brand-600"
              >
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
