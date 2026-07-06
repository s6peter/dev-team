"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    question: "How do I book an appointment?",
    answer:
      "You can book an appointment by clicking the 'Book Now' button on our website. Select your desired service, choose an available time slot, fill out the intake form, and pay the deposit to secure your appointment.",
  },
  {
    question: "How much is the deposit?",
    answer:
      "The deposit is typically 50% of the service price plus tax. The remaining balance is paid in person on the day of your appointment.",
  },
  {
    question: "Can I cancel or reschedule my appointment?",
    answer:
      "Yes, you can cancel or reschedule your appointment up to 24 hours before your scheduled time. Cancellations within 24 hours may forfeit the deposit.",
  },
  {
    question: "What should I do to prepare for my appointment?",
    answer:
      "Come with clean, dry, detangled hair. Avoid heavy oils or products. Specific preparation instructions will be provided when you book your service.",
  },
  {
    question: "How long do braids last?",
    answer:
      "With proper care, braids can last 4-8 weeks depending on the style, your hair type, and how well you maintain them. We provide care instructions with every service.",
  },
  {
    question: "Do you offer touch-ups or maintenance?",
    answer:
      "Yes, we offer touch-up services for existing braids. Contact us to schedule a maintenance appointment.",
  },
  {
    question: "What forms of payment do you accept?",
    answer:
      "We accept all major credit cards, debit cards, and digital payments like Apple Pay and Google Pay through our secure online payment system.",
  },
  {
    question: "Is there parking available?",
    answer:
      "Yes, there is street parking available near our location, as well as a parking lot within walking distance.",
  },
  {
    question: "Do you offer consultations?",
    answer:
      "Yes, we offer free consultations to discuss your desired style, hair health, and any concerns you may have. You can schedule a consultation or discuss during your appointment.",
  },
  {
    question: "What if I'm not satisfied with my service?",
    answer:
      "Your satisfaction is our priority. If you're not happy with your service, please let us know and we'll work with you to make it right.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b">
      <button
        className="flex w-full items-center justify-between py-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 text-muted-foreground">{answer}</div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Frequently Asked Questions
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Find answers to common questions about our services and booking
                process.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ List */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="space-y-0">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                />
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">
                Still have questions?
              </p>
              <Link href="/contact">
                <Button>Contact Us</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
