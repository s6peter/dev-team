import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import { Gallery, type GalleryCategory } from "./Gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio" };

type PortfolioItem = Tables<"portfolio_items">;

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;
const UNCATEGORIZED = "Other Styles";

export default async function PortfolioPage() {
  // Single server-side fetch, ordered so the first photo in a category is a
  // stable cover image.
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("stylist_id", STYLIST_ID)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const items: PortfolioItem[] = data ?? [];

  // Group photos by category, preserving fetch order within each group.
  const map = new Map<string, GalleryCategory>();
  for (const item of items) {
    const name = item.service_category?.trim() || UNCATEGORIZED;
    const entry = map.get(name);
    const photo = {
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      hair_length: item.hair_length,
    };
    if (entry) entry.photos.push(photo);
    else map.set(name, { name, photos: [photo] });
  }

  const categories: GalleryCategory[] = Array.from(map.values()).sort((a, b) => {
    if (a.name === UNCATEGORIZED) return 1;
    if (b.name === UNCATEGORIZED) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-brand-50 to-background">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-600">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Our work
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Portfolio
              </h1>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Real styles, real clients. Pick a category to browse the full
                gallery of knotless box braids, twists, cornrows, locs, and more.
              </p>
              <div className="mt-8 flex justify-center">
                <Button asChild className="bg-brand-500 hover:bg-brand-600 text-white">
                  <Link href="/book">
                    Book your style
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Category tiles + lightbox */}
        <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8">
          {error ? (
            <p className="py-16 text-center text-muted-foreground">
              We couldn&apos;t load the portfolio right now. Please try again soon.
            </p>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No portfolio items yet — check back soon!</p>
            </div>
          ) : (
            <Gallery categories={categories} />
          )}
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-7xl px-6 py-16 text-center lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready for your own transformation?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Pick your service, choose a time, and secure your seat with a deposit — all online.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild className="bg-brand-500 hover:bg-brand-600 text-white">
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
