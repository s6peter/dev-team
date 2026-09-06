"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Pencil, Plus, Save, ShoppingBag, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";

interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number | null;
  sort_order: number;
  is_active: boolean;
}

interface ProductDraft {
  id: string | null;
  name: string;
  category: string;
  description: string;
  priceDollars: string;
  imageUrl: string;
  stock: string;
  sortOrder: string;
  isActive: boolean;
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

function emptyDraft(): ProductDraft {
  return { id: null, name: "", category: "", description: "", priceDollars: "", imageUrl: "", stock: "", sortOrder: "", isActive: true };
}

function draftFromProduct(p: Product): ProductDraft {
  return {
    id: p.id,
    name: p.name,
    category: p.category ?? "",
    description: p.description ?? "",
    priceDollars: (p.price_cents / 100).toFixed(2),
    imageUrl: p.image_url ?? "",
    stock: p.stock === null ? "" : String(p.stock),
    sortOrder: String(p.sort_order),
    isActive: p.is_active,
  };
}

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rowBusy, setRowBusy] = useState<string | null>(null); // product id + action
  const [rowError, setRowError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<{ products: Product[] }>("/api/admin/products");
      setProducts(data.products ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load products.");
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

  function startEdit(p: Product) {
    setFormError(null);
    setDraft(draftFromProduct(p));
  }

  function closeForm() {
    setDraft(null);
    setFormError(null);
  }

  function updateDraft(patch: Partial<ProductDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function toggleActive(p: Product) {
    setRowBusy(p.id + "toggle");
    setRowError(null);
    try {
      await apiFetch(
        "/api/admin/products",
        jsonInit("PATCH", {
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          priceCents: p.price_cents,
          imageUrl: p.image_url,
          stock: p.stock,
          sortOrder: p.sort_order,
          isActive: !p.is_active,
        })
      );
      await load();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Could not update product.");
    } finally {
      setRowBusy(null);
    }
  }

  async function deleteProduct(id: string) {
    setRowBusy(id + "delete");
    setRowError(null);
    try {
      await apiFetch("/api/admin/products", jsonInit("DELETE", { id }));
      await load();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Could not delete product.");
    } finally {
      setRowBusy(null);
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
    const name = draft.name.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    const price = Number(draft.priceDollars);
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price.");
      return;
    }
    const priceCents = Math.round(price * 100);

    let stock: number | null = null;
    if (draft.stock.trim() !== "") {
      const s = Number(draft.stock);
      if (!Number.isInteger(s) || s < 0) {
        setFormError("Stock must be a whole number, or leave it blank for unlimited.");
        return;
      }
      stock = s;
    }

    let sortOrder = 99;
    if (draft.sortOrder.trim() !== "") {
      const so = Number(draft.sortOrder);
      if (!Number.isInteger(so)) {
        setFormError("Sort order must be a whole number.");
        return;
      }
      sortOrder = so;
    }

    const body = {
      ...(draft.id ? { id: draft.id } : {}),
      name,
      category: draft.category.trim() || null,
      description: draft.description.trim() || null,
      priceCents,
      imageUrl: draft.imageUrl.trim() || null,
      stock,
      sortOrder,
      isActive: draft.isActive,
    };

    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/products", jsonInit(draft.id ? "PATCH" : "POST", body));
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Shop</h2>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600" onClick={startCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add product
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Manage products for sale. Active products appear in your public shop.
      </p>

      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {rowError && <p className="mb-3 text-sm text-red-600">{rowError}</p>}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No products yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold" title={p.name}>
                    {p.name}
                  </h3>
                  {!p.is_active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {formatCents(p.price_cents)}
                  <span className="mx-1.5">·</span>
                  {p.stock === null ? "Unlimited stock" : `${p.stock} in stock`}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.is_active}
                  aria-label={p.is_active ? "Deactivate product" : "Activate product"}
                  disabled={rowBusy === p.id + "toggle"}
                  onClick={() => toggleActive(p)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    p.is_active ? "bg-brand-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      p.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rowBusy === p.id + "delete"}
                  onClick={() => deleteProduct(p.id)}
                >
                  {rowBusy === p.id + "delete" ? (
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

      {draft && (
        <ProductForm
          draft={draft}
          saving={saving}
          uploading={uploading}
          error={formError}
          onClose={closeForm}
          onSubmit={submitDraft}
          onChange={updateDraft}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

interface ProductFormProps {
  draft: ProductDraft;
  saving: boolean;
  uploading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<ProductDraft>) => void;
  onUpload: (file: File | null) => void;
}

function ProductForm({ draft, saving, uploading, error, onClose, onSubmit, onChange, onUpload }: ProductFormProps) {
  const busy = saving || uploading;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{draft.id ? "Edit product" : "Add product"}</h2>
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
            <span className="mb-1 block text-sm font-medium">Image</span>
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

          <Field label="Name">
            <input
              className={inputClass}
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Edge control gel"
            />
          </Field>

          <Field label="Category">
            <input
              className={inputClass}
              value={draft.category}
              onChange={(e) => onChange({ category: e.target.value })}
              placeholder="e.g. Aftercare"
            />
          </Field>

          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Optional details about this product."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Price ($)">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.priceDollars}
                onChange={(e) => onChange({ priceDollars: e.target.value })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Stock">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={draft.stock}
                onChange={(e) => onChange({ stock: e.target.value })}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Sort order">
              <input
                className={inputClass}
                type="number"
                step="1"
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(e) => onChange({ sortOrder: e.target.value })}
                placeholder="99"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input text-brand-500 focus-visible:ring-2 focus-visible:ring-ring"
              checked={draft.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
            />
            <span className="text-sm font-medium">Active (visible in the shop)</span>
          </label>

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
                  {draft.id ? "Save changes" : "Add product"}
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
