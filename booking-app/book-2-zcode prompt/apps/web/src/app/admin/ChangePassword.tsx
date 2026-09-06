"use client";

import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }

    const res = await fetch("/api/admin/change-password", { method: "POST" });
    if (!res.ok) {
      setBusy(false);
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not finish updating your account. Please try again.");
      return;
    }

    // Reload into the dashboard now that the flag is cleared.
    window.location.reload();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-20">
      <div className="mb-6 text-center">
        <KeyRound className="mx-auto mb-2 h-8 w-8 text-brand-500" />
        <h1 className="text-xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password to finish setting up your account.
        </p>
      </div>
      <div className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border p-3"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full rounded-lg border border-border p-3"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={busy} onClick={submit}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save password"
          )}
        </Button>
      </div>
    </div>
  );
}
