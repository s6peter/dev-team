"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
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
import { formatDollars, formatDate, formatTime } from "@/lib/utils";
import {
  loadPricingData,
  subscribeToPricingDataChanges,
  type CategoryPricing,
} from "@/lib/pricing-data";
import {
  loadBookingSettings,
  loadAppointments,
  getAvailabilityForDate,
  getMonthCalendarDates,
  toDateString,
  formatTimeLabel,
  type BookingSettings,
  type AvailabilitySummary,
} from "@/lib/booking-data";
import { ArrowLeft, ArrowRight, Check, Upload, ChevronLeft, ChevronRight } from "lucide-react";

type Step = "service" | "datetime" | "intake" | "payment" | "confirmation";

interface FormData {
  category: string;
  serviceId: string;
  sizeId: string;
  lengthId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  inspirationPhotos: string[];
  notes: string;
}

const DEPOSIT = 40;
const TAX_RATE = 0.0825;
const DEFAULT_DURATION = 240;

function BookContent() {
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams.get("category");

  const [step, setStep] = useState<Step>("service");
  const [pricingData, setPricingData] = useState<CategoryPricing[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary | null>(null);
  const [formData, setFormData] = useState<FormData>({
    category: preselectedCategory || "",
    serviceId: "",
    sizeId: "",
    lengthId: "",
    date: "",
    startTime: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    inspirationPhotos: [],
    notes: "",
  });

  useEffect(() => {
    const refreshPricing = () => {
      setPricingData(loadPricingData());
    };

    refreshPricing();

    return subscribeToPricingDataChanges(refreshPricing);
  }, []);

  useEffect(() => {
    setBookingSettings(loadBookingSettings());
  }, []);

  useEffect(() => {
    if (!formData.date || !bookingSettings) {
      setAvailabilitySummary(null);
      return;
    }
    const settings = bookingSettings;
    const allAppointments = loadAppointments();
    const summary = getAvailabilityForDate({
      settings,
      appointments: allAppointments,
      date: formData.date,
      durationMinutes: DEFAULT_DURATION,
    });
    setAvailabilitySummary(summary);
    if (!summary.slots.includes(formData.startTime)) {
      setFormData((prev) => ({ ...prev, startTime: "" }));
    }
  }, [formData.date, bookingSettings]);

  useEffect(() => {
    if (pricingData.length === 0) return;

    setFormData((previous) => {
      const category = pricingData.find((item) => item.name === previous.category);
      if (!category) {
        if (
          previous.category === "" &&
          previous.serviceId === "" &&
          previous.sizeId === "" &&
          previous.lengthId === ""
        ) {
          return previous;
        }

        return {
          ...previous,
          category: "",
          serviceId: "",
          sizeId: "",
          lengthId: "",
        };
      }

      const service = category.services.find((item) => item.id === previous.serviceId);
      if (!service) {
        if (previous.serviceId === "" && previous.sizeId === "" && previous.lengthId === "") {
          return previous;
        }

        return {
          ...previous,
          serviceId: "",
          sizeId: "",
          lengthId: "",
        };
      }

      const size = service.pricing.find((item) => item.size === previous.sizeId);
      if (!size) {
        if (previous.sizeId === "" && previous.lengthId === "") {
          return previous;
        }

        return {
          ...previous,
          sizeId: "",
          lengthId: "",
        };
      }

      const needsLength =
        size.lengths.length > 1 &&
        size.lengths[0].label !== "Starting at" &&
        size.lengths[0].label !== "Price";

      if (!needsLength) {
        if (previous.lengthId === "") {
          return previous;
        }

        return {
          ...previous,
          lengthId: "",
        };
      }

      if (previous.lengthId === "") {
        return previous;
      }

      const hasSelectedLength = size.lengths.some((item) => item.label === previous.lengthId);
      if (hasSelectedLength) {
        return previous;
      }

      return {
        ...previous,
        lengthId: "",
      };
    });
  }, [pricingData]);

  const selectedCategory = pricingData.find((c) => c.name === formData.category);
  const selectedService = selectedCategory?.services.find((s) => s.id === formData.serviceId);
  const selectedSize = selectedService?.pricing.find((r) => r.size === formData.sizeId);
  const selectedLength = selectedSize?.lengths.find((l) => l.label === formData.lengthId);

  const hasLengths = selectedSize && selectedSize.lengths.length > 1 && selectedSize.lengths[0].label !== "Starting at" && selectedSize.lengths[0].label !== "Price";

  const getFinalPrice = useCallback((): number => {
    if (!selectedService) return 0;
    if (selectedLength) return selectedLength.price;
    if (selectedSize && selectedSize.lengths.length === 1) return selectedSize.lengths[0].price;
    return 0;
  }, [selectedSize, selectedLength, selectedService]);

  const calculateDeposit = useCallback(() => {
    const tax = Math.round(DEPOSIT * TAX_RATE);
    return DEPOSIT + tax;
  }, []);

  const canProceed = () => {
    switch (step) {
      case "service":
        if (!formData.serviceId) return false;
        if (selectedSize) {
          if (hasLengths) return formData.lengthId !== "";
          return true;
        }
        return false;
      case "datetime":
        return formData.date !== "" && formData.startTime !== "";
      case "intake":
        return formData.clientName !== "" && formData.clientEmail !== "" && formData.clientPhone !== "";
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
    if (currentIndex < steps.length - 1) setStep(steps[currentIndex + 1]);
  };

  const handleBack = () => {
    const steps: Step[] = ["service", "datetime", "intake", "payment", "confirmation"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) setStep(steps[currentIndex - 1]);
  };

  const handleSubmit = async () => {
    const price = getFinalPrice();
    const appointment = {
      id: crypto.randomUUID(),
      category: formData.category,
      serviceId: formData.serviceId,
      serviceName: selectedService?.name || "",
      sizeId: formData.sizeId,
      sizeName: selectedSize?.size || "",
      lengthId: formData.lengthId,
      lengthName: selectedLength?.label || "",
      date: formData.date,
      startTime: formData.startTime,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      notes: formData.notes,
      price,
      deposit: calculateDeposit(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem("queeng_appointments") || "[]");
      if (!Array.isArray(existing)) throw new Error("invalid");
      existing.push(appointment);
      localStorage.setItem("queeng_appointments", JSON.stringify(existing));
    } catch {
      localStorage.setItem("queeng_appointments", JSON.stringify([appointment]));
    }

    window.dispatchEvent(new Event("queeng:appointments-updated"));
    setStep("confirmation");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {["Service", "Date & Time", "Your Info", "Payment", "Done"].map((label, index) => {
                const stepKeys: Step[] = ["service", "datetime", "intake", "payment", "confirmation"];
                return (
                  <div key={label} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        step === stepKeys[index]
                          ? "bg-primary text-primary-foreground"
                          : index < stepKeys.indexOf(step)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index < stepKeys.indexOf(step) ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className="hidden sm:block ml-2 text-sm font-medium">{label}</span>
                    {index < 4 && <div className="hidden sm:block w-8 h-0.5 bg-muted mx-2" />}
                  </div>
                );
              })}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === "service" && "Select a Service"}
                {step === "datetime" && "Choose Date & Time"}
                {step === "intake" && "Your Information"}
                {step === "payment" && "Review & Pay Deposit"}
                {step === "confirmation" && ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === "service" && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Step 1: Choose a Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value, serviceId: "", sizeId: "", lengthId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingData.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory && (
                    <div>
                      <Label className="mb-2 block">Step 2: Choose a Service</Label>
                      <Select
                        value={formData.serviceId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, serviceId: value, sizeId: "", lengthId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCategory.services.map((svc) => (
                            <SelectItem key={svc.id} value={svc.id}>
                              {svc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedService && (
                    <div className="mt-6 space-y-4">
                      <Label className="mb-2 block">Select Size:</Label>
                      <Select
                        value={formData.sizeId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sizeId: value, lengthId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a size" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedService.pricing.map((row) => (
                            <SelectItem key={row.size} value={row.size}>
                              {row.size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedSize && hasLengths && (
                        <div>
                          <Label className="mb-2 block">Select Length:</Label>
                          <Select
                            value={formData.lengthId}
                            onValueChange={(value) =>
                              setFormData({ ...formData, lengthId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a length" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedSize.lengths.map((length) => (
                                <SelectItem key={length.label} value={length.label}>
                                  {length.label} - {formatDollars(length.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedSize && !hasLengths && selectedSize.lengths.length === 1 && (
                        <div className="bg-accent/50 rounded-lg p-4">
                          <p className="text-sm font-medium">{selectedSize.size}</p>
                          <p className="text-xs text-muted-foreground mt-1">{selectedSize.lengths[0].label}: {formatDollars(selectedSize.lengths[0].price)}</p>
                        </div>
                      )}

                      <div className="bg-accent/50 rounded-lg p-4 mt-4">
                        {selectedLength ? (
                          <p className="text-sm">
                            <strong>Price:</strong> {formatDollars(selectedLength.price)}
                          </p>
                        ) : selectedSize && selectedSize.lengths.length === 1 ? (
                          <p className="text-sm">
                            <strong>Price:</strong> {formatDollars(selectedSize.lengths[0].price)}
                          </p>
                        ) : selectedSize ? (
                          <p className="text-sm text-muted-foreground">Select a length to see price</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Select a size to see price</p>
                        )}
                        <p className="text-sm">
                          <strong>Deposit required:</strong> {formatDollars(DEPOSIT)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === "datetime" && (
                <div className="space-y-6">
                  {/* Month Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const prev = new Date(currentMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setCurrentMonth(prev);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Label className="text-base font-medium">
                        {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = new Date(currentMonth);
                          next.setMonth(next.getMonth() + 1);
                          setCurrentMonth(next);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getMonthCalendarDates(currentMonth).map((date) => {
                        const dateObj = new Date(`${date}T12:00:00`);
                        const dayNum = dateObj.getDate();
                        const isCurrentMonth = dateObj.getMonth() === currentMonth.getMonth();
                        const isPast = date < toDateString(new Date());
                        const isSelected = formData.date === date;

                        let isAvailable = false;
                        if (bookingSettings && !isPast && isCurrentMonth) {
                          const summary = getAvailabilityForDate({
                            settings: bookingSettings,
                            appointments: loadAppointments(),
                            date,
                            durationMinutes: DEFAULT_DURATION,
                          });
                          isAvailable = summary.available;
                        }

                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={!isAvailable || !isCurrentMonth}
                            onClick={() => setFormData({ ...formData, date, startTime: "" })}
                            className={`border rounded-lg p-1.5 text-center transition-colors ${
                              !isCurrentMonth
                                ? "opacity-30 cursor-default"
                                : isPast
                                ? "opacity-40 cursor-not-allowed"
                                : isAvailable
                                ? isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/50 cursor-pointer"
                                : "border-border opacity-40 cursor-not-allowed"
                            }`}
                          >
                            <p className="text-sm">{dayNum}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {formData.date && availabilitySummary && (
                    <div>
                      <Label className="mb-3 block">
                        Available Times for {formatDate(formData.date)}:
                      </Label>
                      {availabilitySummary.slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          {availabilitySummary.reason || "No available times for this date."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                          {availabilitySummary.slots.map((time) => {
                            const isSelected = formData.startTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setFormData({ ...formData, startTime: time })}
                                className={`border rounded-lg p-3 text-center transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                {formatTimeLabel(time)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === "intake" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Full Name *</Label>
                    <Input id="clientName" value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input id="clientEmail" type="email" value={formData.clientEmail} onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })} className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Phone *</Label>
                    <Input id="clientPhone" type="tel" value={formData.clientPhone} onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })} className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Additional Notes (optional)</Label>
                    <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} placeholder="Any allergies, preferences, or special requests..." className="mt-2" />
                  </div>
                  <div>
                    <Label>Inspiration Photos (optional)</Label>
                    <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>
                </div>
              )}

              {step === "payment" && selectedService && (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span>{formData.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span>{selectedService.name}</span>
                      </div>
                      {selectedSize && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size:</span>
                          <span>{selectedSize.size}</span>
                        </div>
                      )}
                      {selectedLength && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Length:</span>
                          <span>{selectedLength.label}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{formatDate(formData.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span>{formatTime(`2000-01-01T${formData.startTime}:00`)}</span>
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
                        <span className="text-muted-foreground">Service Price:</span>
                        <span>{formatDollars(getFinalPrice())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposit:</span>
                        <span>{formatDollars(DEPOSIT)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax on deposit:</span>
                        <span>{formatDollars(Math.round(DEPOSIT * TAX_RATE))}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Deposit Due Now:</span>
                          <span className="text-primary">{formatDollars(calculateDeposit())}</span>
                        </div>
                        <p className="text-sm font-bold text-red-600 mt-1">
                          Balance ({formatDollars(Math.max(0, getFinalPrice() - DEPOSIT))}) paid in person
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      By proceeding, you agree to our booking policy. The deposit is non-refundable within 24 hours of the appointment. Balance is due in person on the day of service.
                    </p>
                  </div>
                </div>
              )}

              {step === "confirmation" && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Booking Request Submitted!</h3>
                  <p className="text-muted-foreground mb-6">
                    Your appointment request has been received. You&apos;ll receive a confirmation email once your appointment is approved.
                  </p>
                  <div className="border rounded-lg p-4 text-left max-w-sm mx-auto">
                    <p className="text-sm"><strong>Service:</strong> {selectedService?.name}</p>
                    {selectedSize && <p className="text-sm"><strong>Size:</strong> {selectedSize.size}</p>}
                    {selectedLength && <p className="text-sm"><strong>Length:</strong> {selectedLength.label}</p>}
                    <p className="text-sm"><strong>Date:</strong> {formatDate(formData.date)}</p>
                    <p className="text-sm"><strong>Time:</strong> {formatTime(`2000-01-01T${formData.startTime}:00`)}</p>
                  </div>
                  <Button className="mt-6" onClick={() => {
                    setStep("service");
                    setFormData({
                      category: "",
                      serviceId: "",
                      sizeId: "",
                      lengthId: "",
                      date: "",
                      startTime: "",
                      clientName: "",
                      clientEmail: "",
                      clientPhone: "",
                      inspirationPhotos: [],
                      notes: "",
                    });
                  }}>
                    Book Another Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {step !== "confirmation" && (
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack} disabled={step === "service"}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {step === "payment" ? (
                <Button onClick={handleSubmit} disabled={!canProceed()}>Pay Deposit & Book</Button>
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
