"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Save,
  Table,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatDuration } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Grouped catalog manager: groups (4 tiles) → services → priced variants.
 * Consumes /api/admin/{groups,services,variants}. Money is entered in dollars
 * and converted to integer cents before hitting the API.
 * ------------------------------------------------------------------------- */

type GroupKind = "standard" | "custom";

interface Group {
  id: string;
  name: string;
  slug: string;
  kind: GroupKind;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
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
  group_id: string | null;
  variantCount: number;
}

interface Variant {
  id: string;
  service_id: string;
  size: string | null;
  length: string | null;
  label: string;
  price_cents: number;
  price_from: boolean;
  duration_minutes: number;
  sort_order: number;
  is_active: boolean;
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

/* ============================== GROUP DRAFT ============================== */

interface GroupDraft {
  id: string | null;
  name: string;
  slug: string;
  kind: GroupKind;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
}

function emptyGroupDraft(nextSort: number): GroupDraft {
  return {
    id: null,
    name: "",
    slug: "",
    kind: "standard",
    description: "",
    imageUrl: "",
    isActive: true,
    sortOrder: String(nextSort),
  };
}

function draftFromGroup(g: Group): GroupDraft {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    kind: g.kind,
    description: g.description ?? "",
    imageUrl: g.image_url ?? "",
    isActive: g.is_active,
    sortOrder: String(g.sort_order),
  };
}

/* ============================= SERVICE DRAFT ============================= */

interface ServiceDraft {
  id: string | null;
  groupId: string;
  name: string;
  description: string;
  durationMinutes: string;
  bufferMinutes: string;
  basePriceDollars: string;
  requiresDeposit: boolean;
  depositDollars: string;
  imageUrl: string;
  prepNotes: string;
  careNotes: string;
  isActive: boolean;
  sortOrder: string;
}

function emptyServiceDraft(groupId: string, nextSort: number): ServiceDraft {
  return {
    id: null,
    groupId,
    name: "",
    description: "",
    durationMinutes: "60",
    bufferMinutes: "0",
    basePriceDollars: "",
    requiresDeposit: true,
    depositDollars: "",
    imageUrl: "",
    prepNotes: "",
    careNotes: "",
    isActive: true,
    sortOrder: String(nextSort),
  };
}

function draftFromService(s: Service): ServiceDraft {
  return {
    id: s.id,
    groupId: s.group_id ?? "",
    name: s.name,
    description: s.description ?? "",
    durationMinutes: String(s.duration_minutes),
    bufferMinutes: String(s.buffer_minutes),
    basePriceDollars: centsToInput(s.base_price),
    requiresDeposit: s.requires_deposit,
    depositDollars: s.deposit_flat_cents == null ? "" : centsToInput(s.deposit_flat_cents),
    imageUrl: s.image_url ?? "",
    prepNotes: s.prep_notes ?? "",
    careNotes: s.care_notes ?? "",
    isActive: s.is_active,
    sortOrder: String(s.sort_order),
  };
}

/* ============================= VARIANT DRAFT ============================= */

interface VariantRow {
  id: string | null;
  size: string;
  length: string;
  label: string;
  priceDollars: string;
  priceFrom: boolean;
  durationMinutes: string;
  isActive: boolean;
}

function rowFromVariant(v: Variant): VariantRow {
  return {
    id: v.id,
    size: v.size ?? "",
    length: v.length ?? "",
    label: v.label,
    priceDollars: centsToInput(v.price_cents),
    priceFrom: v.price_from,
    durationMinutes: String(v.duration_minutes),
    isActive: v.is_active,
  };
}

function emptyVariantRow(): VariantRow {
  return { id: null, size: "", length: "", label: "", priceDollars: "", priceFrom: false, durationMinutes: "60", isActive: true };
}

/* ================================ MAIN =================================== */

export function AdminServices() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [groupBusy, setGroupBusy] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [serviceBusy, setServiceBusy] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft | null>(null);
  const [variantService, setVariantService] = useState<Service | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [g, s] = await Promise.all([
        apiFetch<{ groups: Group[] }>("/api/admin/groups"),
        apiFetch<{ services: Service[] }>("/api/admin/services"),
      ]);
      setGroups(g.groups ?? []);
      setServices(s.services ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* -------------------------------- groups ------------------------------ */

  async function saveGroup() {
    if (!groupDraft) return;
    const name = groupDraft.name.trim();
    if (!name) {
      setGroupError("Group name is required.");
      return;
    }
    const body = {
      ...(groupDraft.id ? { id: groupDraft.id } : {}),
      name,
      slug: groupDraft.slug.trim() || name,
      kind: groupDraft.kind,
      description: groupDraft.description.trim() || null,
      imageUrl: groupDraft.imageUrl.trim() || null,
      isActive: groupDraft.isActive,
      sortOrder: parseWholeNumber(groupDraft.sortOrder) ?? 99,
    };
    setGroupBusy("save");
    setGroupError(null);
    try {
      await apiFetch("/api/admin/groups", jsonInit(groupDraft.id ? "PATCH" : "POST", body));
      setGroupDraft(null);
      await load();
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : "Could not save group.");
    } finally {
      setGroupBusy(null);
    }
  }

  async function toggleGroupActive(g: Group) {
    setGroupBusy(g.id);
    setGroupError(null);
    try {
      await apiFetch("/api/admin/groups", jsonInit("PATCH", { id: g.id, isActive: !g.is_active }));
      await load();
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : "Could not update group.");
    } finally {
      setGroupBusy(null);
    }
  }

  async function deleteGroup(g: Group) {
    setGroupBusy(g.id);
    setGroupError(null);
    try {
      const res = await apiFetch<{ deactivated?: boolean }>("/api/admin/groups", jsonInit("DELETE", { id: g.id }));
      if (res.deactivated) setGroupError(`"${g.name}" still has services, so it was deactivated instead of deleted.`);
      await load();
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : "Could not delete group.");
    } finally {
      setGroupBusy(null);
    }
  }

  /* ------------------------------- services ----------------------------- */

  async function saveService() {
    if (!serviceDraft) return;
    const name = serviceDraft.name.trim();
    if (!name) {
      setServiceError("Service name is required.");
      return;
    }
    if (!serviceDraft.groupId) {
      setServiceError("Pick a group for this service.");
      return;
    }
    const durationMinutes = parseWholeNumber(serviceDraft.durationMinutes);
    if (durationMinutes == null || durationMinutes <= 0) {
      setServiceError("Duration must be a positive number of minutes.");
      return;
    }
    const basePriceCents = parseDollarsToCents(serviceDraft.basePriceDollars) ?? 0;
    const depositFlatCents =
      !serviceDraft.requiresDeposit || serviceDraft.depositDollars.trim() === ""
        ? null
        : parseDollarsToCents(serviceDraft.depositDollars);

    const body = {
      ...(serviceDraft.id ? { id: serviceDraft.id } : {}),
      name,
      groupId: serviceDraft.groupId,
      description: serviceDraft.description.trim() || null,
      durationMinutes,
      bufferMinutes: parseWholeNumber(serviceDraft.bufferMinutes) ?? 0,
      basePriceCents,
      requiresDeposit: serviceDraft.requiresDeposit,
      depositFlatCents,
      imageUrl: serviceDraft.imageUrl.trim() || null,
      prepNotes: serviceDraft.prepNotes.trim() || null,
      careNotes: serviceDraft.careNotes.trim() || null,
      isActive: serviceDraft.isActive,
      sortOrder: parseWholeNumber(serviceDraft.sortOrder) ?? 99,
    };

    setServiceBusy("save");
    setServiceError(null);
    try {
      await apiFetch("/api/admin/services", jsonInit(serviceDraft.id ? "PATCH" : "POST", body));
      setServiceDraft(null);
      await load();
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : "Could not save service.");
    } finally {
      setServiceBusy(null);
    }
  }

  async function deleteService(s: Service) {
    setServiceBusy(s.id);
    setServiceError(null);
    try {
      const res = await apiFetch<{ deactivated?: boolean }>("/api/admin/services", jsonInit("DELETE", { id: s.id }));
      if (res.deactivated) setServiceError(`"${s.name}" has booking history, so it was deactivated instead of deleted.`);
      await load();
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : "Could not delete service.");
    } finally {
      setServiceBusy(null);
    }
  }

  const servicesByGroup = (groupId: string) =>
    services.filter((s) => s.group_id === groupId).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage your booking groups, services, and priced variants.</p>
        </div>
        <Button
          className="bg-brand-500 hover:bg-brand-600"
          onClick={() => {
            setGroupError(null);
            setGroupDraft(emptyGroupDraft(groups.length + 1));
          }}
        >
          <FolderPlus className="mr-1 h-4 w-4" />
          Add group
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}
      {groupError && <p className="mb-3 text-sm text-red-600">{groupError}</p>}
      {serviceError && <p className="mb-3 text-sm text-red-600">{serviceError}</p>}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-border py-16 text-center text-muted-foreground">
          No groups yet. Add your first booking tile.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const groupServices = servicesByGroup(g.id);
            const open = expanded.has(g.id);
            return (
              <div key={g.id} className="rounded-xl border border-border">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    onClick={() => toggleExpanded(g.id)}
                  >
                    {open ? (
                      <ChevronDown className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{g.name}</span>
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{g.kind}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            g.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {g.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {groupServices.length} {groupServices.length === 1 ? "service" : "services"} · order {g.sort_order}
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={groupBusy === g.id}
                      onClick={() => toggleGroupActive(g)}
                    >
                      {groupBusy === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : g.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGroupError(null);
                        setGroupDraft(draftFromGroup(g));
                      }}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" disabled={groupBusy === g.id} onClick={() => deleteGroup(g)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Layers className="h-4 w-4" />
                        Services
                      </span>
                      <Button
                        size="sm"
                        className="bg-brand-500 hover:bg-brand-600"
                        onClick={() => {
                          setServiceError(null);
                          setServiceDraft(emptyServiceDraft(g.id, groupServices.length + 1));
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add service
                      </Button>
                    </div>

                    {groupServices.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                        No services in this group yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {groupServices.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{s.name}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {s.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                from {formatCents(s.base_price)} · {formatDuration(s.duration_minutes)} ·{" "}
                                {s.variantCount} {s.variantCount === 1 ? "variant" : "variants"}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => setVariantService(s)}>
                                <Table className="mr-1 h-4 w-4" />
                                Variants
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setServiceError(null);
                                  setServiceDraft(draftFromService(s));
                                }}
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={serviceBusy === s.id}
                                onClick={() => deleteService(s)}
                              >
                                {serviceBusy === s.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {groupDraft && (
        <GroupForm
          draft={groupDraft}
          saving={groupBusy === "save"}
          error={groupError}
          onClose={() => setGroupDraft(null)}
          onSubmit={saveGroup}
          onChange={(patch) => setGroupDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}

      {serviceDraft && (
        <ServiceForm
          draft={serviceDraft}
          groups={groups}
          saving={serviceBusy === "save"}
          error={serviceError}
          onClose={() => setServiceDraft(null)}
          onSubmit={saveService}
          onChange={(patch) => setServiceDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}

      {variantService && (
        <VariantManager
          service={variantService}
          onClose={() => setVariantService(null)}
          onSaved={async () => {
            setVariantService(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ============================== GROUP FORM =============================== */

interface GroupFormProps {
  draft: GroupDraft;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<GroupDraft>) => void;
}

function GroupForm({ draft, saving, error, onClose, onSubmit, onChange }: GroupFormProps) {
  return (
    <Modal title={draft.id ? "Edit group" : "Add group"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Name">
          <input className={inputClass} value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Adult Braids" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Slug (URL id)">
            <input className={inputClass} value={draft.slug} onChange={(e) => onChange({ slug: e.target.value })} placeholder="auto from name" />
          </Field>
          <Field label="Kind">
            <select className={inputClass} value={draft.kind} onChange={(e) => onChange({ kind: e.target.value as GroupKind })}>
              <option value="standard">standard</option>
              <option value="custom">custom</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea className={`${inputClass} min-h-[70px]`} value={draft.description} onChange={(e) => onChange({ description: e.target.value })} />
        </Field>
        <Field label="Sort order">
          <input type="number" className={inputClass} value={draft.sortOrder} onChange={(e) => onChange({ sortOrder: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border-input" checked={draft.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} />
          Active (shown as a booking tile)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormActions saving={saving} onClose={onClose} label={draft.id ? "Save changes" : "Create group"} />
      </form>
    </Modal>
  );
}

/* ============================= SERVICE FORM ============================== */

interface ServiceFormProps {
  draft: ServiceDraft;
  groups: Group[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<ServiceDraft>) => void;
}

function ServiceForm({ draft, groups, saving, error, onClose, onSubmit, onChange }: ServiceFormProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) setUploadErr(data.error ?? "Upload failed");
      else onChange({ imageUrl: data.url });
    } catch {
      setUploadErr("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title={draft.id ? "Edit service" : "Add service"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Name">
          <input className={inputClass} value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Knotless Braids" />
        </Field>
        <Field label="Group">
          <select className={inputClass} value={draft.groupId} onChange={(e) => onChange({ groupId: e.target.value })}>
            <option value="">Choose a group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea className={`${inputClass} min-h-[70px]`} value={draft.description} onChange={(e) => onChange({ description: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Duration (minutes)">
            <input type="number" min="1" className={inputClass} value={draft.durationMinutes} onChange={(e) => onChange({ durationMinutes: e.target.value })} />
          </Field>
          <Field label="Buffer (minutes)">
            <input type="number" min="0" className={inputClass} value={draft.bufferMinutes} onChange={(e) => onChange({ bufferMinutes: e.target.value })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starting-at price ($)">
            <input type="number" min="0" step="0.01" className={inputClass} value={draft.basePriceDollars} onChange={(e) => onChange({ basePriceDollars: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Sort order">
            <input type="number" className={inputClass} value={draft.sortOrder} onChange={(e) => onChange({ sortOrder: e.target.value })} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border-input" checked={draft.requiresDeposit} onChange={(e) => onChange({ requiresDeposit: e.target.checked })} />
          Requires deposit
        </label>

        <Field label="Deposit ($) — leave blank for the salon default">
          <input type="number" min="0" step="0.01" className={inputClass} value={draft.depositDollars} disabled={!draft.requiresDeposit} onChange={(e) => onChange({ depositDollars: e.target.value })} placeholder="Default" />
        </Field>

        <Field label="Prep notes">
          <textarea className={`${inputClass} min-h-[50px]`} value={draft.prepNotes} onChange={(e) => onChange({ prepNotes: e.target.value })} />
        </Field>
        <Field label="Care notes">
          <textarea className={`${inputClass} min-h-[50px]`} value={draft.careNotes} onChange={(e) => onChange({ careNotes: e.target.value })} />
        </Field>

        <Field label="Photo">
          <div className="flex items-start gap-3">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.imageUrl} alt="preview" className="h-20 w-20 flex-shrink-0 rounded-lg border border-border object-cover" />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload a photo"}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files?.[0])} />
              </label>
              <input type="url" className={inputClass} value={draft.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="…or paste an image URL" />
              {uploadErr && <p className="text-xs text-red-600">{uploadErr}</p>}
            </div>
          </div>
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border-input" checked={draft.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} />
          Active (bookable)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormActions saving={saving} onClose={onClose} label={draft.id ? "Save changes" : "Create service"} />
      </form>
    </Modal>
  );
}

/* ============================ VARIANT MANAGER =========================== */

interface VariantManagerProps {
  service: Service;
  onClose: () => void;
  onSaved: () => void;
}

function VariantManager({ service, onClose, onSaved }: VariantManagerProps) {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ variants: Variant[] }>(`/api/admin/variants?serviceId=${service.id}`);
      setRows((data.variants ?? []).map(rowFromVariant));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load variants.");
    } finally {
      setLoading(false);
    }
  }, [service.id]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function updateRow(index: number, patch: Partial<VariantRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyVariantRow()]);
  }

  async function removeRow(index: number) {
    const row = rows[index];
    if (!row.id) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setRowBusy(index);
    setError(null);
    try {
      const res = await apiFetch<{ deactivated?: boolean }>("/api/admin/variants", jsonInit("DELETE", { id: row.id }));
      if (res.deactivated) {
        // Kept for booking history — reflect it as inactive rather than dropping it.
        updateRow(index, { isActive: false });
      } else {
        setRows((prev) => prev.filter((_, i) => i !== index));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete variant.");
    } finally {
      setRowBusy(null);
    }
  }

  async function saveAll() {
    // Validate every row before sending the bulk table.
    const variants: Array<{
      id?: string;
      size: string | null;
      length: string | null;
      label: string;
      priceCents: number;
      priceFrom: boolean;
      durationMinutes: number;
      sortOrder: number;
      isActive: boolean;
    }> = [];
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const label = r.label.trim();
      if (!label) {
        setError(`Row ${i + 1}: label is required.`);
        return;
      }
      const priceCents = parseDollarsToCents(r.priceDollars);
      if (priceCents == null || priceCents < 0) {
        setError(`Row ${i + 1}: enter a valid price.`);
        return;
      }
      const durationMinutes = parseWholeNumber(r.durationMinutes);
      if (durationMinutes == null || durationMinutes <= 0) {
        setError(`Row ${i + 1}: duration must be a positive number.`);
        return;
      }
      variants.push({
        ...(r.id ? { id: r.id } : {}),
        size: r.size.trim() || null,
        length: r.length.trim() || null,
        label,
        priceCents,
        priceFrom: r.priceFrom,
        durationMinutes,
        sortOrder: i,
        isActive: r.isActive,
      });
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/variants", jsonInit("PUT", { serviceId: service.id, variants }));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save variants.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Variants — ${service.name}`} wide onClose={onClose}>
      <p className="mb-3 text-sm text-muted-foreground">
        Each row is a bookable option. Enter the price in dollars; check &ldquo;from&rdquo; for a starting-at price
        (&ldquo;$60+&rdquo;) confirmed at the appointment.
      </p>

      {loading ? (
        <div className="flex items-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading variants…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Label</th>
                  <th className="px-2 py-2">Size</th>
                  <th className="px-2 py-2">Length</th>
                  <th className="px-2 py-2">Price ($)</th>
                  <th className="px-2 py-2">From</th>
                  <th className="px-2 py-2">Min</th>
                  <th className="px-2 py-2">Active</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">
                      No variants yet. Add the first row.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.id ?? `new-${i}`} className="border-b border-border">
                      <td className="px-2 py-2">
                        <input className={inputClass} value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })} placeholder="Medium / Shoulder" />
                      </td>
                      <td className="px-2 py-2">
                        <input className={inputClass} value={r.size} onChange={(e) => updateRow(i, { size: e.target.value })} placeholder="—" />
                      </td>
                      <td className="px-2 py-2">
                        <input className={inputClass} value={r.length} onChange={(e) => updateRow(i, { length: e.target.value })} placeholder="—" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="0" step="0.01" className={inputClass} value={r.priceDollars} onChange={(e) => updateRow(i, { priceDollars: e.target.value })} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-input" checked={r.priceFrom} onChange={(e) => updateRow(i, { priceFrom: e.target.checked })} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="1" className={`${inputClass} w-20`} value={r.durationMinutes} onChange={(e) => updateRow(i, { durationMinutes: e.target.value })} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-input" checked={r.isActive} onChange={(e) => updateRow(i, { isActive: e.target.checked })} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button size="icon" variant="ghost" aria-label="Remove variant" disabled={rowBusy === i} onClick={() => removeRow(i)}>
                          {rowBusy === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" />
              Add row
            </Button>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="bg-brand-500 hover:bg-brand-600" onClick={saveAll} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  Save price table
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ============================== PRIMITIVES ============================== */

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`my-8 w-full ${wide ? "max-w-4xl" : "max-w-2xl"} rounded-xl border border-border bg-background p-6 shadow-lg`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormActions({ saving, onClose, label }: { saving: boolean; onClose: () => void; label: string }) {
  return (
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
            {label}
          </>
        )}
      </Button>
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
