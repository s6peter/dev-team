"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Calendar, Loader2, Mail, Phone, Plus, Save, Search, Tag as TagIcon, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel } from "@/lib/time";

interface ClientStats {
  visits: number;
  upcoming: number;
  noShows: number;
  lastVisit: string | null;
  booked: number;
}

interface AdminClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  allergies: string | null;
  preferences: string | null;
  tags: string[];
  lifetime_spend: number;
  created_at: string | null;
  stats: ClientStats;
}

/** The editable CRM fields, mirrored to draft state so edits stay local until Save. */
interface ClientDraft {
  notes: string;
  allergies: string;
  preferences: string;
  tags: string[];
}

const QUICK_TAGS = ["VIP", "Returning"] as const;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

function blankToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function draftFromClient(c: AdminClient): ClientDraft {
  return {
    notes: c.notes ?? "",
    allergies: c.allergies ?? "",
    preferences: c.preferences ?? "",
    tags: [...c.tags],
  };
}

export function AdminClients() {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [tagInput, setTagInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const fetchClients = useCallback(async (search: string): Promise<AdminClient[]> => {
    const data = await apiFetch<{ clients: AdminClient[] }>(`/api/admin/clients?q=${encodeURIComponent(search)}`);
    return data.clients ?? [];
  }, []);

  const load = useCallback(
    async (search: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const next = await fetchClients(search);
        setClients(next);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load clients.");
      } finally {
        setLoading(false);
      }
    },
    [fetchClients]
  );

  // Load immediately on mount, then debounce (~300ms) every keystroke in the search box.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      load(q);
      return;
    }
    const timer = setTimeout(() => load(q), 300);
    return () => clearTimeout(timer);
  }, [q, load]);

  const selected = useMemo(() => clients.find((c) => c.id === selectedId) ?? null, [clients, selectedId]);

  function selectClient(c: AdminClient) {
    setSelectedId(c.id);
    setDraft(draftFromClient(c));
    setTagInput("");
    setSaveError(null);
    setSavedOk(false);
  }

  function updateDraft(patch: Partial<ClientDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveError(null);
    setSavedOk(false);
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    setTagInput("");
    if (!tag) return;
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
    setSaveError(null);
    setSavedOk(false);
  }

  function removeTag(tag: string) {
    setDraft((prev) => (prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev));
    setSaveError(null);
    setSavedOk(false);
  }

  async function save() {
    if (!selected || !draft) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      await apiFetch(
        "/api/admin/clients",
        jsonInit("PATCH", {
          id: selected.id,
          notes: blankToNull(draft.notes),
          allergies: blankToNull(draft.allergies),
          preferences: blankToNull(draft.preferences),
          tags: draft.tags,
        })
      );
      const next = await fetchClients(q);
      setClients(next);
      const fresh = next.find((c) => c.id === selected.id);
      if (fresh) setDraft(draftFromClient(fresh));
      setSavedOk(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const pristineEmpty = !loading && clients.length === 0 && q.trim() === "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Your customer directory — notes, allergies, preferences, and visit history.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => load(q)}>
            Retry
          </Button>
        </div>
      )}

      {loading && clients.length === 0 ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : pristineEmpty ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No clients yet</p>
          <p className="text-sm text-muted-foreground">Clients appear here after their first booking.</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputClass} pl-9 pr-9`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, or phone"
              aria-label="Search clients"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
            {/* LEFT — directory list */}
            <div className="rounded-xl border border-border">
              <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No clients match “{q.trim()}”.
                  </p>
                ) : (
                  clients.map((c) => {
                    const hasAllergy = (c.allergies ?? "").trim() !== "";
                    const active = c.id === selectedId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectClient(c)}
                        className={`block w-full px-4 py-3 text-left transition-colors ${
                          active ? "bg-brand-50" : "hover:bg-muted/60"
                        }`}
                        aria-current={active}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{c.name}</span>
                          {hasAllergy && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" aria-label="Has allergies" />
                          )}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          {c.email}
                          {c.phone ? ` · ${c.phone}` : ""}
                        </div>
                        {c.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {c.stats.visits} {c.stats.visits === 1 ? "visit" : "visits"} · {c.stats.upcoming} upcoming
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT — profile (desktop) */}
            <div className="hidden md:block">
              {selected && draft ? (
                <ClientProfile
                  client={selected}
                  draft={draft}
                  tagInput={tagInput}
                  saving={saving}
                  error={saveError}
                  savedOk={savedOk}
                  onDraftChange={updateDraft}
                  onTagInputChange={setTagInput}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                  onSave={save}
                />
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
                  <Users className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a client to view and edit their profile.</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile as a modal on mobile */}
          {selected && draft && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 md:hidden">
              <div className="mx-auto my-4 max-w-lg">
                <ClientProfile
                  client={selected}
                  draft={draft}
                  tagInput={tagInput}
                  saving={saving}
                  error={saveError}
                  savedOk={savedOk}
                  onDraftChange={updateDraft}
                  onTagInputChange={setTagInput}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                  onSave={save}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ClientProfileProps {
  client: AdminClient;
  draft: ClientDraft;
  tagInput: string;
  saving: boolean;
  error: string | null;
  savedOk: boolean;
  onDraftChange: (patch: Partial<ClientDraft>) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (raw: string) => void;
  onRemoveTag: (tag: string) => void;
  onSave: () => void;
  onClose?: () => void;
}

function ClientProfile({
  client,
  draft,
  tagInput,
  saving,
  error,
  savedOk,
  onDraftChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onSave,
  onClose,
}: ClientProfileProps) {
  const stats = client.stats;
  const hasAllergy = draft.allergies.trim() !== "";

  return (
    <div className="space-y-5 rounded-xl border border-border bg-background p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">{client.name}</h2>
          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.created_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Client since {formatDateLabel(client.created_at.slice(0, 10))}</span>
              </div>
            )}
          </div>
        </div>
        {onClose && (
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Lifetime + stats */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <div className="text-xs text-muted-foreground">Lifetime spend</div>
        <div className="mt-0.5 text-2xl font-bold">{formatCents(client.lifetime_spend)}</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Booked" value={String(stats.booked)} />
        <Stat label="Visits" value={String(stats.visits)} />
        <Stat label="No-shows" value={String(stats.noShows)} danger={stats.noShows > 0} />
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 shrink-0" />
        Last visit: {stats.lastVisit ? formatDateLabel(stats.lastVisit) : "None yet"}
      </div>

      {/* Editable fields */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Notes</span>
        <textarea
          className={`${inputClass} min-h-[90px]`}
          value={draft.notes}
          onChange={(e) => onDraftChange({ notes: e.target.value })}
          placeholder="Formula, chair preferences, conversation notes…"
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
          Allergies
          {hasAllergy && <AlertTriangle className="h-4 w-4 text-red-600" />}
        </span>
        <input
          className={`${inputClass} ${
            hasAllergy ? "border-red-400 bg-red-50 text-red-800 focus-visible:ring-red-400" : ""
          }`}
          value={draft.allergies}
          onChange={(e) => onDraftChange({ allergies: e.target.value })}
          placeholder="e.g. PPD, latex, fragrance"
        />
        {hasAllergy && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Flagged — review before every service.
          </p>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Preferences</span>
        <input
          className={inputClass}
          value={draft.preferences}
          onChange={(e) => onDraftChange({ preferences: e.target.value })}
          placeholder="e.g. Fragrance-free, quiet appointment, herbal tea"
        />
      </label>

      {/* Tag editor */}
      <div>
        <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
          <TagIcon className="h-4 w-4 text-brand-600" />
          Tags
        </span>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          {draft.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => onRemoveTag(t)}
                className="rounded-full hover:text-brand-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag(tagInput);
              } else if (e.key === "Backspace" && tagInput === "" && draft.tags.length > 0) {
                onRemoveTag(draft.tags[draft.tags.length - 1]);
              }
            }}
            placeholder={draft.tags.length === 0 ? "Type a tag and press Enter" : ""}
            aria-label="Add tag"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_TAGS.map((qt) => {
            const has = draft.tags.some((t) => t.toLowerCase() === qt.toLowerCase());
            return (
              <Button key={qt} type="button" size="sm" variant="outline" disabled={has} onClick={() => onAddTag(qt)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {qt}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-h-[1.25rem] text-sm">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : savedOk ? (
            <span className="text-green-600">Saved.</span>
          ) : null}
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600" disabled={saving} onClick={onSave}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="mr-1 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <div className={`text-lg font-bold ${danger ? "text-red-600" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
