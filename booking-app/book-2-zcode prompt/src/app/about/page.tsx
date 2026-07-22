import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import {
  Sparkles,
  Heart,
  Clock,
  ShieldCheck,
  Instagram,
  MapPin,
} from "lucide-react";

export const metadata: Metadata = { title: "About" };

const specialties = [
  "Knotless box braids",
  "Twists",
  "Cornrows",
  "Locs",
];

const values = [
  {
    icon: Heart,
    title: "One client at a time",
    description:
      "Every appointment is one-on-one and unrushed. You get focused attention, honest advice, and a style tailored to your hair.",
  },
  {
    icon: Sparkles,
    title: "Protective styling, done right",
    description:
      "Clean parts, comfortable tension, and neat finishes that are made to last, so your natural hair stays happy underneath.",
  },
  {
    icon: ShieldCheck,
    title: "Book direct, stay connected",
    description:
      "Booking straight through this site keeps a direct relationship between you and your stylist, so your history, preferences, and prices are always clear.",
  },
  {
    icon: Clock,
    title: "Clear time and pricing",
    description:
      "You see real prices and honest timing up front, secure your spot with a deposit, and pay the balance in person, with no surprises.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">
                {SITE.address.city}, {SITE.address.state}
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                About {SITE.name}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {SITE.tagline} A solo braiding studio in {SITE.address.city},{" "}
                {SITE.address.state}, focused on protective styles that fit your
                hair and your life.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight">
                Meet QueenG
              </h2>
              <div className="mt-6 space-y-6 text-muted-foreground">
                <p>
                  {SITE.name} is a one-woman studio. QueenG is the braider you
                  book, the braider you meet, and the braider who finishes your
                  style, so the person doing your hair is the same person who
                  knows exactly what you asked for.
                </p>
                <p>
                  What started as braiding for family and friends grew into a
                  home base in {SITE.address.city}, {SITE.address.state}, for
                  clients who want protective styling that respects their
                  natural hair. Every appointment is personal and unrushed,
                  with real attention paid to healthy tension, clean parts, and
                  a finish that lasts.
                </p>
                <p>
                  Booking directly here keeps things simple and personal. There
                  is no middle layer between you and your stylist, so your
                  preferences, your history, and your pricing stay consistent
                  every time you come back.
                </p>
              </div>

              {/* Specialties */}
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-foreground">
                  Specialties
                </h3>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {specialties.map((specialty) => (
                    <li
                      key={specialty}
                      className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
                    >
                      {specialty}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 sm:py-28 bg-muted/40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                How I work
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                A few things you can count on at every appointment.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
              {values.map((value) => (
                <Card key={value.title}>
                  <CardContent className="p-8">
                    <value.icon
                      aria-hidden="true"
                      className="h-10 w-10 text-brand-500 mb-4"
                    />
                    <h3 className="text-xl font-semibold">{value.title}</h3>
                    <p className="mt-3 text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to book your style?
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              See real prices, pick your time, and reserve your spot online.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/book">
                <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                  Book Now
                </Button>
              </Link>
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <Instagram aria-hidden="true" className="mr-2 h-4 w-4" />
                  @{SITE.instagram}
                </Button>
              </a>
            </div>
            <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="h-4 w-4 text-brand-500" />
              {SITE.address.city}, {SITE.address.state}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
