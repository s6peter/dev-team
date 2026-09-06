"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Fetched shapes                                                      */
/* ------------------------------------------------------------------ */

interface EntryStylist {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  stylist_id: string;
  clock_in: string;
  clock_out: string | null;
  source: string;
  stylist: EntryStylist | null;
}

interface EntriesResponse {
  entries: TimeEntry[];
}

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp -> value for a <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) -> ISO string with offset, or null if empty. */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(fromIso: string, toIso: string | null): string {
  if (!toIso) return "open";
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminTimesheets() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stylistFilter, setStylistFilter] = useState<string>("all");

  const [editId, setEditId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<EntriesResponse>("/api/admin/timeclock?scope=all");
      setEntries(data.entries ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load timesheets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stylists = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.stylist) map.set(e.stylist.id, e.stylist.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const shown = useMemo(
    () => (stylistFilter === "all" ? entries : entries.filter((e) => e.stylist_id === stylistFilter)),
    [entries, stylistFilter]
  );

  function beginEdit(entry: TimeEntry) {
    setEditId(entry.id);
    setEditIn(toLocalInput(entry.clock_in));
    setEditOut(toLocalInput(entry.clock_out));
    setEditError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditError(null);
  }

  async function saveEdit(entryId: string) {
    const clockIn = fromLocalInput(editIn);
    if (!clockIn) {
      setEditError("Clock-in time is required.");
      return;
    }
    const clockOut = fromLocalInput(editOut);
    if (clockOut && new Date(clockOut).getTime() <= new Date(clockIn).getTime()) {
      setEditError("Clock-out must be after clock-in.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await apiFetch("/api/admin/timeclock", jsonInit("PATCH", { entryId, clockIn, clockOut }));
      setEditId(null);
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Timesheets</h2>
        </div>
        {stylists.length > 0 && (
          <select
            className={INPUT_CLASS + " w-auto"}
            value={stylistFilter}
            onChange={(e) => setStylistFilter(e.target.value)}
          >
            <option value="all">All stylists</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
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
      ) : shown.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No time entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Stylist</th>
                <th className="px-3 py-2 font-medium">Clock in</th>
                <th className="px-3 py-2 font-medium">Clock out</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((entry) => {
                const editing = editId === entry.id;
                return (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{entry.stylist?.name ?? "—"}</td>
                    {editing ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="datetime-local"
                            className={INPUT_CLASS}
                            value={editIn}
                            onChange={(e) => setEditIn(e.target.value)}
                            disabled={saving}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="datetime-local"
                            className={INPUT_CLASS}
                            value={editOut}
                            onChange={(e) => setEditOut(e.target.value)}
                            disabled={saving}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground" colSpan={2}>
                          {editError && <span className="text-red-600">{editError}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Save"
                              disabled={saving}
                              onClick={() => saveEdit(entry.id)}
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" aria-label="Cancel" disabled={saving} onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">{formatWhen(entry.clock_in)}</td>
                        <td className="px-3 py-2">{formatWhen(entry.clock_out)}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDuration(entry.clock_in, entry.clock_out)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              entry.source === "admin"
                                ? "bg-brand-100 text-brand-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {entry.source}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end">
                            <Button size="icon" variant="ghost" aria-label="Edit entry" onClick={() => beginEdit(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
