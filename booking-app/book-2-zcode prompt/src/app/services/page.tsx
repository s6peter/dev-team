"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronDown, ChevronUp, Crown, Sparkles } from "lucide-react";

interface PricingRow {
  size: string;
  lengths: { label: string; price: number }[];
}

interface ServiceCategory {
  name: string;
  icon: string;
  services: {
    name: string;
    pricing: PricingRow[];
    note?: string;
  }[];
}

const serviceData: ServiceCategory[] = [
  {
    name: "Box Braids",
    icon: "✨",
    services: [
      {
        name: "Box Braids",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 160 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 240 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 170 }, { label: "Bra", price: 190 }, { label: "Midback", price: 210 }, { label: "Waist", price: 240 }, { label: "Butt", price: 270 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 300 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 280 }, { label: "Bra", price: 300 }, { label: "Midback", price: 330 }, { label: "Waist", price: 350 }, { label: "Butt", price: 400 }] },
        ],
      },
    ],
  },
  {
    name: "Knotless Braids",
    icon: "💫",
    services: [
      {
        name: "Knotless Braids",
        pricing: [
          { size: "Large", lengths: [{ label: "Bra", price: 130 }, { label: "Midback", price: 150 }, { label: "Waist", price: 180 }, { label: "Butt", price: 200 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 160 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 250 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 300 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 260 }, { label: "Bra", price: 300 }, { label: "Midback", price: 330 }, { label: "Waist", price: 380 }, { label: "Butt", price: 420 }] },
        ],
      },
      {
        name: "BOHO Knotless",
        pricing: [
          { size: "Large", lengths: [{ label: "Bra", price: 150 }, { label: "Midback", price: 170 }, { label: "Waist", price: 200 }, { label: "Butt", price: 220 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 240 }, { label: "Butt", price: 270 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 240 }, { label: "Midback", price: 270 }, { label: "Waist", price: 300 }, { label: "Butt", price: 320 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 280 }, { label: "Bra", price: 320 }, { label: "Midback", price: 370 }, { label: "Waist", price: 400 }, { label: "Butt", price: 440 }] },
        ],
      },
    ],
  },
  {
    name: "Twists",
    icon: "🌸",
    services: [
      {
        name: "Kinky & Havana Twist",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 140 }, { label: "Bra", price: 160 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 230 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 250 }, { label: "Midback", price: 280 }, { label: "Waist", price: 300 }] },
        ],
      },
      {
        name: "Senegalese Twist",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 170 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }, { label: "Butt", price: 250 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 250 }, { label: "Midback", price: 280 }, { label: "Waist", price: 300 }, { label: "Butt", price: 350 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 300 }, { label: "Bra", price: 350 }, { label: "Midback", price: 400 }, { label: "Waist", price: 450 }, { label: "Butt", price: 500 }] },
        ],
      },
      {
        name: "Passion Twist",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 160 }, { label: "Bra", price: 170 }, { label: "Midback", price: 180 }, { label: "Waist", price: 200 }, { label: "Butt", price: 230 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 300 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 320 }, { label: "Bra", price: 350 }, { label: "Midback", price: 380 }] },
        ],
      },
      {
        name: "Island Twist",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 230 }, { label: "Waist", price: 250 }, { label: "Butt", price: 280 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 210 }, { label: "Bra", price: 230 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }, { label: "Butt", price: 310 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 250 }, { label: "Bra", price: 280 }, { label: "Midback", price: 310 }, { label: "Waist", price: 330 }, { label: "Butt", price: 380 }] },
          { size: "Extra Small", lengths: [{ label: "Shoulder", price: 330 }, { label: "Bra", price: 380 }, { label: "Midback", price: 430 }, { label: "Waist", price: 480 }, { label: "Butt", price: 530 }] },
        ],
      },
    ],
  },
  {
    name: "Cornrows",
    icon: "👑",
    services: [
      {
        name: "Cornrows",
        pricing: [
          { size: "Simple style no extension", lengths: [{ label: "Starting at", price: 60 }] },
          { size: "Simple style with extension", lengths: [{ label: "Starting at", price: 100 }] },
          { size: "Feed In Ponytail medium bra", lengths: [{ label: "Starting at", price: 140 }] },
          { size: "Feed In Ponytail small bra", lengths: [{ label: "Starting at", price: 170 }] },
          { size: "Tribal Braids medium", lengths: [{ label: "Starting at", price: 150 }] },
          { size: "Tribal Braids small", lengths: [{ label: "Starting at", price: 180 }] },
          { size: "Lemonade Braids", lengths: [{ label: "Starting at", price: 150 }] },
        ],
        note: "Design fee may apply for complex patterns",
      },
      {
        name: "Cornrows - Multi Layer",
        pricing: [
          { size: "2 layers medium bra", lengths: [{ label: "Price", price: 220 }] },
          { size: "2 layers medium midback", lengths: [{ label: "Price", price: 240 }] },
          { size: "2 layers medium waist", lengths: [{ label: "Price", price: 260 }] },
          { size: "2 layers small bra", lengths: [{ label: "Price", price: 280 }] },
          { size: "2 layers small midback", lengths: [{ label: "Price", price: 300 }] },
          { size: "2 layers small waist", lengths: [{ label: "Price", price: 350 }] },
          { size: "3 layers medium bra", lengths: [{ label: "Price", price: 300 }] },
          { size: "3 layers medium midback", lengths: [{ label: "Price", price: 320 }] },
          { size: "3 layers medium waist", lengths: [{ label: "Price", price: 340 }] },
          { size: "3 layers small bra", lengths: [{ label: "Price", price: 360 }] },
          { size: "3 layers small midback", lengths: [{ label: "Price", price: 380 }] },
          { size: "3 layers waist", lengths: [{ label: "Price", price: 400 }] },
        ],
      },
    ],
  },
  {
    name: "Crochets",
    icon: "🪝",
    services: [
      {
        name: "Crochets",
        pricing: [
          { size: "With cornrow base (pre-looped)", lengths: [{ label: "Price", price: 120 }] },
          { size: "Cornrow base (not pre-looped)", lengths: [{ label: "Price", price: 150 }] },
          { size: "With individual braids medium", lengths: [{ label: "Price", price: 200 }] },
          { size: "With individual braid small", lengths: [{ label: "Price", price: 220 }] },
          { size: "Butterfly locks", lengths: [{ label: "Price", price: 250 }] },
          { size: "Soft Locks", lengths: [{ label: "Price", price: 300 }] },
        ],
      },
    ],
  },
  {
    name: "Micro Braids",
    icon: "💎",
    services: [
      {
        name: "Micro Braids",
        pricing: [
          { size: "Medium", lengths: [{ label: "Price", price: 220 }] },
          { size: "Small", lengths: [{ label: "Price", price: 250 }] },
          { size: "Extra Small", lengths: [{ label: "Price", price: 300 }] },
        ],
      },
    ],
  },
  {
    name: "Other Services",
    icon: "💇‍♀️",
    services: [
      {
        name: "Additional Services",
        pricing: [
          { size: "Braids Take down", lengths: [{ label: "Starting at", price: 60 }] },
          { size: "Wig take down", lengths: [{ label: "Starting at", price: 50 }] },
          { size: "Tree Braids", lengths: [{ label: "Starting at", price: 250 }] },
          { size: "Natural hair twist", lengths: [{ label: "Starting at", price: 80 }] },
          { size: "Fulani Braids", lengths: [{ label: "Starting at", price: 200 }] },
          { size: "Sew Ins", lengths: [{ label: "Starting at", price: 80 }] },
        ],
      },
    ],
  },
  {
    name: "Kids Services",
    icon: "👶",
    services: [
      {
        name: "Kids Kinky & Havana Twist",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 100 }, { label: "Bra", price: 130 }, { label: "Midback", price: 150 }, { label: "Waist", price: 180 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 270 }] },
        ],
      },
      {
        name: "Kids Senegalese Twist",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 100 }, { label: "Bra", price: 130 }, { label: "Midback", price: 150 }, { label: "Waist", price: 180 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 270 }] },
        ],
      },
      {
        name: "Kids Box Braids",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 150 }, { label: "Bra", price: 180 }, { label: "Midback", price: 200 }, { label: "Waist", price: 220 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 180 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 250 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 250 }, { label: "Waist", price: 280 }] },
        ],
      },
      {
        name: "Kids Boho Knotless",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 170 }, { label: "Bra", price: 200 }, { label: "Midback", price: 220 }, { label: "Waist", price: 240 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 200 }, { label: "Bra", price: 220 }, { label: "Midback", price: 240 }, { label: "Waist", price: 270 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 220 }, { label: "Bra", price: 240 }, { label: "Midback", price: 270 }, { label: "Waist", price: 300 }] },
        ],
      },
      {
        name: "Kids Knotless",
        pricing: [
          { size: "Large", lengths: [{ label: "Shoulder", price: 140 }, { label: "Bra", price: 170 }, { label: "Midback", price: 190 }, { label: "Waist", price: 210 }] },
          { size: "Medium", lengths: [{ label: "Shoulder", price: 170 }, { label: "Bra", price: 190 }, { label: "Midback", price: 210 }, { label: "Waist", price: 240 }] },
          { size: "Small", lengths: [{ label: "Shoulder", price: 190 }, { label: "Bra", price: 210 }, { label: "Midback", price: 240 }, { label: "Waist", price: 270 }] },
        ],
      },
      {
        name: "Kids Braids",
        pricing: [
          { size: "Kids cornrows", lengths: [{ label: "Starting at", price: 70 }] },
          { size: "Kids Crochets", lengths: [{ label: "Starting at", price: 100 }] },
        ],
      },
    ],
  },
];

function PricingTable({ pricing }: { pricing: PricingRow[] }) {
  const hasLengths = pricing[0]?.lengths.length > 1 && pricing[0]?.lengths[0].label !== "Starting at" && pricing[0]?.lengths[0].label !== "Price";

  if (!hasLengths) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {pricing.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>{row.size}</span>
            <span style={{ color: "#f472b6", fontWeight: 600 }}>${row.lengths[0].price}+</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
            <th style={{ textAlign: "left", padding: "8px 0", color: "#f9a8d4", fontWeight: 500 }}>Size</th>
            {pricing[0]?.lengths.map((l) => (
              <th key={l.label} style={{ textAlign: "right", padding: "8px", color: "#f9a8d4", fontWeight: 500 }}>
                {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pricing.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <td style={{ padding: "8px 0", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{row.size}</td>
              {row.lengths.map((l, j) => (
                <td key={j} style={{ textAlign: "right", padding: "8px", color: "rgba(255,255,255,0.7)" }}>
                  ${l.price}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ServicesPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Box Braids");
  const [expandedService, setExpandedService] = useState<string | null>(null);

  return (
    <div className="dark-theme" style={{ minHeight: "100vh" }}>
      <Header />

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section style={{ position: "relative", padding: "96px 24px", overflow: "hidden" }}>
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(236, 72, 153, 0.1), transparent)"
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "384px",
            height: "384px",
            background: "rgba(236, 72, 153, 0.05)",
            borderRadius: "50%",
            filter: "blur(60px)"
          }} />
          <div style={{ position: "relative", maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "672px", margin: "0 auto", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
                <Crown style={{ width: "32px", height: "32px", color: "#f472b6" }} />
                <Sparkles style={{ width: "24px", height: "24px", color: "#f9a8d4" }} />
              </div>
              <h1 style={{ fontSize: "48px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
                Our <span style={{ color: "#f472b6" }}>Services</span>
              </h1>
              <p style={{ marginTop: "24px", fontSize: "18px", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
                Browse our full menu below. Click any service to see available sizes, lengths, and exact pricing.
              </p>
            </div>
          </div>
        </section>

        {/* Services Accordion */}
        <section style={{ paddingBottom: "96px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {serviceData.map((category) => (
                <div
                  key={category.name}
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "#1a1a1a",
                  }}
                >
                  {/* Category Header */}
                  <button
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === category.name ? null : category.name
                      )
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "24px",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontSize: "24px" }}>{category.icon}</span>
                      <div>
                        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: 0 }}>{category.name}</h2>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", margin: "4px 0 0 0" }}>
                          {category.services.length} {category.services.length === 1 ? "service" : "services"}
                        </p>
                      </div>
                    </div>
                    {expandedCategory === category.name ? (
                      <ChevronUp style={{ width: "20px", height: "20px", color: "#f472b6" }} />
                    ) : (
                      <ChevronDown style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                    )}
                  </button>

                  {/* Category Content */}
                  {expandedCategory === category.name && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      {category.services.map((service) => (
                        <div key={service.name}>
                          {category.services.length > 1 ? (
                            <>
                              <button
                                onClick={() =>
                                  setExpandedService(
                                    expandedService === service.name ? null : service.name
                                  )
                                }
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "24px",
                                  paddingLeft: "64px",
                                  textAlign: "left",
                                  background: "transparent",
                                  border: "none",
                                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ fontWeight: 600, color: "white" }}>{service.name}</span>
                                {expandedService === service.name ? (
                                  <ChevronUp style={{ width: "16px", height: "16px", color: "#f472b6" }} />
                                ) : (
                                  <ChevronDown style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.4)" }} />
                                )}
                              </button>
                              {expandedService === service.name && (
                                <div style={{ padding: "24px", paddingLeft: "64px" }}>
                                  <PricingTable pricing={service.pricing} />
                                  {service.note && (
                                    <p style={{ marginTop: "12px", fontSize: "12px", color: "rgba(249, 168, 212, 0.7)", fontStyle: "italic" }}>{service.note}</p>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ padding: "24px", paddingLeft: "64px" }}>
                              <PricingTable pricing={service.pricing} />
                              {service.note && (
                                <p style={{ marginTop: "12px", fontSize: "12px", color: "rgba(249, 168, 212, 0.7)", fontStyle: "italic" }}>{service.note}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ marginTop: "64px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "24px" }}>
                Ready to book your appointment?
              </p>
              <Link href="/book">
                <button
                  style={{
                    background: "#ec4899",
                    color: "white",
                    border: "none",
                    padding: "12px 32px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Book Now
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
