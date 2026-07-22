import Link from "next/link";
import { CalendarX, Clock, CreditCard, Scissors, Sparkles, UserCheck, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/pricing";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;
export const dynamic = "force-dynamic";
export const metadata = { title: "Salon Policies" };

export default async function PoliciesPage() {
  const supabase = createSupabaseServerClient();
  const { data: p } = await supabase
    .from("cancellation_policy")
    .select("*")
    .eq("stylist_id", STYLIST_ID)
    .maybeSingle();

  const blowDry = formatCents(p?.blow_dry_fee_cents ?? 2000);
  const late = formatCents(p?.late_fee_cents ?? 2000);
  const grace = p?.grace_minutes ?? 10;
  const cancelHrs = p?.cancel_notice_hours ?? 24;

  const sections = [
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: "Booking & deposit",
      items: [
        "A $50 non-refundable deposit is required to book, and is applied toward your service.",
        "The remaining balance is due after service. Taxes are charged on the deposit only — not the full price.",
      ],
    },
    {
      icon: <CalendarX className="h-5 w-5" />,
      title: "Cancellation",
      items: [
        `You won't be charged if you cancel at least ${cancelHrs} hours before your appointment.`,
        `Cancellations made less than ${cancelHrs} hours before, and no-call/no-shows, forfeit the deposit.`,
      ],
    },
    {
      icon: <UserCheck className="h-5 w-5" />,
      title: "Rescheduling",
      items: [
        "You may reschedule once with the same deposit, at least 24 hours ahead, using the link in your confirmation email.",
      ],
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Hair requirements (we don't wash)",
      items: [
        "Arrive with hair washed and blow-dried, with no oil or styling products.",
        `If your hair can't be blow-dried as required, a ${blowDry} fee is added.`,
        "We provide Xpression pre-stretched extensions for all styles.",
        "For boho styles, bring your own 100% human hair (curly pieces). Bring your own hair for all other styles.",
      ],
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Late arrivals",
      items: [
        `A ${grace}-minute grace period is allowed. After ${grace} minutes, a ${late} late fee applies.`,
        "After 15 minutes your appointment is cancelled as a no-show and the deposit is forfeited.",
      ],
    },
    {
      icon: <Scissors className="h-5 w-5" />,
      title: "Kids",
      items: [
        "Kids' braids are for children ages 5–12; prices are specific to this age range.",
        "Parents drop off only and don't sit in during the appointment. A pickup text is sent ~30 minutes before completion.",
      ],
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Guests",
      items: ["No extra guests, for safety and sanitation. Please drop off your child only."],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Salon Policies</h1>
          <p className="mt-2 text-muted-foreground">Please read carefully before booking — it keeps every appointment running smoothly.</p>
        </div>

        <div className="space-y-4">
          {sections.map((s) => (
            <section key={s.title} className="rounded-xl border border-border p-5">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <span className="text-brand-500">{s.icon}</span>
                {s.title}
              </h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {s.items.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-300" />
                    {it}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-brand-50 p-6 text-center">
          <p className="mb-3 font-medium">Thank you for respecting our time and policies! 💕</p>
          <Link href="/book">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white">Book an appointment</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
