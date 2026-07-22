"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SITE, fullAddress, mapEmbedUrl, mapDirectionsUrl } from "@/lib/site";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isSubmitting = status === "submitting";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = (await res.json()) as { ok?: boolean; error?: string };
      } catch {
        payload = null;
      }

      if (res.ok && payload?.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        return;
      }

      setErrorMessage(
        payload?.error ??
          "Something went wrong sending your message. Please try again."
      );
      setStatus("error");
    } catch {
      setErrorMessage(
        "We couldn't reach the server. Check your connection and try again."
      );
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Contact Us
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Questions about a style, pricing, or your appointment? Reach out
                and we&apos;ll get back to you soon.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Content */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left: Business info */}
              <div>
                <h2 className="text-2xl font-bold">Visit {SITE.shortName}</h2>
                <p className="mt-3 text-muted-foreground">
                  Find us in Denton, TX. Call, email, or drop by during studio
                  hours.
                </p>

                <ul className="mt-8 space-y-6">
                  <li className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Phone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <a
                        href={SITE.phoneHref}
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        {SITE.phone}
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Mail className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <a
                        href={`mailto:${SITE.email}`}
                        className="break-all text-muted-foreground transition-colors hover:text-primary"
                      >
                        {SITE.email}
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Address</p>
                      <p className="text-muted-foreground">{fullAddress()}</p>
                      <a
                        href={mapDirectionsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-brand-600 transition-colors hover:text-brand-500"
                      >
                        Get directions
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Instagram className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Instagram</p>
                      <a
                        href={SITE.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        @{SITE.instagram}
                      </a>
                    </div>
                  </li>
                </ul>

                {/* Map */}
                <div className="mt-8 overflow-hidden rounded-lg border border-border">
                  <iframe
                    title={`Map showing ${SITE.name} at ${fullAddress()}`}
                    src={mapEmbedUrl()}
                    className="h-64 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>

                {/* Hours */}
                <div className="mt-8">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Clock className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    Hours
                  </h3>
                  <dl className="mt-4 divide-y divide-border rounded-lg border border-border">
                    {SITE.hours.map((h) => (
                      <div
                        key={h.day}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <dt className="text-muted-foreground">{h.day}</dt>
                        <dd className="font-medium text-foreground">
                          {h.open} &ndash; {h.close}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {/* Right: Contact form */}
              <div>
                <Card>
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="text-2xl font-bold text-foreground">
                      Send us a message
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Fill out the form and we&apos;ll reply by email.
                    </p>

                    {status === "success" ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-6 text-center"
                      >
                        <CheckCircle2
                          className="mx-auto h-10 w-10 text-brand-600"
                          aria-hidden="true"
                        />
                        <h3 className="mt-3 text-lg font-semibold text-foreground">
                          Message sent!
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Thanks for reaching out. We&apos;ll get back to you as
                          soon as we can.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => setStatus("idle")}
                        >
                          Send another message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            name="name"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            maxLength={120}
                            disabled={isSubmitting}
                            placeholder="Your name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isSubmitting}
                            placeholder="you@example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            name="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            maxLength={3000}
                            rows={5}
                            disabled={isSubmitting}
                            placeholder="How can we help?"
                          />
                        </div>

                        {status === "error" && (
                          <div
                            role="alert"
                            aria-live="assertive"
                            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                          >
                            <AlertCircle
                              className="mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{errorMessage}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-brand-500 hover:bg-brand-600 text-white"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2
                                className="mr-2 h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                              Sending&hellip;
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                              Send message
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
