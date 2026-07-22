"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Layers, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatDuration } from "@/lib/utils";

type TierKind = "size" | "length" | "addon";

interface Tier {
  id: string;
  name: string;
  kind: TierKind;
  price_addon: number;
  duration_addon: number;
  sort_order: number;
}

interface Service {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  base_price: number;
  deposit_flat_cents: number | null;
  requires_deposit: boolean;
  tax_rate: number;
  prep_notes: string | null;
  care_notes: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  tiers: Tier[];
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
  serviceCount: number;
}

interface TierDraft {
  name: string;
  kind: TierKind;
  priceAddonDollars: string;
  durationAddon: string;
}

interface ServiceDraft {
  id: string | null;
  name: string;
  category: string;
  description: string;
  durationMinutes: string;
  bufferMinutes: string;
  basePriceDollars: string;
  requiresDeposit: boolean;
  depositDollars: string;
  taxPercent: string;
  prepNotes: string;
  careNotes: string;
  imageUrl: string;
  isActive: boolean;
  tiers: TierDraft[];
}

const TIER_KINDS: TierKind[] = ["size", "length", "addon"];

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

function emptyDraft(defaultCategory: string): ServiceDraft {
  return {
    id: null,
    name: "",
    category: defaultCategory,
    description: "",
    durationMinutes: "60",
    bufferMinutes: "0",
    basePriceDollars: "",
    requiresDeposit: true,
    depositDollars: "",
    taxPercent: "8.25",
    prepNotes: "",
    careNotes: "",
    imageUrl: "",
    isActive: true,
    tiers: [],
  };
}

function draftFromService(s: Service): ServiceDraft {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description ?? "",
    durationMinutes: String(s.duration_minutes),
    bufferMinutes: String(s.buffer_minutes),
    basePriceDollars: centsToInput(s.base_price),
    requiresDeposit: s.requires_deposit,
    depositDollars: s.deposit_flat_cents == null ? "" : centsToInput(s.deposit_flat_cents),
    taxPercent: String(Math.round(s.tax_rate * 10000) / 100),
    prepNotes: s.prep_notes ?? "",
    careNotes: s.care_notes ?? "",
    imageUrl: s.image_url ?? "",
    isActive: s.is_active,
    tiers: (s.tiers ?? []).map((t) => ({
      name: t.name,
      kind: t.kind,
      priceAddonDollars: centsToInput(t.price_addon),
      durationAddon: String(t.duration_addon),
    })),
  };
}

export function AdminServices() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState<string | null>(null); // "add" or a category id
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [serviceBusy, setServiceBusy] = useState<string | null>(null); // service id being deleted
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cats, svcs] = await Promise.all([
        apiFetch<{ categories: Category[] }>("/api/admin/categories"),
        apiFetch<{ services: Service[] }>("/api/admin/services"),
      ]);
      setCategories(cats.categories ?? []);
      setServices(svcs.services ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setCategoryBusy("add");
    setCategoryError(null);
    try {
      await apiFetch("/api/admin/categories", jsonInit("POST", { name }));
      setNewCategory("");
      await load();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "Could not add category.");
    } finally {
      setCategoryBusy(null);
    }
  }

  async function deleteCategory(id: string) {
    setCategoryBusy(id);
    setCategoryError(null);
    try {
      await apiFetch("/api/admin/categories", jsonInit("DELETE", { id }));
      await load();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "Could not delete category.");
    } finally {
      setCategoryBusy(null);
    }
  }

  async function deleteService(id: string) {
    setServiceBusy(id);
    setServiceError(null);
    try {
      const res = await apiFetch<{ ok?: boolean; deactivated?: boolean }>(
        "/api/admin/services",
        jsonInit("DELETE", { id })
      );
      if (res.deactivated) {
        setServiceError("That service has appointment history, so it was deactivated instead of deleted.");
      }
      await load();
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : "Could not delete service.");
    } finally {
      setServiceBusy(null);
    }
  }

  function startCreate() {
    setFormError(null);
    setDraft(emptyDraft(categories[0]?.name ?? ""));
  }

  function startEdit(s: Service) {
    setFormError(null);
    setDraft(draftFromService(s));
  }

  async function submitDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!draft.category) {
      setFormError("Choose a category (add one first if the list is empty).");
      return;
    }
    const durationMinutes = parseWholeNumber(draft.durationMinutes);
    if (durationMinutes == null || durationMinutes <= 0) {
      setFormError("Duration must be a positive number of minutes.");
      return;
    }
    const basePriceCents = parseDollarsToCents(draft.basePriceDollars);
    if (basePriceCents == null || basePriceCents < 0) {
      setFormError("Enter a valid base price.");
      return;
    }
    const bufferMinutes = parseWholeNumber(draft.bufferMinutes) ?? 0;
    const depositFlatCents =
      !draft.requiresDeposit || draft.depositDollars.trim() === ""
        ? null
        : parseDollarsToCents(draft.depositDollars);
    const taxPercentNum = Number(draft.taxPercent);
    const taxRate = Number.isNaN(taxPercentNum) ? 0.0825 : taxPercentNum / 100;

    const tiers: Array<{
      name: string;
      kind: TierKind;
      priceAddonCents: number;
      durationAddon: number;
      sortOrder: number;
    }> = [];
    for (let i = 0; i < draft.tiers.length; i += 1) {
      const t = draft.tiers[i];
      const tierName = t.name.trim();
      if (!tierName) {
        setFormError("Every tier needs a name (or remove the empty row).");
        return;
      }
      tiers.push({
        name: tierName,
        kind: t.kind,
        priceAddonCents: parseDollarsToCents(t.priceAddonDollars) ?? 0,
        durationAddon: parseWholeNumber(t.durationAddon) ?? 0,
        sortOrder: i,
      });
    }

    const body = {
      ...(draft.id ? { id: draft.id } : {}),
      name,
      category: draft.category,
      description: draft.description.trim() || null,
      durationMinutes,
      bufferMinutes,
      basePriceCents,
      depositFlatCents,
      requiresDeposit: draft.requiresDeposit,
      taxRate,
      prepNotes: draft.prepNotes.trim() || null,
      careNotes: draft.careNotes.trim() || null,
      imageUrl: draft.imageUrl.trim() || null,
      isActive: draft.isActive,
      tiers,
    };

    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/services", jsonInit(draft.id ? "PATCH" : "POST", body));
      setDraft(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(patch: Partial<ServiceDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateTier(index: number, patch: Partial<TierDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const tiers = prev.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
      return { ...prev, tiers };
    });
  }

  function addTierRow() {
    setDraft((prev) =>
      prev
        ? { ...prev, tiers: [...prev.tiers, { name: "", kind: "size", priceAddonDollars: "0", durationAddon: "0" }] }
        : prev
    );
  }

  function removeTierRow(index: number) {
    setDraft((prev) => (prev ? { ...prev, tiers: prev.tiers.filter((_, i) => i !== index) } : prev));
  }

  // Group services by category, respecting category sort order; anything whose
  // category is missing from the list falls into an "Uncategorized" bucket last.
  const knownNames = new Set(categories.map((c) => c.name));
  const groups: Array<{ name: string; services: Service[] }> = categories.map((c) => ({
    name: c.name,
    services: services.filter((s) => s.category === c.name),
  }));
  const orphans = services.filter((s) => !knownNames.has(s.category));
  if (orphans.length > 0) groups.push({ name: "Uncategorized", services: orphans });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-sm text-muted-foreground">Manage your categories, services, and pricing tiers.</p>
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
          {/* CATEGORIES */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Categories</h2>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputClass}
                  placeholder="New category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCategory();
                  }}
                />
                <Button
                  className="bg-brand-500 hover:bg-brand-600 sm:w-auto"
                  onClick={addCategory}
                  disabled={categoryBusy === "add" || newCategory.trim() === ""}
                >
                  {categoryBusy === "add" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" />
                      Add category
                    </>
                  )}
                </Button>
              </div>

              {categoryError && <p className="mb-3 text-sm text-red-600">{categoryError}</p>}

              {categories.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {c.serviceCount} {c.serviceCount === 1 ? "service" : "services"}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        disabled={categoryBusy === c.id}
                        onClick={() => deleteCategory(c.id)}
                      >
                        {categoryBusy === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* SERVICES */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold">Services</h2>
              </div>
              <Button className="bg-brand-500 hover:bg-brand-600" onClick={startCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Add service
              </Button>
            </div>

            {serviceError && <p className="mb-3 text-sm text-amber-700">{serviceError}</p>}

            {services.length === 0 ? (
              <p className="rounded-xl border border-border py-16 text-center text-muted-foreground">
                No services yet. Add your first one.
              </p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.name}>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.name}
                    </h3>
                    {group.services.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                        No services in this category.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {group.services.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{s.name}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {s.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {formatCents(s.base_price)} · {formatDuration(s.duration_minutes)}
                                {s.tiers.length > 0
                                  ? ` · ${s.tiers.length} ${s.tiers.length === 1 ? "tier" : "tiers"}`
                                  : ""}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={serviceBusy === s.id}
                                onClick={() => deleteService(s.id)}
                              >
                                {serviceBusy === s.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="mr-1 h-4 w-4 text-red-600" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {draft && (
        <ServiceForm
          draft={draft}
          categories={categories}
          saving={saving}
          error={formError}
          onClose={() => setDraft(null)}
          onSubmit={submitDraft}
          onChange={updateDraft}
          onTierChange={updateTier}
          onAddTier={addTierRow}
          onRemoveTier={removeTierRow}
        />
      )}
    </div>
  );
}

interface ServiceFormProps {
  draft: ServiceDraft;
  categories: Category[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<ServiceDraft>) => void;
  onTierChange: (index: number, patch: Partial<TierDraft>) => void;
  onAddTier: () => void;
  onRemoveTier: (index: number) => void;
}

function ServiceForm({
  draft,
  categories,
  saving,
  error,
  onClose,
  onSubmit,
  onChange,
  onTierChange,
  onAddTier,
  onRemoveTier,
}: ServiceFormProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{draft.id ? "Edit service" : "Add service"}</h2>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Field label="Name">
            <input
              className={inputClass}
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Balayage"
            />
          </Field>

          <Field label="Category">
            <select
              className={inputClass}
              value={draft.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              {categories.length === 0 && <option value="">No categories — add one first</option>}
              {!categories.some((c) => c.name === draft.category) && draft.category !== "" && (
                <option value={draft.category}>{draft.category}</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="1"
                className={inputClass}
                value={draft.durationMinutes}
                onChange={(e) => onChange({ durationMinutes: e.target.value })}
              />
            </Field>
            <Field label="Buffer (minutes)">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={draft.bufferMinutes}
                onChange={(e) => onChange({ bufferMinutes: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Base price ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={draft.basePriceDollars}
                onChange={(e) => onChange({ basePriceDollars: e.target.value })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Tax rate (%)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={draft.taxPercent}
                onChange={(e) => onChange({ taxPercent: e.target.value })}
                placeholder="8.25"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={draft.requiresDeposit}
              onChange={(e) => onChange({ requiresDeposit: e.target.checked })}
            />
            Requires deposit
          </label>

          <Field label="Deposit ($) — leave blank to use the default">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={draft.depositDollars}
              disabled={!draft.requiresDeposit}
              onChange={(e) => onChange({ depositDollars: e.target.value })}
              placeholder="Default / none"
            />
          </Field>

          <Field label="Prep notes">
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={draft.prepNotes}
              onChange={(e) => onChange({ prepNotes: e.target.value })}
            />
          </Field>

          <Field label="Care notes">
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={draft.careNotes}
              onChange={(e) => onChange({ careNotes: e.target.value })}
            />
          </Field>

          <Field label="Image URL">
            <input
              type="url"
              className={inputClass}
              value={draft.imageUrl}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={draft.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
            />
            Active (bookable)
          </label>

          {/* TIERS */}
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <Layers className="h-4 w-4 text-brand-600" />
                Tiers
              </span>
              <Button type="button" size="sm" variant="outline" onClick={onAddTier}>
                <Plus className="mr-1 h-4 w-4" />
                Add tier
              </Button>
            </div>

            {draft.tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tiers. Add size, length, or add-on options.</p>
            ) : (
              <div className="space-y-3">
                {draft.tiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                    <div className="sm:col-span-4">
                      <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                      <input
                        className={inputClass}
                        value={t.name}
                        onChange={(e) => onTierChange(i, { name: e.target.value })}
                        placeholder="e.g. Long hair"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="mb-1 block text-xs text-muted-foreground">Kind</label>
                      <select
                        className={inputClass}
                        value={t.kind}
                        onChange={(e) => onTierChange(i, { kind: e.target.value as TierKind })}
                      >
                        {TIER_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-muted-foreground">+ Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={t.priceAddonDollars}
                        onChange={(e) => onTierChange(i, { priceAddonDollars: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-muted-foreground">+ Min</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={t.durationAddon}
                        onChange={(e) => onTierChange(i, { durationAddon: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-1 flex sm:justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remove tier"
                        onClick={() => onRemoveTier(i)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  {draft.id ? "Save changes" : "Create service"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
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
