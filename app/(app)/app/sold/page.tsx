import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { SoldTable } from "./sold-table";
import { SoldFilters } from "./sold-filters";

type SearchParams = {
  channel?: string;
  status?: string;
  search?: string;
};

export const dynamic = "force-dynamic";

export default async function SoldPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const rawSales = (sales ?? []).map((s) => ({
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

  const inventoryIds = [
    ...new Set(
      rawSales.flatMap((s) => s.line_items.map((l) => l.inventory_item_id))
    ),
  ];
  const { data: invRows } =
    inventoryIds.length > 0
      ? await supabase
          .from("inventory_items")
          .select("id, title")
          .in("id", inventoryIds)
      : { data: [] };
  const titleById: Record<string, string> = Object.fromEntries(
    (invRows ?? []).map((r) => [r.id, r.title as string])
  );

  const search = (searchParams.search ?? "").trim().toLowerCase();
  const filtered = rawSales.filter((sale) => {
    if (searchParams.channel && sale.channel !== searchParams.channel) return false;
    if (searchParams.status && sale.status !== searchParams.status) return false;
    if (search && sale.buyer) {
      if (!sale.buyer.toLowerCase().includes(search)) return false;
    } else if (search && !sale.buyer) return false;
    return true;
  });

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

      <SoldFilters
        searchParams={{
          channel: searchParams.channel,
          status: searchParams.status,
          search: searchParams.search,
        }}
      />

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-subheading">Sales</h2>
            <p className="text-caption">Table view by date. Open a row or use Actions to view details.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} sale(s)
            {filtered.length !== rawSales.length ? ` (filtered from ${rawSales.length})` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <SoldTable sales={filtered} titleById={titleById} />
        </div>
      </section>
    </div>
  );
}
