"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { SITE } from "@/lib/site";

export function Footer() {
  const pathname = usePathname();
  const isDarkPage = pathname === "/services";

  return (
    <footer className={`${isDarkPage ? "bg-luxury-black border-t border-white/10" : "bg-background border-t border-border"}`}>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2">
              <Scissors className="h-8 w-8 text-brand-500" />
              <span className={`text-xl font-bold ${isDarkPage ? "text-white" : "text-foreground"}`}>
                QueenG Braids
              </span>
            </Link>
            <p className={`text-sm leading-6 ${isDarkPage ? "text-white/50" : "text-muted-foreground"}`}>
              Professional braiding services specializing in box braids,
              cornrows, and protective styles. Creating beautiful looks that
              last.
            </p>
            <div className="flex space-x-6">
              <a
                href="https://instagram.com/queengbraids"
                target="_blank"
                rel="noopener noreferrer"
                className={`${isDarkPage ? "text-white/40 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
              >
                <span className="sr-only">Instagram</span>
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://facebook.com/queengbraids"
                target="_blank"
                rel="noopener noreferrer"
                className={`${isDarkPage ? "text-white/40 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
              >
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href={SITE.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${isDarkPage ? "text-white/40 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
              >
                <span className="sr-only">TikTok</span>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                  <path d="M16.5 3c.26 2.02 1.42 3.45 3.5 3.72v2.42c-1.2.12-2.34-.28-3.6-1.04v5.79c0 3.4-2.7 5.86-6 5.86-3.14 0-5.9-2.48-5.9-5.68 0-3.34 2.76-5.83 6.04-5.83.28 0 .56.02.86.08v2.55c-.28-.09-.57-.13-.86-.13-1.82 0-3.32 1.42-3.32 3.28 0 1.83 1.46 3.22 3.3 3.22 1.86 0 3.38-1.44 3.38-3.62V3h2.6z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className={`text-sm font-semibold leading-6 ${isDarkPage ? "text-white" : "text-foreground"}`}>
                  Services
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/services#box-braids"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Box Braids
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#cornrows"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Cornrows
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#knotless-braids"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Knotless Braids
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#crochet"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Crochet Braids
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#twists"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Twists
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className={`text-sm font-semibold leading-6 ${isDarkPage ? "text-white" : "text-foreground"}`}>
                  Company
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/about"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/portfolio"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Portfolio
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/policies"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Policies
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className={`text-sm font-semibold leading-6 ${isDarkPage ? "text-white" : "text-foreground"}`}>
                  Booking
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/book"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      Book Appointment
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/account"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      My Appointments
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className={`text-sm font-semibold leading-6 ${isDarkPage ? "text-white" : "text-foreground"}`}>
                  Contact
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li className="flex items-center gap-3">
                    <Phone className={`h-5 w-5 ${isDarkPage ? "text-white/40" : "text-muted-foreground"}`} />
                    <a
                      href="tel:+19016311481"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      (901) 631-1481
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className={`h-5 w-5 ${isDarkPage ? "text-white/40" : "text-muted-foreground"}`} />
                    <a
                      href="mailto:queengbraids@gmail.com"
                      className={`text-sm leading-6 ${isDarkPage ? "text-white/50 hover:text-brand-400" : "text-muted-foreground hover:text-primary"}`}
                    >
                      queengbraids@gmail.com
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className={`h-5 w-5 mt-0.5 ${isDarkPage ? "text-white/40" : "text-muted-foreground"}`} />
                    <span className={`text-sm leading-6 ${isDarkPage ? "text-white/50" : "text-muted-foreground"}`}>
                      4909 Beaver Creek Ave
                      <br />
                      Denton, TX 76207
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-16 border-t pt-8 sm:mt-20 lg:mt-24 ${isDarkPage ? "border-white/10" : "border-border"}`}>
          <p className={`text-xs leading-5 ${isDarkPage ? "text-white/30" : "text-muted-foreground"}`}>
            &copy; {new Date().getFullYear()} QueenG Braids & Essentials. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
