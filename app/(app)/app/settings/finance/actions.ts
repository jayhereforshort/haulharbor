"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";

export async function getMoneyEventsForItem(
  accountId: string,
  inventoryItemId: string
) {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account || account.id !== accountId) return null;

  const { data, error } = await supabase
    .from("money_events")
    .select("id, event_type, amount, source, channel, sale_id, created_at")
    .eq("account_id", accountId)
    .eq("inventory_item_id", inventoryItemId)
    .order("created_at", { ascending: false });

  if (error) return null;
  return data;
}
