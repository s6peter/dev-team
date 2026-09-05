import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAdminStylist } from "@/lib/auth";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  const stylist = await getAdminStylist();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {stylist ? <AdminDashboard stylistName={stylist.name} isOwner={stylist.is_owner} /> : <AdminLogin />}
      </main>
      <Footer />
    </div>
  );
}
