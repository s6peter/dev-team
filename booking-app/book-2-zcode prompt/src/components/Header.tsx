"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Scissors, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Services", href: "/services" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Policies", href: "/policies" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDarkPage = pathname === "/services";

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const linkBase = (active: boolean) =>
    `text-sm font-semibold leading-6 transition-colors ${
      active ? "text-brand-400" : isDarkPage ? "text-white/70 hover:text-white" : "text-foreground hover:text-primary"
    }`;

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
        isDarkPage ? "bg-luxury-black/95 border-white/10" : "bg-background/95 border-border"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Main">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
            <Scissors className="h-8 w-8 text-brand-500" />
            <span className={`text-xl font-bold ${isDarkPage ? "text-white" : "text-foreground"}`}>QueenG Braids</span>
          </Link>
        </div>

        <div className="hidden lg:flex lg:gap-x-10">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href} className={linkBase(pathname === item.href)}>
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex lg:flex-1 lg:justify-end">
          <Link href="/account" className={`inline-flex items-center gap-1 ${linkBase(pathname === "/account")}`}>
            <CalendarDays className="h-4 w-4" /> My appointments
          </Link>
          <Link href="/book">
            <Button className="bg-brand-500 text-white hover:bg-brand-600">Book Now</Button>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className={`-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 ${isDarkPage ? "text-white" : "text-foreground"}`}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" id="mobile-menu">
          <div className="fixed inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
          <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm shadow-xl ${isDarkPage ? "bg-luxury-black" : "bg-background"}`}>
            <div className={`flex items-center justify-between border-b p-4 ${isDarkPage ? "border-white/10" : "border-border"}`}>
              <Link href="/" className="-m-1.5 flex items-center gap-2 p-1.5" onClick={() => setMobileMenuOpen(false)}>
                <Scissors className="h-8 w-8 text-brand-500" />
                <span className={`text-xl font-bold ${isDarkPage ? "text-white" : "text-foreground"}`}>QueenG Braids</span>
              </Link>
              <button
                type="button"
                className={`-m-2.5 rounded-md p-2.5 ${isDarkPage ? "text-white" : "text-foreground"}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="space-y-2 px-4 py-6">
                {[...navigation, { name: "My appointments", href: "/account" }].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 ${
                      isDarkPage ? "text-white/70 hover:bg-white/5" : "text-foreground hover:bg-accent"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className={`border-t px-4 py-6 ${isDarkPage ? "border-white/10" : "border-border"}`}>
                <Link href="/book" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-brand-500 text-white hover:bg-brand-600">Book Now</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
