"use client";

import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  service_category: string | null;
  hair_length: string | null;
  sort_order: number;
}

interface PortfolioDraft {
  id: string | null;
  title: string;
  description: string;
  imageUrl: string;
  serviceCategory: string;
  hairLength: string;
}

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

function emptyDraft(): PortfolioDraft {
  return { id: null, title: "", description: "", imageUrl: "", serviceCategory: "", hairLength: "" };
}

function draftFromItem(item: PortfolioItem): PortfolioDraft {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    imageUrl: item.image_url,
    serviceCategory: item.service_category ?? "",
    hairLength: item.hair_length ?? "",
  };
}

export function AdminPortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [deleteBusy, setDeleteBusy] = useState<string | null>(null); // item id being deleted
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<{ items: PortfolioItem[] }>("/api/admin/portfolio");
      setItems(data.items ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load portfolio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setFormError(null);
    setDraft(emptyDraft());
  }

  function startEdit(item: PortfolioItem) {
    setFormError(null);
    setDraft(draftFromItem(item));
  }

  function closeForm() {
    setDraft(null);
    setFormError(null);
  }

  function updateDraft(patch: Partial<PortfolioDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function deleteItem(id: string) {
    setDeleteBusy(id);
    setDeleteError(null);
    try {
      await apiFetch("/api/admin/portfolio", jsonInit("DELETE", { id }));
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete photo.");
    } finally {
      setDeleteBusy(null);
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Do not set Content-Type — the browser adds the multipart boundary.
      const data = await apiFetch<{ url?: string }>("/api/admin/upload", { method: "POST", body: fd });
      if (!data.url) throw new Error("Upload did not return a URL.");
      updateDraft({ imageUrl: data.url });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function submitDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setFormError("Title is required.");
      return;
    }
    if (!draft.imageUrl.trim()) {
      setFormError("Upload a photo first.");
      return;
    }

    const body = {
      ...(draft.id ? { id: draft.id } : {}),
      title,
      description: draft.description.trim() || null,
      imageUrl: draft.imageUrl,
      serviceCategory: draft.serviceCategory.trim() || null,
      hairLength: draft.hairLength.trim() || null,
    };

    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/portfolio", jsonInit(draft.id ? "PATCH" : "POST", body));
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save photo.");
    } finally {
      setSaving(false);
    }
  }

  // Free-text categories double as select suggestions, drawn from existing items.
  const categorySuggestions = Array.from(
    new Set(items.map((i) => i.service_category).filter((c): c is string => c !== null && c.trim() !== ""))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Portfolio</h2>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600" onClick={startCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add photo
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Showcase your work. Photos appear in your public gallery.
      </p>

      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No portfolio photos yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-border">
              <div className="aspect-[4/3] w-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="truncate font-semibold" title={item.title}>
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                )}
                {(item.service_category || item.hair_length) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.service_category && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs capitalize text-brand-600">
                        {item.service_category}
                      </span>
                    )}
                    {item.hair_length && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {item.hair_length}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteBusy === item.id}
                    onClick={() => deleteItem(item.id)}
                  >
                    {deleteBusy === item.id ? (
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
            </div>
          ))}
        </div>
      )}

      {draft && (
        <PortfolioForm
          draft={draft}
          saving={saving}
          uploading={uploading}
          error={formError}
          categorySuggestions={categorySuggestions}
          onClose={closeForm}
          onSubmit={submitDraft}
          onChange={updateDraft}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

interface PortfolioFormProps {
  draft: PortfolioDraft;
  saving: boolean;
  uploading: boolean;
  error: string | null;
  categorySuggestions: string[];
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<PortfolioDraft>) => void;
  onUpload: (file: File | null) => void;
}

function PortfolioForm({
  draft,
  saving,
  uploading,
  error,
  categorySuggestions,
  onClose,
  onSubmit,
  onChange,
  onUpload,
}: PortfolioFormProps) {
  const busy = saving || uploading;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{draft.id ? "Edit photo" : "Add photo"}</h2>
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
          <div>
            <span className="mb-1 block text-sm font-medium">Photo</span>
            <label className="flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-brand-500 hover:text-brand-600">
              {uploading ? (
                <span className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading…
                </span>
              ) : draft.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.imageUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-sm">
                  <Upload className="h-6 w-6" />
                  Click to upload
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            {draft.imageUrl && !uploading && (
              <p className="mt-1 text-xs text-muted-foreground">Click the image to replace it.</p>
            )}
          </div>

          <Field label="Title">
            <input
              className={inputClass}
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g. Balayage transformation"
            />
          </Field>

          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Optional details about this look."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Service category">
              <input
                className={inputClass}
                list="portfolio-categories"
                value={draft.serviceCategory}
                onChange={(e) => onChange({ serviceCategory: e.target.value })}
                placeholder="e.g. Color"
              />
              <datalist id="portfolio-categories">
                {categorySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Hair length">
              <input
                className={inputClass}
                value={draft.hairLength}
                onChange={(e) => onChange({ hairLength: e.target.value })}
                placeholder="e.g. Long"
              />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={busy}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  {draft.id ? "Save changes" : "Add photo"}
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
