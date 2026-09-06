"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Phone, Scissors, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dollars } from "@/lib/pricing";
import { SITE } from "@/lib/site";
import type { CatalogGroup, CatalogService, CatalogVariant } from "@/types/catalog";

/** "$160" for a set price, "$60+" when the price is a starting-at estimate. */
function priceLabel(v: CatalogVariant): string {
  return `$${dollars(v.price_cents)}${v.price_from ? "+" : ""}`;
}

/** A service is "self-priced" when its only variant just repeats the service name. */
function isSinglePrice(service: CatalogService): boolean {
  const vs = service.variants ?? [];
  return vs.length === 1;
}

function VariantRows({ service }: { service: CatalogService }) {
  const variants = service.variants ?? [];
  if (variants.length === 0) {
    return (
      <p className="text-sm text-white/50">
        from <span className="font-semibold text-brand-400">${dollars(service.base_price)}</span>
      </p>
    );
  }

  if (isSinglePrice(service)) {
    const v = variants[0];
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-white/55">Starting price</span>
        <span className="text-lg font-bold text-brand-400">{priceLabel(v)}</span>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {variants.map((v) => (
        <li key={v.id} className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="text-sm leading-snug text-white/70">{v.label}</span>
          <span className="shrink-0 text-sm font-semibold text-brand-400">{priceLabel(v)}</span>
        </li>
      ))}
    </ul>
  );
}

function ServiceCard({ service }: { service: CatalogService }) {
  const hasFrom = (service.variants ?? []).some((v) => v.price_from);

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-luxury-card p-5 transition duration-200 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10">
      <h3 className="text-lg font-bold leading-snug text-white">{service.name}</h3>
      {service.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-white/55">{service.description}</p>
      )}

      <div className="mt-4 border-t border-white/5 pt-4">
        <VariantRows service={service} />
      </div>

      {hasFrom && (
        <p className="mt-3 text-xs italic text-white/40">
          Final price confirmed at your appointment.
        </p>
      )}

      <div className="mt-5">
        <Button
          asChild
          size="sm"
          className="w-full bg-brand-500 text-white hover:bg-brand-600 sm:w-auto"
        >
          <Link href="/book">
            Book
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function GroupSection({ group }: { group: CatalogGroup }) {
  const isCustom = group.kind === "custom";

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{group.name}</h2>
        {group.description && (
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            {group.description}
          </p>
        )}
      </div>

      {isCustom && (
        <div className="mx-auto mb-6 flex max-w-2xl items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-white/70">
            Custom styles are quoted personally. Book with your $50 deposit and upload an inspiration
            photo, then call us at{" "}
            <a href={SITE.phoneHref} className="font-semibold text-brand-300 hover:text-brand-200">
              {SITE.phone}
            </a>{" "}
            to confirm the details and final price.
          </p>
        </div>
      )}

      {group.services.length === 0 ? (
        <p className="py-8 text-center text-white/50">Styles in this category are coming soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {group.services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ServicesGrid({ groups }: { groups: CatalogGroup[] }) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");

  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-luxury-card p-10 text-center">
        <Scissors className="mx-auto mb-4 h-10 w-10 text-brand-500/60" aria-hidden="true" />
        <p className="text-white/70">Our service menu is being updated. Please check back soon.</p>
      </div>
    );
  }

  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  return (
    <div>
      {/* Group tabs — the 4 booking tiles */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {groups.map((g) => {
          const selected = g.id === active.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveId(g.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                selected
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                  : "border border-white/10 bg-white/5 text-white/70 hover:border-brand-400/40 hover:text-white"
              }`}
            >
              {g.kind === "custom" && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              {g.name}
            </button>
          );
        })}
      </div>

      <GroupSection group={active} />
    </div>
  );
}
