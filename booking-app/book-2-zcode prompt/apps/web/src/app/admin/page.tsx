import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAdminStylist } from "@/lib/auth";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { ChangePassword } from "./ChangePassword";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  const stylist = await getAdminStylist();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {stylist ? (
          stylist.is_active === false ? (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
              <h1 className="mb-2 text-2xl font-bold">Account suspended</h1>
              <p className="text-muted-foreground">
                Your stylist account has been suspended. Please contact the salon owner to be reinstated.
              </p>
            </div>
          ) : stylist.must_change_password ? (
            <ChangePassword />
          ) : (
            <AdminDashboard stylistName={stylist.name} isOwner={stylist.is_owner} />
          )
        ) : (
          <AdminLogin />
        )}
      </main>
      <Footer />
    </div>
  );
}
