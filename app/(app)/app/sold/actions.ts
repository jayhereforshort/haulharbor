"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";

export type CreateSaleLineInput = {
  inventory_item_id: string;
  qty_sold: number;
  unit_price: number;
  sold_unit_cost?: number | null;
  line_fees?: number;
  line_taxes?: number;
  line_shipping?: number;
};

export async function createSale(
  input: {
    channel: "EBAY" | "OFFLINE" | "WHOLESALE";
    buyer?: string | null;
    sale_date: string;
    status?: string;
    fees?: number;
    taxes?: number;
    shipping?: number;
    line_items: CreateSaleLineInput[];
  }
) {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) return { error: "Unauthorized" };

  if (!input.line_items.length) {
    return { error: "Add at least one line item." };
  }

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      account_id: account.id,
      channel: input.channel,
      buyer: input.buyer?.trim() || null,
      sale_date: input.sale_date,
      status: input.status ?? "paid",
      fees: input.fees ?? 0,
      taxes: input.taxes ?? 0,
      shipping: input.shipping ?? 0,
    })
    .select("id")
    .single();

  if (saleError) return { error: saleError.message };
  if (!sale) return { error: "Failed to create sale" };

  const rows = input.line_items.map((l) => ({
    sale_id: sale.id,
    account_id: account.id,
    inventory_item_id: l.inventory_item_id,
    qty_sold: l.qty_sold,
    unit_price: l.unit_price,
    sold_unit_cost: l.sold_unit_cost ?? null,
    line_fees: l.line_fees ?? 0,
    line_taxes: l.line_taxes ?? 0,
    line_shipping: l.line_shipping ?? 0,
  }));

  const { error: linesError } = await supabase
    .from("sale_line_items")
    .insert(rows);

  if (linesError) {
    return { error: linesError.message };
  }

  revalidatePath("/app/sold");
  revalidatePath("/app/inventory");
  return { ok: true, saleId: sale.id };
}

/** Delete a sale. Line items are cascade-deleted; trigger restores qty_on_hand / qty_sold for each item. */
export async function deleteSale(saleId: string) {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId)
    .eq("account_id", account.id);

  if (error) return { error: error.message };
  revalidatePath("/app/sold");
  revalidatePath("/app/inventory");
  revalidatePath("/app");
  return { ok: true };
}
