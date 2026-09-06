import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/**
 * GET /api/shop — public storefront listing: active products for the owner,
 * ordered by sort_order. RLS pub_read exposes only active rows.
 *
 * Each product carries its resolved category NAME (from the managed
 * product_categories table via category_id, falling back to the legacy
 * free-text `category` column) and its optional `video_url`. The response
 * also includes the managed category list so the storefront can render the
 * category tiles even when a category has no active products yet.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,category,category_id,description,price_cents,image_url,video_url,stock,sort_order,product_categories(name)"
      )
      .eq("stylist_id", STYLIST_ID)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("product_categories")
      .select("id,name,sort_order")
      .eq("stylist_id", STYLIST_ID)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (productsRes.error) {
    console.error("shop list failed", productsRes.error);
    return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  }

  const products = (productsRes.data ?? []).map((p: any) => {
    // The embedded relation may come back as an object or a single-element array.
    const joined = Array.isArray(p.product_categories)
      ? p.product_categories[0]
      : p.product_categories;
    const categoryName: string | null =
      joined?.name ?? (p.category?.trim() || null);
    const { product_categories: _drop, ...rest } = p;
    return { ...rest, category: categoryName };
  });

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return NextResponse.json({ products, categories });
}
