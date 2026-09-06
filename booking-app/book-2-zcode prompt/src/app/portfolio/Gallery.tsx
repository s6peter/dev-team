"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Ruler, X } from "lucide-react";

export interface GalleryPhoto {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  hair_length: string | null;
}

export interface GalleryCategory {
  name: string;
  photos: GalleryPhoto[];
}

/**
 * Customer-facing portfolio: one tile per category (cover = first photo +
 * count badge). Clicking a tile opens a full-screen lightbox that browses
 * every photo in that category with prev/next, keyboard, and close.
 */
export function Gallery({ categories }: { categories: GalleryCategory[] }) {
  // Which category's lightbox is open, and the active photo within it.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const activeCategory = openIndex === null ? null : categories[openIndex];
  const photos = activeCategory?.photos ?? [];
  const activePhoto = photos[photoIndex];

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setPhotoIndex((i) => (photos.length ? (i + 1) % photos.length : 0));
  }, [photos.length]);
  const prev = useCallback(() => {
    setPhotoIndex((i) => (photos.length ? (i - 1 + photos.length) % photos.length : 0));
  }, [photos.length]);

  function openCategory(index: number) {
    setPhotoIndex(0);
    setOpenIndex(index);
  }

  // Keyboard navigation + scroll lock while the lightbox is open.
  useEffect(() => {
    if (openIndex === null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, close, next, prev]);

  return (
    <>
      {/* Category tiles */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => {
          const cover = category.photos[0];
          return (
            <button
              key={category.name}
              type="button"
              onClick={() => openCategory(index)}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-muted text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              aria-label={`View ${category.photos.length} ${category.name} photos`}
            >
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.image_url}
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              )}
              {/* Gradient + label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-luxury-black/80 via-luxury-black/20 to-transparent p-5">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white">
                  <Images className="h-3.5 w-3.5" aria-hidden="true" />
                  {category.photos.length} photo{category.photos.length === 1 ? "" : "s"}
                </span>
                <h2 className="mt-2 text-xl font-bold capitalize text-white drop-shadow">{category.name}</h2>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {activeCategory && activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeCategory.name} gallery`}
          className="fixed inset-0 z-50 flex flex-col bg-luxury-black/95"
          onClick={close}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-4 text-white sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize">{activeCategory.name}</p>
              <p className="text-xs text-white/70">
                {photoIndex + 1} of {photos.length}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close gallery"
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stage */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-16">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous photo"
                className="absolute left-2 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-brand-500 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto.image_url}
              alt={activePhoto.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next photo"
                className="absolute right-2 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-brand-500 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Caption */}
          <div
            className="px-4 pb-6 pt-3 text-center text-white sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{activePhoto.title}</h3>
            {activePhoto.description && (
              <p className="mx-auto mt-1 max-w-xl text-sm text-white/70">{activePhoto.description}</p>
            )}
            {activePhoto.hair_length && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
                <Ruler className="h-3 w-3" aria-hidden="true" />
                {activePhoto.hair_length}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
