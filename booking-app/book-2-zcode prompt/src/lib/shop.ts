import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OrderItem = { product_id?: string; qty?: number };

/**
 * Mark a shop order 'paid' and decrement tracked product stock — IDEMPOTENT.
 * The status flip is guarded by `.eq("status","pending")` and `.select()` tells us
 * whether THIS call performed the pending→paid transition; stock is only
 * decremented on that transition, so the client confirm + the Stripe webhook
 * can both call this without double-decrementing (or overselling).
 * Returns true if this call marked it paid, false if it was already paid/missing.
 */
export async function markShopOrderPaid(orderId: string, paymentIntentId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data: updated } = await supabase
    .from("product_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id,items");
  if (!updated || updated.length === 0) return false; // already paid / not found → no re-decrement

  const items = (updated[0].items as OrderItem[]) ?? [];
  for (const it of items) {
    if (!it.product_id || !it.qty) continue;
    const { data: prod } = await supabase.from("products").select("stock").eq("id", it.product_id).maybeSingle();
    if (prod && prod.stock != null) {
      await supabase.from("products").update({ stock: Math.max(0, prod.stock - it.qty) }).eq("id", it.product_id);
    }
  }
  return true;
}
