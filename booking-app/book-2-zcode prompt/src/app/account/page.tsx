"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";
import { Calendar, Clock, Scissors, User } from "lucide-react";
import Link from "next/link";
import type { Appointment, Service } from "@/types";

export default function AccountPage() {
  const [appointments, setAppointments] = useState<(Appointment & { service: Service })[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setEmail(session.user.email);
      setIsSignedIn(true);
      fetchAppointments(session.user.email);
    } else {
      setLoading(false);
    }
  }

  async function fetchAppointments(userEmail: string) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (client) {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, service:services(*)")
        .eq("client_id", client.id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching appointments:", error);
      } else {
        setAppointments(data || []);
      }
    }
    setLoading(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      console.error("Error signing in:", error);
    } else {
      alert("Check your email for a magic link!");
    }
  }

  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.date) >= new Date() && (a.status === "pending" || a.status === "confirmed")
  );

  const pastAppointments = appointments.filter(
    (a) => new Date(a.date) < new Date() || a.status === "completed" || a.status === "no_show" || a.status === "cancelled"
  );

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Sign In to Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="mt-2"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Send Magic Link
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-4">
                We&apos;ll send you a magic link to sign in without a password.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Appointments</h1>
              <p className="text-muted-foreground mt-1">Welcome back!</p>
            </div>
            <Link href="/book">
              <Button>Book New Appointment</Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading appointments...</p>
            </div>
          ) : (
            <>
              {/* Upcoming Appointments */}
              <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
                {upcomingAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No upcoming appointments</p>
                      <Link href="/book" className="mt-4 inline-block">
                        <Button variant="outline">Book Now</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {upcomingAppointments.map((appointment) => (
                      <Card key={appointment.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="bg-primary/10 p-3 rounded-lg">
                                <Scissors className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {appointment.service?.name}
                                </h3>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(appointment.date)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {appointment.start_time}
                                  </span>
                                </div>
                                <span
                                  className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                    appointment.status === "confirmed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {appointment.status.charAt(0).toUpperCase() +
                                    appointment.status.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* Past Appointments */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Past Appointments</h2>
                {pastAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No past appointments</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pastAppointments.map((appointment) => (
                      <Card key={appointment.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="bg-muted p-3 rounded-lg">
                              <Scissors className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {appointment.service?.name}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(appointment.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {appointment.start_time}
                                </span>
                              </div>
                              <span
                                className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                  appointment.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : appointment.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {appointment.status.charAt(0).toUpperCase() +
                                  appointment.status.slice(1).replace("_", " ")}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
