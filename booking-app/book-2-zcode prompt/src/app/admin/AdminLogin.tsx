"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-20">
      <div className="mb-6 text-center">
        <Lock className="mx-auto mb-2 h-8 w-8 text-brand-500" />
        <h1 className="text-xl font-bold">Salon Admin</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage bookings.</p>
      </div>
      <div className="space-y-3">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border p-3" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} className="w-full rounded-lg border border-border p-3" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={busy} onClick={signIn}>
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : "Sign in"}
        </Button>
      </div>
    </div>
  );
}
