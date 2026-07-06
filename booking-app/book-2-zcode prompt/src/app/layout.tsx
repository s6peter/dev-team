import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QueenG Braids & Essentials",
  description:
    "Professional braiding services specializing in box braids, cornrows, and protective styles. Book your appointment today.",
  keywords: [
    "braids",
    "box braids",
    "cornrows",
    "protective styles",
    "hair braiding",
    "natural hair",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
