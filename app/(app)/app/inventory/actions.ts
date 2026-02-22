"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";

export async function deleteInventoryItem(itemId: string) {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", itemId)
    .eq("account_id", account.id);

  if (error) return { error: error.message };
  revalidatePath("/app/inventory");
  revalidatePath("/app");
  return { ok: true };
}
