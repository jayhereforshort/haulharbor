import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { NewSaleForm } from "../new-sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const supabase = await createClient();
  const { account, membership } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, title, qty_on_hand")
    .eq("account_id", account.id)
    .gt("qty_on_hand", 0)
    .order("title");

  const inventoryItems = (items ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    qty_on_hand: r.qty_on_hand,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/sold" aria-label="Back to sales">
            ←
          </Link>
        </Button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sold
          </p>
          <h1 className="text-display">New sale</h1>
          <p className="text-caption mt-1">
            Record a manual or offline sale. Select items and quantities; qty on hand will be reduced when you save.
          </p>
        </div>
      </div>

      <NewSaleForm accountId={account.id} inventoryItems={inventoryItems} />
    </div>
  );
}
