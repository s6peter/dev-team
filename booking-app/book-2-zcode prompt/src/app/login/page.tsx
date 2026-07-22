"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="mb-2 text-2xl font-bold">Your appointments</h1>
        {sent ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-brand-500" />
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">We sent a sign-in link to <strong>{email}</strong>. (Local dev: open Mailpit at localhost:54324.)</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">Enter your email and we&apos;ll send you a secure sign-in link — no password needed.</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" className="w-full rounded-lg border border-border p-3" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={busy || !/^[^@]+@[^@]+\.[^@]+$/.test(email)} onClick={sendLink}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Email me a sign-in link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">Salon owner? <Link href="/admin" className="text-brand-600 underline">Admin sign in</Link></p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
