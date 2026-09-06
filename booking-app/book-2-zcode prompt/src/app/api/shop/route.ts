import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/**
 * GET /api/shop — public storefront listing: active products for the owner,
 * ordered by sort_order. RLS pub_read exposes only active rows.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id,name,category,description,price_cents,image_url,stock,sort_order")
    .eq("stylist_id", STYLIST_ID)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("shop list failed", error);
    return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  }

  return NextResponse.json({ products: products ?? [] });
}
