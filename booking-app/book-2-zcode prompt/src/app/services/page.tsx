"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { ChevronDown, ChevronUp, Crown, Sparkles } from "lucide-react";
import { loadPricingData, type CategoryPricing, type PricingRow } from "@/lib/pricing-data";

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
  const constExpandedService = useState<string | null>(null);
  const expandedService = constExpandedService[0];
  const setExpandedService = constExpandedService[1];
  const [serviceData, setServiceData] = useState<CategoryPricing[]>([]);

  useEffect(() => {
    setServiceData(loadPricingData());
  }, []);

  // Re-load when page becomes visible (navigating back from admin)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setServiceData(loadPricingData());
      }
    };
    const handleStorage = () => {
      setServiceData(loadPricingData());
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="dark-theme" style={{ minHeight: "100vh" }}>
      <Header />

      <main style={{ flex: 1 }}>
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

                  {expandedCategory === category.name && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      {category.services.map((service) => (
                        <div key={service.id || service.name}>
                          {category.services.length > 1 ? (
                            <>
                              <button
                                onClick={() =>
                                  setExpandedService(
                                    expandedService === (service.id || service.name) ? null : (service.id || service.name)
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
                                {expandedService === (service.id || service.name) ? (
                                  <ChevronUp style={{ width: "16px", height: "16px", color: "#f472b6" }} />
                                ) : (
                                  <ChevronDown style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.4)" }} />
                                )}
                              </button>
                              {expandedService === (service.id || service.name) && (
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
