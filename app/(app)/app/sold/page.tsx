import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { SoldTable } from "./sold-table";

export const dynamic = "force-dynamic";

export default async function SoldPage() {
  const supabase = await createClient();
  const { account, membership } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  const { data: sales } = await supabase
    .from("sales")
    .select(
      `
      id,
      account_id,
      channel,
      buyer,
      sale_date,
      status,
      fees,
      taxes,
      shipping,
      created_at,
      updated_at,
      sale_line_items (
        id,
        sale_id,
        account_id,
        inventory_item_id,
        qty_sold,
        unit_price,
        sold_unit_cost,
        line_fees,
        line_taxes,
        line_shipping,
        created_at,
        updated_at
      )
    `
    )
    .eq("account_id", account.id)
    .order("sale_date", { ascending: false });

  const salesWithLines = (sales ?? []).map((s) => ({
    ...s,
    line_items: (s.sale_line_items ?? []) as {
      id: string;
      sale_id: string;
      account_id: string;
      inventory_item_id: string;
      qty_sold: number;
      unit_price: number;
      sold_unit_cost: number | null;
      line_fees: number;
      line_taxes: number;
      line_shipping: number;
      created_at: string;
      updated_at: string;
    }[],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sold
          </p>
          <h1 className="text-display">Sales</h1>
          <p className="text-caption mt-1">
            Sales from eBay, offline, or wholesale. Record manual sales and track
            gross, fees, and profit.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild>
            <Link href="/app/sold/new">New sale</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/inventory">Inventory</Link>
          </Button>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-subheading">All sales</h2>
            <p className="text-caption">Table view by date. Open a row for details.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {salesWithLines.length} sale(s)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <SoldTable sales={salesWithLines} />
        </div>
      </section>
    </div>
  );
}
