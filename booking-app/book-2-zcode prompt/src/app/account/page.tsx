"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDollars, formatDate } from "@/lib/utils";
import { Calendar, Clock, Scissors, Search, X } from "lucide-react";
import Link from "next/link";

interface LocalAppointment {
  id: string;
  serviceName: string;
  sizeName: string;
  lengthName: string;
  date: string;
  startTime: string;
  clientName: string;
  clientEmail: string;
  price: number;
  deposit: number;
  status: string;
  createdAt: string;
}

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [appointments, setAppointments] = useState<LocalAppointment[]>([]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const all = JSON.parse(localStorage.getItem("queeng_appointments") || "[]") as LocalAppointment[];
    const filtered = all.filter((a) => a.clientEmail.toLowerCase() === email.toLowerCase());
    setAppointments(filtered);
    setSearched(true);
  }

  function handleCancelAppointment(appointmentId: string) {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    const all = JSON.parse(localStorage.getItem("queeng_appointments") || "[]") as LocalAppointment[];
    const updated = all.map((a) =>
      a.id === appointmentId ? { ...a, status: "cancelled" } : a
    );
    localStorage.setItem("queeng_appointments", JSON.stringify(updated));
    window.dispatchEvent(new Event("queeng:appointments-updated"));
    const filtered = updated.filter((a) => a.clientEmail.toLowerCase() === email.toLowerCase());
    setAppointments(filtered);
  }

  const upcoming = appointments.filter(
    (a) => new Date(a.date) >= new Date() && (a.status === "pending" || a.status === "confirmed")
  );

  const past = appointments.filter(
    (a) => new Date(a.date) < new Date() || a.status === "completed" || a.status === "no_show" || a.status === "cancelled"
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">My Appointments</h1>

          {/* Email Lookup */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Look Up Your Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>
            </CardContent>
          </Card>

          {searched && (
            <>
              {appointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No appointments found for {email}</p>
                    <Link href="/book" className="mt-4 inline-block">
                      <Button variant="outline">Book Now</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Upcoming */}
                  <section className="mb-12">
                    <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
                    {upcoming.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">No upcoming appointments</p>
                          <Link href="/book" className="mt-4 inline-block">
                            <Button variant="outline">Book Now</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {upcoming.map((a) => (
                          <Card key={a.id}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <div className="bg-primary/10 p-3 rounded-lg">
                                    <Scissors className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold">{a.serviceName}</h3>
                                    {a.sizeName && <p className="text-sm text-muted-foreground">Size: {a.sizeName}</p>}
                                    {a.lengthName && <p className="text-sm text-muted-foreground">Length: {a.lengthName}</p>}
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(a.date)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {a.startTime}
                                      </span>
                                    </div>
                                    <p className="text-sm mt-1"><strong>Price:</strong> {formatDollars(a.price)}</p>
                                    <span
                                      className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                        a.status === "confirmed"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-yellow-100 text-yellow-700"
                                      }`}
                                    >
                                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-3 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleCancelAppointment(a.id)}
                                    >
                                      <X className="h-3 w-3 mr-1" /> Cancel Appointment
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Past */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Past Appointments</h2>
                    {past.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">No past appointments</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {past.map((a) => (
                          <Card key={a.id}>
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="bg-muted p-3 rounded-lg">
                                  <Scissors className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{a.serviceName}</h3>
                                  {a.sizeName && <p className="text-sm text-muted-foreground">Size: {a.sizeName}</p>}
                                  {a.lengthName && <p className="text-sm text-muted-foreground">Length: {a.lengthName}</p>}
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(a.date)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {a.startTime}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1"><strong>Price:</strong> {formatDollars(a.price)}</p>
                                  <span
                                    className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                      a.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : a.status === "cancelled" || a.status === "no_show"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {a.status.charAt(0).toUpperCase() + a.status.slice(1).replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
