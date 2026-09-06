"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderPlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";

/* ----------------------------------------------------------------------------
 * Shop manager, mirroring AdminServices: managed category TILES across the top
 * (create / rename / reorder / delete) → products within the selected category.
 * Each product carries a photo and a short video. Money is entered in dollars
 * and converted to integer cents before hitting the API.
 * ------------------------------------------------------------------------- */

interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  category_id: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  video_url: string | null;
  stock: number | null;
  sort_order: number;
  is_active: boolean;
}

interface CategoryDraft {
  id: string | null;
  name: string;
  sortOrder: string;
  isActive: boolean;
}

interface ProductDraft {
  id: string | null;
  categoryId: string;
  name: string;
  description: string;
  priceDollars: string;
  imageUrl: string;
  videoUrl: string;
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

function emptyCategoryDraft(nextSort: number): CategoryDraft {
  return { id: null, name: "", sortOrder: String(nextSort), isActive: true };
}

function draftFromCategory(c: Category): CategoryDraft {
  return { id: c.id, name: c.name, sortOrder: String(c.sort_order), isActive: c.is_active };
}

function emptyProductDraft(categoryId: string, nextSort: number): ProductDraft {
  return {
    id: null,
    categoryId,
    name: "",
    description: "",
    priceDollars: "",
    imageUrl: "",
    videoUrl: "",
    stock: "",
    sortOrder: String(nextSort),
    isActive: true,
  };
}

function draftFromProduct(p: Product): ProductDraft {
  return {
    id: p.id,
    categoryId: p.category_id ?? "",
    name: p.name,
    description: p.description ?? "",
    priceDollars: (p.price_cents / 100).toFixed(2),
    imageUrl: p.image_url ?? "",
    videoUrl: p.video_url ?? "",
    stock: p.stock === null ? "" : String(p.stock),
    sortOrder: String(p.sort_order),
    isActive: p.is_active,
  };
}

export function AdminProducts() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [categoryBusy, setCategoryBusy] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [rowBusy, setRowBusy] = useState<string | null>(null); // product id + action
  const [rowError, setRowError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, p] = await Promise.all([
        apiFetch<{ categories: Category[] }>("/api/admin/product-categories"),
        apiFetch<{ products: Product[] }>("/api/admin/products"),
      ]);
      const cats = c.categories ?? [];
      setCategories(cats);
      setProducts(p.products ?? []);
      setSelectedCategoryId((prev) => {
        if (prev && cats.some((cat) => cat.id === prev)) return prev;
        return cats[0]?.id ?? null;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load shop.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------ categories ---------------------------- */

  async function saveCategory() {
    if (!categoryDraft) return;
    const name = categoryDraft.name.trim();
    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }
    let sortOrder = 99;
    if (categoryDraft.sortOrder.trim() !== "") {
      const so = Number(categoryDraft.sortOrder);
      if (!Number.isInteger(so)) {
        setCategoryError("Sort order must be a whole number.");
        return;
      }
      sortOrder = so;
    }
    const body = {
      ...(categoryDraft.id ? { id: categoryDraft.id } : {}),
      name,
      sortOrder,
      isActive: categoryDraft.isActive,
    };
    setCategoryBusy("save");
    setCategoryError(null);
    try {
      const res = await apiFetch<{ id?: string }>(
        "/api/admin/product-categories",
        jsonInit(categoryDraft.id ? "PATCH" : "POST", body)
      );
      const newId = res.id ?? null;
      setCategoryDraft(null);
      await load();
      if (newId) setSelectedCategoryId(newId);
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "Could not save category.");
    } finally {
      setCategoryBusy(null);
    }
  }

  async function deleteCategory(c: Category) {
    setCategoryBusy(c.id);
    setCategoryError(null);
    try {
      const res = await apiFetch<{ deactivated?: boolean }>(
        "/api/admin/product-categories",
        jsonInit("DELETE", { id: c.id })
      );
      if (res.deactivated)
        setCategoryError(`"${c.name}" still has products, so it was deactivated instead of deleted.`);
      await load();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "Could not delete category.");
    } finally {
      setCategoryBusy(null);
    }
  }

  /* ------------------------------- products ----------------------------- */

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
          categoryId: p.category_id,
          description: p.description,
          priceCents: p.price_cents,
          imageUrl: p.image_url,
          videoUrl: p.video_url,
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

  async function submitDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!draft.categoryId) {
      setFormError("Pick a category for this product.");
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

    const selectedCat = categories.find((c) => c.id === draft.categoryId) ?? null;
    const body = {
      ...(draft.id ? { id: draft.id } : {}),
      name,
      categoryId: draft.categoryId,
      // Keep the legacy free-text `category` in sync with the managed tile name.
      category: selectedCat?.name ?? null,
      description: draft.description.trim() || null,
      priceCents,
      imageUrl: draft.imageUrl.trim() || null,
      videoUrl: draft.videoUrl.trim() || null,
      stock,
      sortOrder,
      isActive: draft.isActive,
    };

    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/products", jsonInit(draft.id ? "PATCH" : "POST", body));
      setDraft(null);
      setFormError(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  const productsInCategory = (categoryId: string) =>
    products
      .filter((p) => p.category_id === categoryId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const visibleProducts = selectedCategoryId ? productsInCategory(selectedCategoryId) : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Shop</h2>
        </div>
        <Button
          className="bg-brand-500 hover:bg-brand-600"
          onClick={() => {
            setCategoryError(null);
            setCategoryDraft(emptyCategoryDraft(categories.length + 1));
          }}
        >
          <FolderPlus className="mr-1 h-4 w-4" />
          Add category
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Organize products into categories. Pick a category tile to manage the products inside it. Active products
        appear in your public shop.
      </p>

      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}
      {categoryError && <p className="mb-3 text-sm text-red-600">{categoryError}</p>}
      {rowError && <p className="mb-3 text-sm text-red-600">{rowError}</p>}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No categories yet. Add your first one to start listing products.</p>
        </div>
      ) : (
        <>
          {/* Category tiles */}
          <div className="mb-6 flex flex-wrap gap-3">
            {categories.map((c) => {
              const count = productsInCategory(c.id).length;
              const active = c.id === selectedCategoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`group relative min-w-[9rem] rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                      : "border-border bg-background hover:border-brand-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {!c.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {count} {count === 1 ? "product" : "products"}
                  </div>
                  <span className="mt-2 flex items-center gap-1">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit ${c.name}`}
                      className="rounded p-1 text-muted-foreground hover:bg-brand-100 hover:text-brand-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryError(null);
                        setCategoryDraft(draftFromCategory(c));
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete ${c.name}`}
                      className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(c);
                      }}
                    >
                      {categoryBusy === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Products in the selected category */}
          {selectedCategory && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">
                  {selectedCategory.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}
                  </span>
                </h3>
                <Button
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600"
                  onClick={() => {
                    setFormError(null);
                    setDraft(emptyProductDraft(selectedCategory.id, visibleProducts.length + 1));
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add item
                </Button>
              </div>

              {visibleProducts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No products in this category yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                        {p.video_url && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 p-0.5 text-white">
                            <Video className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-semibold" title={p.name}>
                            {p.name}
                          </h4>
                          {!p.is_active && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Inactive
                            </span>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFormError(null);
                            setDraft(draftFromProduct(p));
                          }}
                        >
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
            </div>
          )}
        </>
      )}

      {categoryDraft && (
        <CategoryForm
          draft={categoryDraft}
          saving={categoryBusy === "save"}
          error={categoryError}
          onClose={() => setCategoryDraft(null)}
          onSubmit={saveCategory}
          onChange={(patch) => setCategoryDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}

      {draft && (
        <ProductForm
          draft={draft}
          categories={categories}
          saving={saving}
          error={formError}
          onClose={() => {
            setDraft(null);
            setFormError(null);
          }}
          onSubmit={submitDraft}
          onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}
    </div>
  );
}

/* ============================== CATEGORY FORM =========================== */

interface CategoryFormProps {
  draft: CategoryDraft;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<CategoryDraft>) => void;
}

function CategoryForm({ draft, saving, error, onClose, onSubmit, onChange }: CategoryFormProps) {
  return (
    <Modal title={draft.id ? "Edit category" : "Add category"} onClose={onClose}>
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
            placeholder="e.g. Aftercare"
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            step="1"
            className={inputClass}
            value={draft.sortOrder}
            onChange={(e) => onChange({ sortOrder: e.target.value })}
            placeholder="99"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-brand-500 focus-visible:ring-2 focus-visible:ring-ring"
            checked={draft.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
          />
          Active (shown in the shop)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormActions saving={saving} onClose={onClose} label={draft.id ? "Save changes" : "Create category"} />
      </form>
    </Modal>
  );
}

/* ============================== PRODUCT FORM ============================ */

interface ProductFormProps {
  draft: ProductDraft;
  categories: Category[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<ProductDraft>) => void;
}

function ProductForm({ draft, categories, saving, error, onClose, onSubmit, onChange }: ProductFormProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const busy = saving || uploadingImage || uploadingVideo;

  async function handleUpload(file: File | null, target: "image" | "video") {
    if (!file) return;
    const setUploading = target === "image" ? setUploadingImage : setUploadingVideo;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Do not set Content-Type — the browser adds the multipart boundary.
      const data = await apiFetch<{ url?: string; kind?: "image" | "video" }>("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      if (!data.url) throw new Error("Upload did not return a URL.");
      if (target === "image") onChange({ imageUrl: data.url });
      else onChange({ videoUrl: data.url });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not upload file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title={draft.id ? "Edit product" : "Add product"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Photo */}
        <div>
          <span className="mb-1 block text-sm font-medium">Photo</span>
          <label className="flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-brand-500 hover:text-brand-600">
            {uploadingImage ? (
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
                Click to upload a photo
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => handleUpload(e.target.files?.[0] ?? null, "image")}
            />
          </label>
          {draft.imageUrl && !uploadingImage && (
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Click the image to replace it.</p>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => onChange({ imageUrl: "" })}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Video */}
        <div>
          <span className="mb-1 block text-sm font-medium">Video (optional, short clip)</span>
          {draft.videoUrl && !uploadingVideo && (
            <video
              src={draft.videoUrl}
              controls
              playsInline
              className="mb-2 aspect-video w-full rounded-xl border border-border bg-black object-contain"
            />
          )}
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
              {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              {uploadingVideo ? "Uploading…" : draft.videoUrl ? "Replace video" : "Upload a video"}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                disabled={busy}
                onChange={(e) => handleUpload(e.target.files?.[0] ?? null, "video")}
              />
            </label>
            {draft.videoUrl && !uploadingVideo && (
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => onChange({ videoUrl: "" })}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

        <Field label="Name">
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Edge control gel"
          />
        </Field>

        <Field label="Category">
          <select
            className={inputClass}
            value={draft.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
          >
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
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

        <FormActions saving={saving} onClose={onClose} label={draft.id ? "Save changes" : "Add product"} busy={busy} />
      </form>
    </Modal>
  );
}

/* ============================== PRIMITIVES ============================== */

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg">
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

function FormActions({
  saving,
  onClose,
  label,
  busy,
}: {
  saving: boolean;
  onClose: () => void;
  label: string;
  busy?: boolean;
}) {
  const disabled = busy ?? saving;
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
        Cancel
      </Button>
      <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={disabled}>
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
