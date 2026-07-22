import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight, Camera, Ruler, Tag } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio" };

/**
 * Row shape from the DB. `description`, `service_category`, and `hair_length`
 * are nullable in the schema — typing them as `string | null` fixes the v1
 * type error that assumed they were always present.
 */
type PortfolioItem = Tables<"portfolio_items">;

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/** Normalize a possibly-array search param down to a single trimmed string. */
function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: { category?: string | string[] };
}) {
  const selectedCategory = firstParam(searchParams?.category);

  // Single server-side fetch — no double-fetch, no client waterfall.
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("stylist_id", STYLIST_ID)
    .order("sort_order", { ascending: true });

  const items: PortfolioItem[] = data ?? [];

  // Build the filter list from every item's category (nulls dropped), so the
  // pills stay stable regardless of which filter is active.
  const categories = Array.from(
    new Set(
      items
        .map((item) => item.service_category)
        .filter((c): c is string => c !== null && c.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Only keep the selected filter if it actually matches a known category.
  const activeCategory =
    selectedCategory && categories.includes(selectedCategory)
      ? selectedCategory
      : null;

  const visibleItems = activeCategory
    ? items.filter((item) => item.service_category === activeCategory)
    : items;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-600">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Our work
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Portfolio
              </h1>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Real styles, real clients. Browse knotless box braids, twists,
                cornrows, and locs to find inspiration for your next
                appointment.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  asChild
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  <Link href="/book">
                    Book your style
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Filter pills */}
        {categories.length > 0 && (
          <section className="border-b border-border">
            <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
              <nav
                aria-label="Filter portfolio by style"
                className="flex flex-wrap items-center justify-center gap-2"
              >
                <FilterPill href="/portfolio" active={activeCategory === null}>
                  All
                </FilterPill>
                {categories.map((category) => (
                  <FilterPill
                    key={category}
                    href={{ pathname: "/portfolio", query: { category } }}
                    active={activeCategory === category}
                  >
                    {category}
                  </FilterPill>
                ))}
              </nav>
            </div>
          </section>
        )}

        {/* Gallery */}
        <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8">
          {error ? (
            <p className="py-16 text-center text-muted-foreground">
              We couldn&apos;t load the portfolio right now. Please try again
              soon.
            </p>
          ) : visibleItems.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">
                {activeCategory
                  ? `No ${activeCategory} styles to show yet.`
                  : "No portfolio items yet — check back soon!"}
              </p>
              {activeCategory && (
                <Link
                  href="/portfolio"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  View all styles
                </Link>
              )}
            </div>
          ) : (
            /* CSS-columns masonry: portrait shots flow without cropping. */
            <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [column-fill:_balance]">
              {visibleItems.map((item) => (
                <figure
                  key={item.id}
                  className="group mb-6 break-inside-avoid overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.title}
                      width={800}
                      height={1000}
                      loading="lazy"
                      className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    {/* Hover overlay: title surfaces on larger screens */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-luxury-black/70 via-luxury-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    >
                      <span className="p-4 text-base font-semibold text-white">
                        {item.title}
                      </span>
                    </div>
                  </div>

                  <figcaption className="space-y-2 p-4">
                    <h2 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h2>
                    {item.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {(item.service_category || item.hair_length) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.service_category && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {item.service_category}
                          </span>
                        )}
                        {item.hair_length && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Ruler className="h-3 w-3" aria-hidden="true" />
                            {item.hair_length}
                          </span>
                        )}
                      </div>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-7xl px-6 py-16 text-center lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready for your own transformation?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Pick your service, choose a time, and secure your seat with a
              deposit — all online.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                asChild
                className="bg-brand-500 hover:bg-brand-600 text-white"
              >
                <Link href="/book">
                  Book your style
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/** Filter pill rendered as a Link so it works without client JS. */
function FilterPill({
  href,
  active,
  children,
}: {
  href: ComponentProps<typeof Link>["href"];
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white transition-colors"
          : "rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
      }
    >
      {children}
    </Link>
  );
}
