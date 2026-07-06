"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Clock, Scissors } from "lucide-react";
import type { Service, ServiceTier } from "@/types";

export default function ServicesPage() {
  const [services, setServices] = useState<(Service & { service_tiers: ServiceTier[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*, service_tiers(*)")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching services:", error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading services...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Our Services
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Choose from our wide range of professional braiding services.
                Each service includes a consultation to ensure you get the
                perfect look.
              </p>
            </div>
          </div>
        </section>

        {/* Services List */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="space-y-12">
              {services.map((service) => (
                <Card
                  key={service.id}
                  id={service.name.toLowerCase().replace(/\s+/g, "-")}
                  className="overflow-hidden"
                >
                  <div className="md:grid md:grid-cols-3">
                    <div className="aspect-video md:aspect-auto bg-muted relative">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Scissors className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="md:col-span-2 p-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold">{service.name}</h2>
                          <p className="mt-2 text-muted-foreground">
                            {service.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(service.base_price)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {Math.floor(service.duration_minutes / 60)}h{" "}
                              {service.duration_minutes % 60 > 0 &&
                                `${service.duration_minutes % 60}m`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tiers */}
                      {service.service_tiers && service.service_tiers.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-3">
                            Pricing Options ({service.service_tiers.length} configurations):
                          </h3>
                          <div className="max-h-64 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-background border-b">
                                <tr>
                                  <th className="text-left p-3 font-medium">Size / Length</th>
                                  <th className="text-right p-3 font-medium">Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {service.service_tiers.map((tier) => (
                                  <tr key={tier.id} className="border-b last:border-b-0 hover:bg-accent/50">
                                    <td className="p-3">{tier.name}</td>
                                    <td className="p-3 text-right font-medium text-primary">
                                      {formatCurrency(service.base_price + tier.price_addon)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Deposit: {service.deposit_percent}% of total. Balance paid in person.
                          </p>
                        </div>
                      )}

                      {/* Prep & Care Notes */}
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {service.prep_notes && (
                          <div className="bg-accent/50 rounded-lg p-4">
                            <h4 className="font-medium text-sm mb-2">
                              Preparation Notes
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {service.prep_notes}
                            </p>
                          </div>
                        )}
                        {service.care_notes && (
                          <div className="bg-accent/50 rounded-lg p-4">
                            <h4 className="font-medium text-sm mb-2">
                              Care Instructions
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {service.care_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <Link href={`/book?service=${service.id}`}>
                          <Button>Book This Service</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
