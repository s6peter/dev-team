import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AccountClient, type AccountAppointment } from "./AccountClient";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;
export const dynamic = "force-dynamic";
export const metadata = { title: "My Appointments" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Link any guest client rows created at booking time to this user.
  const admin = createSupabaseAdminClient();
  if (user.email) {
    await admin
      .from("clients")
      .update({ user_id: user.id })
      .eq("stylist_id", STYLIST_ID)
      .eq("email", user.email)
      .is("user_id", null);
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("appointments")
    .select("id,date,start_time,end_time,status,deposit_cents,balance_due_cents,service_id,manage_token,service:services(name)")
    .order("date", { ascending: false });

  const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m; };
  const appointments: AccountAppointment[] = (data ?? []).map((a) => ({
    id: a.id,
    date: a.date,
    start_time: a.start_time,
    status: a.status,
    serviceName: (a.service as unknown as { name: string } | null)?.name ?? "Appointment",
    serviceId: a.service_id,
    minutes: toMin(a.end_time) - toMin(a.start_time),
    depositCents: a.deposit_cents,
    balanceCents: a.balance_due_cents,
    manageToken: a.manage_token,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <AccountClient email={user.email ?? ""} appointments={appointments} />
      </main>
      <Footer />
    </div>
  );
}
