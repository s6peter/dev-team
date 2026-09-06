"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Crown, ImagePlus, KeyRound, Loader2, Percent, ShieldAlert, User, UserPlus, Users, X } from "lucide-react";
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
  commission_rate: number;
  is_w2: boolean;
  tax_withholding_rate: number;
  avatar_url: string | null;
  is_active: boolean;
}

/** Editable payroll fields, held as percent strings while the owner types. */
interface PayrollDraft {
  commissionPct: string;
  isW2: boolean;
  withholdingPct: string;
}

/** Fraction (0-1) -> whole-percent string for display in a percent input. */
function fractionToPct(fraction: number): string {
  return String(Math.round(fraction * 1000) / 10);
}

/** Percent string -> fraction (0-1), clamped; returns null if not a valid number. */
function pctToFraction(pct: string): number | null {
  const n = Number(pct);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n / 100));
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

  // Per-stylist inline payroll editor.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payroll, setPayroll] = useState<PayrollDraft | null>(null);
  const [payrollSaving, setPayrollSaving] = useState(false);
  const [payrollError, setPayrollError] = useState<string | null>(null);

  // Per-stylist avatar upload state.
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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

  function openPayroll(s: Stylist) {
    setPayrollError(null);
    setEditingId(s.id);
    setPayroll({
      commissionPct: fractionToPct(s.commission_rate),
      isW2: s.is_w2,
      withholdingPct: fractionToPct(s.tax_withholding_rate),
    });
  }

  function closePayroll() {
    setEditingId(null);
    setPayroll(null);
    setPayrollError(null);
  }

  function updatePayroll(patch: Partial<PayrollDraft>) {
    setPayroll((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function savePayroll(stylistId: string) {
    if (!payroll) return;
    const commission_rate = pctToFraction(payroll.commissionPct);
    if (commission_rate === null) {
      setPayrollError("Enter a valid commission percent.");
      return;
    }
    const tax_withholding_rate = pctToFraction(payroll.withholdingPct);
    if (payroll.isW2 && tax_withholding_rate === null) {
      setPayrollError("Enter a valid withholding percent.");
      return;
    }
    setPayrollSaving(true);
    setPayrollError(null);
    try {
      const res = await fetch(
        "/api/admin/staff",
        jsonInit("PATCH", {
          stylistId,
          commission_rate,
          is_w2: payroll.isW2,
          // Withholding only matters for W2; still persist the entered value when present.
          tax_withholding_rate: tax_withholding_rate ?? 0,
        })
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setPayrollError(
          isRecord(data) && typeof data.error === "string" ? data.error : `Request failed (${res.status})`
        );
        return;
      }
      closePayroll();
      await load();
    } catch {
      setPayrollError("Could not save. Please try again.");
    } finally {
      setPayrollSaving(false);
    }
  }

  async function toggleActive(stylistId: string, next: boolean) {
    await fetch("/api/admin/staff", jsonInit("PATCH", { stylistId, is_active: next }));
    await load();
  }

  async function removeStylist(st: Stylist) {
    if (!confirm(`Permanently remove ${st.name}? This deletes their account, calendar, services, clients and all their data. This cannot be undone.`)) return;
    const res = await fetch("/api/admin/staff", jsonInit("DELETE", { stylistId: st.id }));
    if (!res.ok) {
      const d: unknown = await res.json().catch(() => null);
      alert(isRecord(d) && typeof d.error === "string" ? d.error : "Could not remove stylist.");
      return;
    }
    await load();
  }

  async function uploadAvatar(stylistId: string, file: File) {
    setUploadingId(stylistId);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const upData: unknown = await upRes.json().catch(() => null);
      if (!upRes.ok || !(isRecord(upData) && typeof upData.url === "string")) {
        setUploadError({
          id: stylistId,
          message:
            isRecord(upData) && typeof upData.error === "string" ? upData.error : `Upload failed (${upRes.status})`,
        });
        return;
      }
      const patchRes = await fetch(
        "/api/admin/staff",
        jsonInit("PATCH", { stylistId, avatar_url: upData.url })
      );
      const patchData: unknown = await patchRes.json().catch(() => null);
      if (!patchRes.ok) {
        setUploadError({
          id: stylistId,
          message:
            isRecord(patchData) && typeof patchData.error === "string"
              ? patchData.error
              : `Request failed (${patchRes.status})`,
        });
        return;
      }
      await load();
    } catch {
      setUploadError({ id: stylistId, message: "Could not upload photo. Please try again." });
    } finally {
      setUploadingId(null);
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
            <div key={s.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {s.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar_url} alt={`${s.name}'s photo`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <User className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={(el) => {
                        fileInputs.current[s.id] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAvatar(s.id, file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto px-1 py-0.5 text-xs"
                      disabled={uploadingId === s.id}
                      onClick={() => fileInputs.current[s.id]?.click()}
                    >
                      {uploadingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="mr-1 h-3.5 w-3.5" />
                          {s.avatar_url ? "Change" : "Upload photo"}
                        </>
                      )}
                    </Button>
                  </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    {s.is_owner && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                        <Crown className="h-3 w-3" />
                        Owner
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Suspended</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {s.email}
                    {s.phone ? ` · ${s.phone}` : ""}
                    {s.instagram ? ` · @${s.instagram.replace(/^@/, "")}` : ""}
                  </div>
                  {s.bio && <p className="mt-2 max-w-prose text-sm text-muted-foreground">{s.bio}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                      <Percent className="h-3 w-3" />
                      {fractionToPct(s.commission_rate)}% commission
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                      {s.is_w2 ? "W-2 employee" : "1099 contractor"}
                    </span>
                    {s.is_w2 && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                        {fractionToPct(s.tax_withholding_rate)}% withholding
                      </span>
                    )}
                  </div>
                  {uploadError?.id === s.id && (
                    <p className="mt-2 text-xs text-red-600">{uploadError.message}</p>
                  )}
                </div>
                </div>
                {editingId !== s.id && (
                  <div className="flex flex-shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPayroll(s)}>Edit pay</Button>
                    {!s.is_owner && (
                      <Button size="sm" variant="outline" className={s.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"} onClick={() => toggleActive(s.id, !s.is_active)}>
                        {s.is_active ? "Suspend" : "Enable"}
                      </Button>
                    )}
                    {!s.is_owner && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => removeStylist(s)}>
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {editingId === s.id && payroll && (
                <form
                  className="mt-4 space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    savePayroll(s.id);
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Commission %">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        className={inputClass}
                        value={payroll.commissionPct}
                        onChange={(e) => updatePayroll({ commissionPct: e.target.value })}
                        placeholder="e.g. 55"
                      />
                    </Field>
                    <Field label="Withholding %">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        className={inputClass}
                        value={payroll.withholdingPct}
                        onChange={(e) => updatePayroll({ withholdingPct: e.target.value })}
                        placeholder="e.g. 20"
                        disabled={!payroll.isW2}
                      />
                    </Field>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={payroll.isW2}
                      onChange={(e) => updatePayroll({ isW2: e.target.checked })}
                    />
                    W-2 employee (withhold taxes from commission)
                  </label>
                  {!payroll.isW2 && (
                    <p className="text-xs text-muted-foreground">
                      1099 contractors have no withholding; that field applies only to W-2 employees.
                    </p>
                  )}

                  {payrollError && <p className="text-sm text-red-600">{payrollError}</p>}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closePayroll} disabled={payrollSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={payrollSaving}>
                      {payrollSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </form>
              )}
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
