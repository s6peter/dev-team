import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { FaqAccordion, type FaqItem } from "./FaqAccordion";

export const metadata: Metadata = { title: "FAQ" };

const faqs: FaqItem[] = [
  {
    question: "How does booking work?",
    answer:
      "It's a few simple steps: pick your style, choose an available date and time, and pay your deposit to hold the slot. Your appointment then comes through as pending until QueenG reviews and approves it, and you'll get a confirmation by email (and text) once it's locked in.",
  },
  {
    question: "How much is the deposit and is it refundable?",
    answer:
      "A deposit (50% of the service + tax) is required to book and is applied to your total; it's non-refundable within 24 hours of your appointment. The remaining balance is paid in person on the day of your visit.",
  },
  {
    question: "How do I prep my hair before my appointment?",
    answer:
      "Come with your hair freshly washed, fully blow-dried, and detangled from root to tip. Please skip heavy oils, gels, or leave-in build-up. Arriving prepped means we can start on time and get the cleanest, longest-lasting result.",
  },
  {
    question: "Can I reschedule or cancel?",
    answer:
      "Yes. You can reschedule or cancel for free up to 48 hours before your appointment, and your deposit moves with you to the new date. Inside 24 hours, the deposit is forfeited since the time was reserved just for you.",
  },
  {
    question: "Will I get a reminder before my appointment?",
    answer:
      "Yes. Once your appointment is confirmed, you'll automatically receive a reminder about 24 hours before and again a couple of hours before your start time by email and text, so the details stay handy. After your visit, you may also get a quick note inviting you to leave a review.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Your deposit is paid securely online at booking (major cards, plus Apple Pay and Google Pay through our checkout). The remaining balance is paid in person on the day of your appointment.",
  },
  {
    question: "How long do braids last?",
    answer:
      "With good care, most protective styles hold up for around 4 to 8 weeks depending on the style, your hair type, and your maintenance routine. You'll get aftercare tips to help your look last as long as possible.",
  },
  {
    question: "Do you offer consultations?",
    answer:
      "Absolutely. If you're unsure which style or length is right for you, reach out before booking and we'll talk through options, prep, and pricing so you know exactly what to expect.",
  },
  {
    question: "What if I have questions before I book?",
    answer: `The fastest way to reach QueenG is by phone at ${SITE.phone} or by email at ${SITE.email}. You can also send a message on Instagram @${SITE.instagram}.`,
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-brand-50 to-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">
                Good to know
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Frequently Asked Questions
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Everything you need to know about booking, deposits, prep, and
                what to expect at {SITE.shortName}.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ List */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <FaqAccordion items={faqs} />

            <div className="mt-14 rounded-2xl border border-border bg-muted/40 p-8 text-center">
              <p className="text-lg font-semibold text-foreground">
                Still have questions?
              </p>
              <p className="mt-2 text-muted-foreground">
                Reach out and we&apos;ll help you find the right style and time.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/book">
                  <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                    Book Now
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline">Contact Us</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
