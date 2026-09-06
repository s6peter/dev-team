"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Fetched shapes                                                      */
/* ------------------------------------------------------------------ */

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  source: string;
}

interface StatusResponse {
  entries: TimeEntry[];
  workplaceSet: boolean;
  workplace_lat: number | null;
  workplace_lng: number | null;
  workplace_radius_m: number;
}

interface PunchResult {
  ok: boolean;
  entry: TimeEntry;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two lat/lng points, in metres. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Same-origin fetch that surfaces the server {message}/{error} on non-ok responses. */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      isRecord(data) && typeof data.message === "string"
        ? data.message
        : isRecord(data) && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** Promisified geolocation with a clear denial message. */
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        reject(new Error("Location permission denied. Enable location to clock in/out."));
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        reject(new Error("Could not determine your location. Try again."));
      } else if (err.code === err.TIMEOUT) {
        reject(new Error("Location request timed out. Try again."));
      } else {
        reject(new Error("Could not read your location."));
      }
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(fromIso: string, toIso: string): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function ClockWidget() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<StatusResponse>("/api/admin/timeclock");
      setStatus(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your time clock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the "clocked in for" duration ticking.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const openEntry = status?.entries.find((e) => e.clock_out === null) ?? null;
  const clockedIn = openEntry !== null;

  async function punch(action: "in" | "out"): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (!status?.workplaceSet) {
        throw new Error("No workplace location set. Ask the owner to set it in Settings.");
      }
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;

      // Client-side UX pre-check (server re-validates authoritatively).
      if (status.workplace_lat !== null && status.workplace_lng !== null) {
        const dist = haversineMeters(lat, lng, status.workplace_lat, status.workplace_lng);
        if (dist > status.workplace_radius_m) {
          throw new Error(
            `You must be at the workplace to clock ${action === "in" ? "in" : "out"} ` +
              `(you are ${Math.round(dist)}m away, limit ${status.workplace_radius_m}m).`
          );
        }
      }

      await apiFetch<PunchResult>("/api/admin/timeclock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, lat, lng }),
      });
      setInfo(action === "in" ? "Clocked in." : "Clocked out.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not punch the clock.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-600" />
          <div>
            <div className="text-sm font-semibold">Time clock</div>
            {loading ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </div>
            ) : clockedIn && openEntry ? (
              <div className="text-xs text-muted-foreground">
                Clocked in since {formatWhen(openEntry.clock_in)} ·{" "}
                <span className="font-medium text-foreground">
                  {formatDuration(openEntry.clock_in, new Date(now).toISOString())}
                </span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">You are clocked out.</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && !status?.workplaceSet && (
            <span className="flex items-center gap-1 text-xs text-brand-600">
              <MapPin className="h-3.5 w-3.5" />
              No workplace set
            </span>
          )}
          {clockedIn ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || loading || !status?.workplaceSet}
              onClick={() => punch("out")}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clock out"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600"
              disabled={busy || loading || !status?.workplaceSet}
              onClick={() => punch("in")}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clock in"}
            </Button>
          )}
        </div>
      </div>

      {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {info && !error && <p className="mt-2 text-sm font-medium text-green-700">{info}</p>}
    </div>
  );
}
