"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Crown, KeyRound, Loader2, ShieldAlert, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A row from GET /api/admin/staff. */
interface Stylist {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  instagram: string | null;
  is_owner: boolean;
  user_id: string | null;
}

interface StaffDraft {
  name: string;
  email: string;
  phone: string;
  bio: string;
}

/** Sign-in details returned once by POST — surfaced for the owner to share. */
interface NewCredentials {
  name: string;
  email: string;
  tempPassword: string;
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function emptyDraft(): StaffDraft {
  return { name: "", email: "", phone: "", bio: "" };
}

export function AdminStaff() {
  const [staff, setStaff] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<StaffDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<NewCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/staff");
      if (res.status === 403) {
        setForbidden(true);
        setStaff([]);
        return;
      }
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setLoadError(
          isRecord(data) && typeof data.error === "string" ? data.error : `Request failed (${res.status})`
        );
        return;
      }
      setStaff(isRecord(data) && Array.isArray(data.staff) ? (data.staff as Stylist[]) : []);
    } catch {
      setLoadError("Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setFormError(null);
    setDraft(emptyDraft());
  }

  function updateDraft(patch: Partial<StaffDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function submitDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!email) {
      setFormError("Email is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(
        "/api/admin/staff",
        jsonInit("POST", { name, email, phone: draft.phone.trim(), bio: draft.bio.trim() })
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(
          isRecord(data) && typeof data.error === "string" ? data.error : `Request failed (${res.status})`
        );
        return;
      }
      const tempPassword = isRecord(data) && typeof data.tempPassword === "string" ? data.tempPassword : "";
      setCredentials({ name, email, tempPassword });
      setCopied(false);
      setDraft(null);
      await load();
    } catch {
      setFormError("Could not add stylist. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(credentials.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the password stays visible and selectable above.
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold">Staff</h2>
        </div>
        {!forbidden && !loading && (
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={openCreate}>
            <UserPlus className="mr-1 h-4 w-4" />
            Add stylist
          </Button>
        )}
      </div>

      {!forbidden && (
        <p className="mb-4 text-sm text-muted-foreground">
          Each stylist logs in at <span className="font-medium text-foreground">/admin</span> and sees only their own
          calendar, clients, and services.
        </p>
      )}

      {credentials && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-brand-700">
              <KeyRound className="h-5 w-5" />
              Stylist added — share these sign-in details
            </div>
            <Button size="icon" variant="ghost" aria-label="Dismiss" onClick={() => setCredentials(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {credentials.name} can now sign in at <span className="font-medium text-foreground">/admin</span> with email{" "}
            <span className="font-medium text-foreground">{credentials.email}</span> and this temporary password — share
            it with them; they can change it later. It is shown only once.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 select-all rounded-lg border border-brand-200 bg-background px-3 py-2 font-mono text-base font-semibold tracking-wide">
              {credentials.tempPassword}
            </code>
            <Button className="bg-brand-500 hover:bg-brand-600 sm:w-auto" onClick={copyPassword}>
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy password
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : forbidden ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Only the salon owner can manage staff.</p>
        </div>
      ) : loadError ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      ) : staff.length === 0 ? (
        <p className="rounded-xl border border-border py-16 text-center text-muted-foreground">
          No stylists yet. Add your first team member.
        </p>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  {s.is_owner && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.email}
                  {s.phone ? ` · ${s.phone}` : ""}
                  {s.instagram ? ` · @${s.instagram.replace(/^@/, "")}` : ""}
                </div>
                {s.bio && <p className="mt-2 max-w-prose text-sm text-muted-foreground">{s.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add stylist</h2>
              <Button size="icon" variant="ghost" aria-label="Close" onClick={() => setDraft(null)} disabled={saving}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              This creates their /admin login and shows a temporary password for you to share. They can change it after
              signing in.
            </p>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitDraft();
              }}
            >
              <Field label="Name">
                <input
                  className={inputClass}
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                  placeholder="e.g. Bianca"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={draft.email}
                  onChange={(e) => updateDraft({ email: e.target.value })}
                  placeholder="bianca@example.com"
                />
              </Field>

              <Field label="Phone (optional)">
                <input
                  type="tel"
                  className={inputClass}
                  value={draft.phone}
                  onChange={(e) => updateDraft({ phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </Field>

              <Field label="Bio (optional)">
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={draft.bio}
                  onChange={(e) => updateDraft({ bio: e.target.value })}
                  placeholder="Short intro shown to clients"
                />
              </Field>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="mr-1 h-4 w-4" />
                      Add stylist
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
