import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { InventoryTable } from "./inventory-table";
import { InventoryFilters } from "./inventory-filters";
import { QuickAddInventoryModal } from "./quick-add-inventory-modal";

type SearchParams = {
  status?: string;
  ebay?: string;
  category?: string;
  lot?: string;
  search?: string;
};

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const { account, membership } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  const { data: items } = await supabase
    .from("inventory_items")
    .select(
      "id, title, description, status, internal_category, list_price, unit_cost, qty_on_hand, qty_listed, acquisition_source, created_at"
    )
    .eq("account_id", account.id)
    .order("updated_at", { ascending: false });

  const rawItems =
    (items as
      | {
          id: string;
          title: string;
          description: string | null;
          status: string;
          internal_category: string | null;
          list_price: number | null;
          unit_cost: number | null;
          qty_on_hand: number;
          qty_listed: number;
          acquisition_source: string | null;
          created_at: string;
        }[]
      | null) ?? [];

  const search = (searchParams.search ?? "").trim().toLowerCase();

  const filtered = rawItems.filter((item) => {
    if (searchParams.status && item.status !== searchParams.status) return false;
    if (searchParams.ebay === "listed" && item.qty_listed <= 0) return false;
    if (searchParams.ebay === "unlisted" && item.qty_listed > 0) return false;
    if (searchParams.category && item.internal_category !== searchParams.category)
      return false;
    if (searchParams.lot === "yes" && item.acquisition_source !== "lot") return false;
    if (searchParams.lot === "no" && item.acquisition_source === "lot") return false;
    if (search) {
      const inTitle = item.title.toLowerCase().includes(search);
      const inDesc = (item.description ?? "").toLowerCase().includes(search);
      if (!inTitle && !inDesc) return false;
    }
    return true;
  });

  const uniqueCategories = Array.from(
    new Set(rawItems.map((item) => item.internal_category).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inventory
          </p>
          <h1 className="text-display">Active inventory</h1>
          <p className="text-caption mt-1">
            Manage SKUs, availability, and channel readiness in your workspace.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/app/sold">View sold</Link>
          </Button>
          <QuickAddInventoryModal accountId={account.id} categories={uniqueCategories} />
        </div>
      </div>

      <InventoryFilters
        searchParams={{
          status: searchParams.status,
          ebay: searchParams.ebay,
          category: searchParams.category,
          lot: searchParams.lot,
          search: searchParams.search,
        }}
        categories={uniqueCategories}
      />

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-subheading">Items</h2>
            <p className="text-caption">Inline updates keep workflow aligned.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} item(s)
            {filtered.length !== rawItems.length ? ` (filtered from ${rawItems.length})` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <InventoryTable items={filtered} />
        </div>
      </section>
    </div>
  );
}
