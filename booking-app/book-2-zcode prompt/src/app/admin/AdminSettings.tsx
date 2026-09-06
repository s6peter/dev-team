"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Copy, Loader2, MapPin, Save, ScrollText, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Profile {
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  instagram: string | null;
}

interface Policy {
  deposit_cents: number;
  cancel_notice_hours: number;
  reschedule_notice_hours: number;
  blow_dry_fee_cents: number;
  late_fee_cents: number;
  grace_minutes: number;
  policy_text: string | null;
}

interface Workplace {
  lat: number | null;
  lng: number | null;
  radius_m: number;
}

interface SettingsResponse {
  profile: Profile;
  policy: Policy | null;
  isOwner?: boolean;
  workplace?: Workplace;
  calendarFeedUrl?: string;
}

interface WorkplaceForm {
  lat: string;
  lng: string;
  radiusM: string;
}

interface ProfileForm {
  name: string;
  phone: string;
  bio: string;
  instagram: string;
}

interface PolicyForm {
  depositDollars: string;
  cancelNoticeHours: string;
  rescheduleNoticeHours: string;
  blowDryFeeDollars: string;
  lateFeeDollars: string;
  graceMinutes: string;
  policyText: string;
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const EMPTY_WORKPLACE: WorkplaceForm = { lat: "", lng: "", radiusM: "150" };

const EMPTY_PROFILE: ProfileForm = { name: "", phone: "", bio: "", instagram: "" };
const EMPTY_POLICY: PolicyForm = {
  depositDollars: "",
  cancelNoticeHours: "",
  rescheduleNoticeHours: "",
  blowDryFeeDollars: "",
  lateFeeDollars: "",
  graceMinutes: "",
  policyText: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Same-origin fetch that surfaces the server {error} on non-ok responses. */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = isRecord(data) && typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function centsToInput(cents: number): string {
  return String(cents / 100);
}

function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [policyForm, setPolicyForm] = useState<PolicyForm>(EMPTY_POLICY);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySaved, setPolicySaved] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const [workplaceForm, setWorkplaceForm] = useState<WorkplaceForm>(EMPTY_WORKPLACE);
  const [workplaceSaving, setWorkplaceSaving] = useState(false);
  const [workplaceError, setWorkplaceError] = useState<string | null>(null);
  const [workplaceSaved, setWorkplaceSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<SettingsResponse>("/api/admin/settings");
      setEmail(data.profile.email);
      setFeedUrl(data.calendarFeedUrl ?? "");
      setIsOwner(Boolean(data.isOwner));
      setWorkplaceForm({
        lat: data.workplace?.lat != null ? String(data.workplace.lat) : "",
        lng: data.workplace?.lng != null ? String(data.workplace.lng) : "",
        radiusM: data.workplace?.radius_m != null ? String(data.workplace.radius_m) : "150",
      });
      setProfileForm({
        name: data.profile.name ?? "",
        phone: data.profile.phone ?? "",
        bio: data.profile.bio ?? "",
        instagram: data.profile.instagram ?? "",
      });
      const p = data.policy;
      setPolicyForm({
        depositDollars: p ? centsToInput(p.deposit_cents) : "50",
        cancelNoticeHours: p ? String(p.cancel_notice_hours) : "24",
        rescheduleNoticeHours: p ? String(p.reschedule_notice_hours) : "24",
        blowDryFeeDollars: p ? centsToInput(p.blow_dry_fee_cents) : "",
        lateFeeDollars: p ? centsToInput(p.late_fee_cents) : "",
        graceMinutes: p ? String(p.grace_minutes) : "15",
        policyText: p?.policy_text ?? "",
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateProfile(patch: Partial<ProfileForm>) {
    setProfileForm((prev) => ({ ...prev, ...patch }));
    setProfileSaved(false);
    setProfileError(null);
  }

  function updatePolicy(patch: Partial<PolicyForm>) {
    setPolicyForm((prev) => ({ ...prev, ...patch }));
    setPolicySaved(false);
    setPolicyError(null);
  }

  async function saveProfile() {
    const name = profileForm.name.trim();
    if (!name) {
      setProfileError("Name is required.");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await apiFetch(
        "/api/admin/settings",
        jsonInit("PUT", {
          profile: {
            name,
            phone: profileForm.phone.trim() || null,
            bio: profileForm.bio.trim() || null,
            instagram: profileForm.instagram.trim() || null,
          },
        })
      );
      setProfileSaved(true);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePolicy() {
    const cancelNoticeHours = parseWholeNumber(policyForm.cancelNoticeHours) ?? 0;
    const rescheduleNoticeHours = parseWholeNumber(policyForm.rescheduleNoticeHours) ?? 0;
    const graceMinutes = parseWholeNumber(policyForm.graceMinutes) ?? 0;
    const blowDryFeeCents = parseDollarsToCents(policyForm.blowDryFeeDollars) ?? 0;
    const lateFeeCents = parseDollarsToCents(policyForm.lateFeeDollars) ?? 0;
    const depositCents = parseDollarsToCents(policyForm.depositDollars) ?? 0;

    if (
      cancelNoticeHours < 0 ||
      rescheduleNoticeHours < 0 ||
      graceMinutes < 0 ||
      blowDryFeeCents < 0 ||
      lateFeeCents < 0
    ) {
      setPolicyError("Values can't be negative.");
      return;
    }
    if (cancelNoticeHours > 168 || rescheduleNoticeHours > 168) {
      setPolicyError("Notice windows can't exceed 168 hours (7 days).");
      return;
    }
    if (graceMinutes > 60) {
      setPolicyError("Grace period can't exceed 60 minutes.");
      return;
    }

    setPolicySaving(true);
    setPolicyError(null);
    setPolicySaved(false);
    try {
      await apiFetch(
        "/api/admin/settings",
        jsonInit("PUT", {
          policy: {
            depositCents,
            cancelNoticeHours,
            rescheduleNoticeHours,
            blowDryFeeCents,
            lateFeeCents,
            graceMinutes,
            policyText: policyForm.policyText,
          },
        })
      );
      setPolicySaved(true);
    } catch (e) {
      setPolicyError(e instanceof Error ? e.message : "Could not save policies.");
    } finally {
      setPolicySaving(false);
    }
  }

  function updateWorkplace(patch: Partial<WorkplaceForm>) {
    setWorkplaceForm((prev) => ({ ...prev, ...patch }));
    setWorkplaceSaved(false);
    setWorkplaceError(null);
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setWorkplaceError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    setWorkplaceError(null);
    setWorkplaceSaved(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkplaceForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setWorkplaceError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enter the coordinates manually."
            : "Could not read your location."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }

  async function saveWorkplace() {
    const lat = Number(workplaceForm.lat.trim());
    const lng = Number(workplaceForm.lng.trim());
    const radiusM = parseWholeNumber(workplaceForm.radiusM) ?? 0;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setWorkplaceError("Latitude must be between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setWorkplaceError("Longitude must be between -180 and 180.");
      return;
    }
    if (radiusM < 10 || radiusM > 5000) {
      setWorkplaceError("Radius must be between 10 and 5000 metres.");
      return;
    }
    setWorkplaceSaving(true);
    setWorkplaceError(null);
    setWorkplaceSaved(false);
    try {
      await apiFetch("/api/admin/settings", jsonInit("PUT", { workplace: { lat, lng, radiusM } }));
      setWorkplaceSaved(true);
    } catch (e) {
      setWorkplaceError(e instanceof Error ? e.message : "Could not save the workplace location.");
    } finally {
      setWorkplaceSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business profile and booking policies.</p>
      </div>

      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-8">
          {/* CALENDAR SYNC */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Calendar sync</h2>
            </div>
            <div className="rounded-xl border border-border p-4 sm:p-6">
              <p className="mb-3 text-sm text-muted-foreground">
                Subscribe to this private link in Google Calendar (Other calendars → From URL), Apple Calendar, or Outlook to see all your appointments — it refreshes automatically. Keep the link private.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input readOnly value={feedUrl} className="flex-1 rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(feedUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
                >
                  {copied ? <><Check className="mr-1 h-4 w-4" />Copied</> : <><Copy className="mr-1 h-4 w-4" />Copy</>}
                </Button>
              </div>
            </div>
          </section>

          {/* WORKPLACE LOCATION (owner only) */}
          {isOwner && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold">Workplace location</h2>
              </div>

              <form
                className="rounded-xl border border-border p-4 sm:p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveWorkplace();
                }}
              >
                <p className="mb-4 text-sm text-muted-foreground">
                  Staff can only clock in or out when they are within the radius of this location. Set it
                  from the salon using &ldquo;Use my current location&rdquo;, or enter the coordinates manually.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      className={inputClass}
                      value={workplaceForm.lat}
                      onChange={(e) => updateWorkplace({ lat: e.target.value })}
                      placeholder="33.150800"
                    />
                  </Field>
                  <Field label="Longitude">
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      className={inputClass}
                      value={workplaceForm.lng}
                      onChange={(e) => updateWorkplace({ lng: e.target.value })}
                      placeholder="-96.823600"
                    />
                  </Field>
                  <Field label="Radius (metres)">
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="1"
                      className={inputClass}
                      value={workplaceForm.radiusM}
                      onChange={(e) => updateWorkplace({ radiusM: e.target.value })}
                      placeholder="150"
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating || workplaceSaving}>
                    {locating ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-1 h-4 w-4" />
                    )}
                    Use my current location
                  </Button>
                  <div className="flex items-center gap-3">
                    {workplaceError && <span className="text-sm text-red-600">{workplaceError}</span>}
                    {workplaceSaved && !workplaceError && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        Saved
                      </span>
                    )}
                    <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={workplaceSaving}>
                      {workplaceSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="mr-1 h-4 w-4" />
                          Save location
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {/* BUSINESS PROFILE */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Store className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Business profile</h2>
            </div>

            <form
              className="rounded-xl border border-border p-4 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile();
              }}
            >
              <div className="space-y-4">
                <Field label="Name">
                  <input
                    className={inputClass}
                    value={profileForm.name}
                    onChange={(e) => updateProfile({ name: e.target.value })}
                    placeholder="e.g. Ava Rivera"
                  />
                </Field>

                <Field label="Email">
                  <input className={inputClass} value={email} readOnly disabled />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Your login email can&apos;t be changed here.
                  </span>
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Phone">
                    <input
                      type="tel"
                      className={inputClass}
                      value={profileForm.phone}
                      onChange={(e) => updateProfile({ phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </Field>
                  <Field label="Instagram">
                    <input
                      className={inputClass}
                      value={profileForm.instagram}
                      onChange={(e) => updateProfile({ instagram: e.target.value })}
                      placeholder="@yourhandle"
                    />
                  </Field>
                </div>

                <Field label="Bio">
                  <textarea
                    className={`${inputClass} min-h-[100px]`}
                    value={profileForm.bio}
                    onChange={(e) => updateProfile({ bio: e.target.value })}
                    placeholder="A short intro shown on your booking page."
                  />
                </Field>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {profileError && <span className="text-sm text-red-600">{profileError}</span>}
                {profileSaved && !profileError && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={profileSaving}>
                  {profileSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="mr-1 h-4 w-4" />
                      Save profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>

          {/* POLICIES */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Policies</h2>
            </div>

            <form
              className="rounded-xl border border-border p-4 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                savePolicy();
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Deposit amount ($)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={policyForm.depositDollars}
                    onChange={(e) => updatePolicy({ depositDollars: e.target.value })}
                    placeholder="50.00"
                  />
                </Field>
                <Field label="Cancellation notice (hours)">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    className={inputClass}
                    value={policyForm.cancelNoticeHours}
                    onChange={(e) => updatePolicy({ cancelNoticeHours: e.target.value })}
                  />
                </Field>
                <Field label="Reschedule notice (hours)">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    className={inputClass}
                    value={policyForm.rescheduleNoticeHours}
                    onChange={(e) => updatePolicy({ rescheduleNoticeHours: e.target.value })}
                  />
                </Field>
                <Field label="Blow-dry fee ($)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={policyForm.blowDryFeeDollars}
                    onChange={(e) => updatePolicy({ blowDryFeeDollars: e.target.value })}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Late fee ($)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={policyForm.lateFeeDollars}
                    onChange={(e) => updatePolicy({ lateFeeDollars: e.target.value })}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Grace period (minutes)">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    className={inputClass}
                    value={policyForm.graceMinutes}
                    onChange={(e) => updatePolicy({ graceMinutes: e.target.value })}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Policy text">
                  <textarea
                    className={`${inputClass} min-h-[140px]`}
                    value={policyForm.policyText}
                    onChange={(e) => updatePolicy({ policyText: e.target.value })}
                    placeholder="Describe your cancellation, deposit, and late-arrival policies."
                  />
                </Field>
                <p className="mt-1 text-xs text-muted-foreground">
                  This text appears on your booking page and /policies.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {policyError && <span className="text-sm text-red-600">{policyError}</span>}
                {policySaved && !policyError && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={policySaving}>
                  {policySaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="mr-1 h-4 w-4" />
                      Save policies
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
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
