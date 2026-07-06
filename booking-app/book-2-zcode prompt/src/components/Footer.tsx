import Link from "next/link";
import { Scissors, Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2">
              <Scissors className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">QueenG Braids</span>
            </Link>
            <p className="text-sm leading-6 text-muted-foreground">
              Professional braiding services specializing in box braids,
              cornrows, and protective styles. Creating beautiful looks that
              last.
            </p>
            <div className="flex space-x-6">
              <a
                href="https://instagram.com/queengbraids"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <span className="sr-only">Instagram</span>
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://facebook.com/queengbraids"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">
                  Services
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/services#box-braids"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Box Braids
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#knotless-braids"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Knotless Braids
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#cornrows"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Cornrows
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#twists"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Twists
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/services#crochet-braids"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Crochet Braids
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">
                  Company
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/about"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/portfolio"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Portfolio
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">
                  Booking
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/book"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      Book Appointment
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/account"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      My Appointments
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">
                  Contact
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a
                      href="tel:+19016311481"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      (901) 631-1481
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <a
                      href="mailto:queengbraids@gmail.com"
                      className="text-sm leading-6 text-muted-foreground hover:text-primary"
                    >
                      queengbraids@gmail.com
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <span className="text-sm leading-6 text-muted-foreground">
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

        <div className="mt-16 border-t pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-muted-foreground">
            &copy; {new Date().getFullYear()} QueenG Braids & Essentials. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
