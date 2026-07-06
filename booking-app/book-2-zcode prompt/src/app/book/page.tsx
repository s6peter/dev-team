"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Calendar, Clock, Check, Upload } from "lucide-react";
import type { Service, ServiceTier } from "@/types";

type Step = "service" | "datetime" | "intake" | "payment" | "confirmation";

interface FormData {
  serviceId: string;
  serviceTierId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  inspirationPhotos: string[];
  notes: string;
}

const availableDates = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i + 1);
  if (date.getDay() === 0) date.setDate(date.getDate() + 1); // Skip Sundays
  return date.toISOString().split("T")[0];
});

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

function BookContent() {
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service");

  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<(Service & { service_tiers: ServiceTier[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    serviceId: preselectedService || "",
    serviceTierId: "",
    date: "",
    startTime: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    inspirationPhotos: [],
    notes: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (preselectedService) {
      setFormData((prev) => ({ ...prev, serviceId: preselectedService }));
    }
  }, [preselectedService]);

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

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedTier = selectedService?.service_tiers?.find(
    (t) => t.id === formData.serviceTierId
  );

  const calculatePrice = useCallback(() => {
    if (!selectedService) return 0;
    const basePrice = selectedService.base_price;
    const addon = selectedTier?.price_addon || 0;
    const totalPrice = basePrice + addon;
    const tax = Math.round(totalPrice * selectedService.tax_rate);
    const deposit = Math.round((totalPrice + tax) * (selectedService.deposit_percent / 100));
    return deposit;
  }, [selectedService, selectedTier]);

  const canProceed = () => {
    switch (step) {
      case "service":
        return formData.serviceId !== "";
      case "datetime":
        return formData.date !== "" && formData.startTime !== "";
      case "intake":
        return (
          formData.clientName !== "" &&
          formData.clientEmail !== "" &&
          formData.clientPhone !== ""
        );
      case "payment":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    const steps: Step[] = ["service", "datetime", "intake", "payment", "confirmation"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ["service", "datetime", "intake", "payment", "confirmation"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    // In production, this would create the appointment and process payment
    console.log("Booking submitted:", formData);
    setStep("confirmation");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading booking form...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {["Service", "Date & Time", "Your Info", "Payment", "Done"].map(
                (label, index) => (
                  <div key={label} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        step === ["service", "datetime", "intake", "payment", "confirmation"][index]
                          ? "bg-primary text-primary-foreground"
                          : index <
                            ["service", "datetime", "intake", "payment", "confirmation"].indexOf(step)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index <
                      ["service", "datetime", "intake", "payment", "confirmation"].indexOf(step) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="hidden sm:block ml-2 text-sm font-medium">
                      {label}
                    </span>
                    {index < 4 && (
                      <div className="hidden sm:block w-8 h-0.5 bg-muted mx-2" />
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                {step === "service" && "Select a Service"}
                {step === "datetime" && "Choose Date & Time"}
                {step === "intake" && "Your Information"}
                {step === "payment" && "Review & Pay Deposit"}
                {step === "confirmation" && "Booking Confirmed!"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Service Selection */}
              {step === "service" && (
                <div className="space-y-4">
                  <Select
                    value={formData.serviceId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, serviceId: value, serviceTierId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - From {formatCurrency(service.base_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedService && (
                    <div className="mt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {selectedService.description}
                      </p>

                      {selectedService.service_tiers &&
                        selectedService.service_tiers.length > 0 && (
                          <div>
                            <Label className="mb-3 block">Select Size/Length:</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {selectedService.service_tiers.map((tier) => (
                                <button
                                  key={tier.id}
                                  type="button"
                                  onClick={() =>
                                    setFormData({ ...formData, serviceTierId: tier.id })
                                  }
                                  className={`border rounded-lg p-4 text-left transition-colors ${
                                    formData.serviceTierId === tier.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <p className="font-medium">{tier.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {tier.description}
                                  </p>
                                  <p className="text-sm text-primary mt-1">
                                    {tier.price_addon > 0
                                      ? `+${formatCurrency(tier.price_addon)}`
                                      : tier.price_addon < 0
                                      ? `${formatCurrency(tier.price_addon)}`
                                      : "Base price"}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="bg-accent/50 rounded-lg p-4 mt-4">
                        <p className="text-sm">
                          <strong>Duration:</strong>{" "}
                          {Math.floor(selectedService.duration_minutes / 60)}h{" "}
                          {selectedService.duration_minutes % 60 > 0 &&
                            `${selectedService.duration_minutes % 60}m`}
                        </p>
                        <p className="text-sm">
                          <strong>Deposit required:</strong>{" "}
                          {selectedService.deposit_percent}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Selection */}
              {step === "datetime" && (
                <div className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Select a Date:</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {availableDates.map((date) => {
                        const dateObj = new Date(date);
                        const dayName = dateObj.toLocaleDateString("en-US", {
                          weekday: "short",
                        });
                        const dayNum = dateObj.getDate();
                        const isSelected = formData.date === date;

                        return (
                          <button
                            key={date}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, date, startTime: "" })
                            }
                            className={`border rounded-lg p-2 text-center transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <p className="text-xs">{dayName}</p>
                            <p className="text-lg font-medium">{dayNum}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {formData.date && (
                    <div>
                      <Label className="mb-3 block">Select a Time:</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                        {timeSlots.map((time) => {
                          const isSelected = formData.startTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, startTime: time })
                              }
                              className={`border rounded-lg p-3 text-center transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Intake Form */}
              {step === "intake" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Full Name *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) =>
                        setFormData({ ...formData, clientName: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, clientEmail: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Phone *</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, clientPhone: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Additional Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={4}
                      placeholder="Any allergies, preferences, or special requests..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Inspiration Photos (optional)</Label>
                    <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Review */}
              {step === "payment" && selectedService && (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span>{selectedService.name}</span>
                      </div>
                      {selectedTier && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size/Length:</span>
                          <span>{selectedTier.name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{formatDate(formData.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span>{formData.startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Client:</span>
                        <span>{formData.clientName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold">Payment Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Price:</span>
                        <span>{formatCurrency(selectedService.base_price)}</span>
                      </div>
                      {selectedTier && selectedTier.price_addon !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size Add-on:</span>
                          <span>
                            {selectedTier.price_addon > 0 ? "+" : ""}
                            {formatCurrency(selectedTier.price_addon)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>
                          {formatCurrency(
                            Math.round(
                              (selectedService.base_price +
                                (selectedTier?.price_addon || 0)) *
                                selectedService.tax_rate
                          )
                        )}
                        </span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Deposit Due Now:</span>
                          <span className="text-primary">
                            {formatCurrency(calculatePrice())}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Balance ({formatCurrency(
                            selectedService.base_price +
                              (selectedTier?.price_addon || 0) -
                              Math.round(
                                (selectedService.base_price +
                                  (selectedTier?.price_addon || 0)) *
                                  (selectedService.deposit_percent / 100)
                              )
                          )}) paid in person
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      By proceeding, you agree to our booking policy. The deposit
                      is non-refundable within 24 hours of the appointment.
                      Balance is due in person on the day of service.
                    </p>
                  </div>
                </div>
              )}

              {/* Confirmation */}
              {step === "confirmation" && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Booking Request Submitted!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Your appointment request has been received. You&apos;ll
                    receive a confirmation email once your appointment is
                    approved.
                  </p>
                  <div className="border rounded-lg p-4 text-left max-w-sm mx-auto">
                    <p className="text-sm">
                      <strong>Service:</strong> {selectedService?.name}
                    </p>
                    <p className="text-sm">
                      <strong>Date:</strong> {formatDate(formData.date)}
                    </p>
                    <p className="text-sm">
                      <strong>Time:</strong> {formData.startTime}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          {step !== "confirmation" && (
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === "service"}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {step === "payment" ? (
                <Button onClick={handleSubmit} disabled={!canProceed()}>
                  Pay Deposit & Book
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <BookContent />
    </Suspense>
  );
}
