"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
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

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const UNCATEGORIZED = "Uncategorized";

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

/** Derive a friendly title from a file name, falling back to the category. */
function titleFromFile(file: File, category: string): string {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || category.trim() || "Portfolio photo";
}

export function AdminPortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [deleteBusy, setDeleteBusy] = useState<string | null>(null); // item id being deleted
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Multi-upload panel state.
  const [category, setCategory] = useState("");
  const [hairLength, setHairLength] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploadNotice(null);
    setUploadError(null);
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadAll() {
    const cat = category.trim();
    if (!cat) {
      setUploadError("Choose a category for these photos.");
      return;
    }
    if (files.length === 0) {
      setUploadError("Select one or more photos to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadNotice(null);
    setProgress({ done: 0, total: files.length });

    const len = hairLength.trim() || null;
    let succeeded = 0;
    const failures: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 1) Upload the raw image, get back a public URL.
        const fd = new FormData();
        fd.append("file", file);
        const up = await apiFetch<{ url?: string }>("/api/admin/upload", { method: "POST", body: fd });
        if (!up.url) throw new Error("Upload did not return a URL.");

        // 2) Create the portfolio row in the chosen category.
        await apiFetch(
          "/api/admin/portfolio",
          jsonInit("POST", {
            title: titleFromFile(file, cat),
            description: null,
            imageUrl: up.url,
            serviceCategory: cat,
            hairLength: len,
          })
        );
        succeeded += 1;
      } catch (e) {
        failures.push(`${file.name}: ${e instanceof Error ? e.message : "failed"}`);
      } finally {
        setProgress({ done: i + 1, total: files.length });
      }
    }

    setUploading(false);
    setProgress(null);

    if (succeeded > 0) {
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    }
    if (failures.length > 0) {
      setUploadError(`${failures.length} photo(s) failed. ${failures[0]}`);
    } else {
      setUploadNotice(`Added ${succeeded} photo${succeeded === 1 ? "" : "s"} to "${cat}".`);
    }
  }

  // Existing categories power the datalist suggestions.
  const categorySuggestions = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => i.service_category).filter((c): c is string => c !== null && c.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  // Group items by category for the grid below.
  const groups = useMemo(() => {
    const map = new Map<string, PortfolioItem[]>();
    for (const item of items) {
      const key = item.service_category?.trim() || UNCATEGORIZED;
      const arr = map.get(key);
      if (arr) arr.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === UNCATEGORIZED) return 1;
      if (b[0] === UNCATEGORIZED) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [items]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ImagePlus className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-semibold">Portfolio</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Upload multiple photos at once into a style category. They appear in your public gallery, grouped by category.
      </p>

      {/* Multi-upload panel */}
      <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Category</span>
            <input
              className={inputClass}
              list="portfolio-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Knotless Braids"
              disabled={uploading}
            />
            <datalist id="portfolio-categories">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Hair length <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input
              className={inputClass}
              value={hairLength}
              onChange={(e) => setHairLength(e.target.value)}
              placeholder="e.g. Waist-length"
              disabled={uploading}
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-sm font-medium">Photos</span>
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-brand-500 hover:text-brand-600 ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Upload className="h-5 w-5" />
            Click to choose one or more images
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="group relative overflow-hidden rounded-lg border border-border">
                <div className="aspect-square w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                </div>
                {!uploading && (
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            className="bg-brand-500 hover:bg-brand-600"
            onClick={uploadAll}
            disabled={uploading || files.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Uploading {progress ? `${progress.done}/${progress.total}` : ""}
              </>
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" />
                Upload {files.length > 0 ? `${files.length} photo${files.length === 1 ? "" : "s"}` : "photos"}
              </>
            )}
          </Button>
          {files.length > 0 && !uploading && (
            <Button variant="outline" onClick={() => setFiles([])}>
              Clear
            </Button>
          )}
          {uploadError && <span className="text-sm text-red-600">{uploadError}</span>}
          {uploadNotice && <span className="text-sm text-green-600">{uploadNotice}</span>}
        </div>
      </div>

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
          <p className="text-muted-foreground">No portfolio photos yet. Upload your first ones above.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([groupName, groupItems]) => (
            <section key={groupName}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-base font-semibold capitalize">{groupName}</h3>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                  {groupItems.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {groupItems.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-xl border border-border">
                    <div className="aspect-square w-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${item.title}`}
                      disabled={deleteBusy === item.id}
                      onClick={() => deleteItem(item.id)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 disabled:opacity-100"
                    >
                      {deleteBusy === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    {item.hair_length && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs capitalize text-white">
                        {item.hair_length}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
