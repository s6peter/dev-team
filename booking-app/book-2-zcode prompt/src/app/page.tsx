import Link from "next/link";
import {
  Sparkles,
  Star,
  ArrowRight,
  BadgeDollarSign,
  ShieldCheck,
  CalendarCheck,
  BellRing,
  Clock,
  MapPin,
  Phone,
  Mail,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computePricing, formatCents } from "@/lib/pricing";
import { formatDuration } from "@/lib/utils";
import {
  SITE,
  fullAddress,
  mapEmbedUrl,
  mapDirectionsUrl,
} from "@/lib/site";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID ?? "";

type ServiceCard = {
  id: string;
  name: string;
  image_url: string | null;
  base_price: number;
  tax_rate: number;
  deposit_percent: number;
  duration_minutes: number;
};

type ReviewCard = {
  id: string;
  author_name: string;
  rating: number;
  comment: string | null;
};

const valueProps = [
  {
    icon: BadgeDollarSign,
    title: "Real prices upfront",
    description:
      "See the exact cost of every style before you book — no guesswork, no surprises at the chair.",
  },
  {
    icon: ShieldCheck,
    title: "Secure deposit",
    description:
      "Reserve your spot with a safe, encrypted deposit. The balance is simply paid in person.",
  },
  {
    icon: CalendarCheck,
    title: "Instant confirmation",
    description:
      "Pick your service and time and lock it in immediately — your appointment is confirmed on the spot.",
  },
  {
    icon: BellRing,
    title: "Helpful reminders",
    description:
      "Automatic text and email reminders keep prep simple so you arrive ready for a flawless install.",
  },
];

/** Fill-to-rating star row. */
function Stars({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={
            i <= rounded
              ? "h-4 w-4 fill-brand-500 text-brand-500"
              : "h-4 w-4 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const supabase = createSupabaseServerClient();

  const [servicesRes, reviewsRes] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id,name,image_url,base_price,tax_rate,deposit_percent,duration_minutes"
      )
      .eq("stylist_id", STYLIST_ID)
      .eq("is_active", true)
      .order("sort_order")
      .limit(4),
    supabase
      .from("reviews")
      .select("id,author_name,rating,comment")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const services: ServiceCard[] = (servicesRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    image_url: s.image_url,
    base_price: s.base_price,
    tax_rate: s.tax_rate,
    deposit_percent: s.deposit_percent,
    duration_minutes: s.duration_minutes,
  }));

  const reviews: ReviewCard[] = (reviewsRes.data ?? [])
    .map((r) => ({
      id: r.id,
      author_name: r.author_name,
      rating: r.rating,
      comment: r.comment,
    }))
    .filter((r) => r.comment != null && r.comment.trim().length > 0);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const heroImage = services.find((s) => s.image_url)?.image_url ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 sm:py-24 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:flex-1 lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-100/60 px-4 py-1.5 text-sm font-medium text-brand-600">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {SITE.tagline}
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Braids booked online, in{" "}
                <span className="text-brand-500">under two minutes</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {SITE.description}
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/book" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full bg-brand-500 text-base font-semibold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 sm:w-auto"
                  >
                    Book Now
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/services" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full text-base sm:w-auto"
                  >
                    View Services & Prices
                  </Button>
                </Link>
              </div>
              {reviews.length > 0 && (
                <div className="mt-8 flex items-center justify-center gap-3 lg:justify-start">
                  <Stars rating={avgRating} />
                  <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {avgRating.toFixed(1)}
                    </span>{" "}
                    from happy clients in {SITE.address.city}
                  </span>
                </div>
              )}
            </div>

            <div className="mx-auto w-full max-w-md lg:mx-0 lg:flex-1">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={`Protective braiding style by ${SITE.shortName}`}
                  className="aspect-[4/5] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-black/5"
                  loading="eager"
                />
              ) : (
                <div className="aspect-[4/5] w-full rounded-3xl bg-gradient-to-br from-brand-200 via-brand-100 to-brand-50 shadow-2xl ring-1 ring-black/5" />
              )}
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Why book online with us
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                A polished, professional booking experience from the very first
                tap.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
              {valueProps.map((prop) => (
                <div
                  key={prop.title}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <prop.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-foreground">
                    {prop.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {prop.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services preview */}
        {services.length > 0 && (
          <section className="bg-muted/40 py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Popular styles
                </h2>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  Transparent pricing and time estimates on every service.
                </p>
              </div>
              <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
                {services.map((service) => {
                  const total = computePricing({
                    basePriceCents: service.base_price,
                    taxRate: service.tax_rate,
                    depositPercent: service.deposit_percent,
                  }).serviceTotalCents;
                  return (
                    <Link
                      key={service.id}
                      href="/services"
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                        {service.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-brand-100 to-brand-50" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="text-base font-semibold text-foreground">
                          {service.name}
                        </h3>
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <span className="text-sm font-semibold text-brand-600">
                            from {formatCents(total)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-12 text-center">
                <Link href="/services">
                  <Button variant="outline" size="lg" className="text-base">
                    View all services
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {reviews.length > 0 && (
          <section className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  What clients are saying
                </h2>
              </div>
              <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
                {reviews.map((review) => (
                  <figure
                    key={review.id}
                    className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
                  >
                    <Stars rating={review.rating} />
                    <blockquote className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
                      &ldquo;{review.comment}&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 text-sm font-semibold text-foreground">
                      {review.author_name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Location */}
        <section className="bg-muted/40 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Visit the studio
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Find us in {SITE.address.city}, {SITE.address.state}.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-10 lg:max-w-none lg:grid-cols-2">
              <div className="flex flex-col">
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <MapPin
                      className="mt-0.5 h-6 w-6 flex-none text-brand-500"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {fullAddress()}
                      </p>
                      <a
                        href={mapDirectionsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500"
                      >
                        <Navigation className="h-4 w-4" aria-hidden="true" />
                        Get directions
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Phone
                      className="mt-0.5 h-6 w-6 flex-none text-brand-500"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground">Phone</p>
                      <a
                        href={SITE.phoneHref}
                        className="text-sm text-muted-foreground hover:text-brand-500"
                      >
                        {SITE.phone}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail
                      className="mt-0.5 h-6 w-6 flex-none text-brand-500"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground">Email</p>
                      <a
                        href={`mailto:${SITE.email}`}
                        className="text-sm text-muted-foreground hover:text-brand-500"
                      >
                        {SITE.email}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Clock
                      className="mt-0.5 h-6 w-6 flex-none text-brand-500"
                      aria-hidden="true"
                    />
                    <div className="w-full">
                      <p className="font-semibold text-foreground">Hours</p>
                      <dl className="mt-2 space-y-1">
                        {SITE.hours.map((h) => (
                          <div
                            key={h.day}
                            className="flex items-center justify-between gap-6 text-sm"
                          >
                            <dt className="text-muted-foreground">{h.day}</dt>
                            <dd className="text-foreground">
                              {h.open} &ndash; {h.close}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="h-80 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm lg:h-full lg:min-h-[24rem]">
                <iframe
                  src={mapEmbedUrl()}
                  title={`Map showing the location of ${SITE.name}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-luxury-black">
          <div className="mx-auto max-w-7xl px-6 py-20 text-center sm:py-28 lg:px-8">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready for your next protective style?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-white/70">
              Choose your service, pick a time, and secure your spot with a
              deposit. It only takes a couple of minutes.
            </p>
            <div className="mt-10 flex justify-center">
              <Link href="/book">
                <Button
                  size="lg"
                  className="bg-brand-500 text-base font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600"
                >
                  Book Now
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
