import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Storefront } from "./Storefront";

export const metadata: Metadata = {
  title: "Shop | QueenG Braids",
  description: "Hair care, edge control, and braid essentials — curated by QueenG Braids.",
};

export default function ShopPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-background">
      <Header />
      <main className="flex-1">
        <Storefront />
      </main>
      <Footer />
    </div>
  );
}
