import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { timeToMinutes } from "@/lib/time";
import { ManageClient } from "./ManageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage your appointment", robots: { index: false } };

export default async function ManagePage({ params }: { params: { token: string } }) {
  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id,date,start_time,end_time,status,deposit_cents,balance_due_cents,service_id,service:services(name,duration_minutes),tier:service_tiers(duration_addon)")
    .eq("manage_token", params.token)
    .maybeSingle();
  if (!appt) notFound();

  const service = appt.service as unknown as { name: string; duration_minutes: number } | null;
  const minutes = timeToMinutes(appt.end_time) - timeToMinutes(appt.start_time);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <ManageClient
          token={params.token}
          appointment={{
            status: appt.status,
            date: appt.date,
            startTime: appt.start_time,
            serviceName: service?.name ?? "Appointment",
            serviceId: appt.service_id,
            minutes,
            depositCents: appt.deposit_cents,
            balanceCents: appt.balance_due_cents,
          }}
        />
      </main>
      <Footer />
    </div>
  );
}
