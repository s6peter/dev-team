"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Clock, Scissors, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computePricing, formatCents } from "@/lib/pricing";
import { formatDuration } from "@/lib/utils";
import { SITE } from "@/lib/site";
import type { CatalogService, CatalogTier } from "@/types/catalog";

const TIER_KINDS: { kind: CatalogTier["kind"]; label: string }[] = [
  { kind: "size", label: "Size options" },
  { kind: "length", label: "Length options" },
  { kind: "addon", label: "Add-ons" },
];

function TierGroups({ tiers }: { tiers: CatalogTier[] }) {
  const groups = TIER_KINDS.map((k) => ({ ...k, items: tiers.filter((t) => t.kind === k.kind) })).filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.kind}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-300">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map((tier) => (
              <li key={tier.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-white/75">
                  {tier.name}
                  {tier.duration_addon > 0 && <span className="ml-1.5 text-xs text-white/40">+{formatDuration(tier.duration_addon)}</span>}
                </span>
                <span className="shrink-0 font-medium text-white/90">{tier.price_addon > 0 ? `+${formatCents(tier.price_addon)}` : "Included"}</span>
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
  const maxAddon = (kind: CatalogTier["kind"]) => service.tiers.filter((t) => t.kind === kind).reduce((m, t) => Math.max(m, t.price_addon), 0);
  const upToCents = service.base_price + maxAddon("size") + maxAddon("length");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-luxury-card transition duration-200 hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-luxury-dark">
        {service.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.image_url} alt={`${service.name} — ${service.category}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-luxury-dark to-luxury-black">
            <Scissors className="h-10 w-10 text-brand-500/60" aria-hidden="true" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDuration(service.duration_minutes)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-brand-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">{service.category}</span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold leading-snug text-white">{service.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">from</span>
          <span className="text-xl font-bold text-brand-400">{formatCents(pricing.serviceTotalCents)}</span>
          {upToCents > service.base_price && <span className="text-xs text-white/40">– {formatCents(upToCents)}</span>}
        </div>
        {service.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">{service.description}</p>}

        {service.tiers.length > 0 && (
          <details className="group/d mt-3 rounded-xl border border-white/5 bg-black/20 open:bg-black/30">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-brand-300">
              Size, length &amp; add-ons
              <ChevronDown className="h-4 w-4 transition-transform group-open/d:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-white/5 px-3 py-3"><TierGroups tiers={service.tiers} /></div>
          </details>
        )}

        <div className="mt-auto pt-4">
          {service.requires_deposit && pricing.depositCents > 0 && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-white/45">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-300" aria-hidden="true" />
              {formatCents(pricing.depositCents)} deposit · balance in person
            </p>
          )}
          <Button asChild className="w-full bg-brand-500 text-white hover:bg-brand-600">
            <Link href="/book">Book this style<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ServicesGrid({ services }: { services: CatalogService[] }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.category)))], [services]);
  const [active, setActive] = useState("All");
  const shown = active === "All" ? services : services.filter((s) => s.category === active);

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-luxury-card p-10 text-center">
        <Scissors className="mx-auto mb-4 h-10 w-10 text-brand-500/60" aria-hidden="true" />
        <p className="text-white/70">Our service menu is being updated. Please check back soon.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active === c ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "border border-white/10 bg-white/5 text-white/70 hover:border-brand-400/40 hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
