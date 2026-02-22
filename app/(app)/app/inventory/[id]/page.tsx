import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/inventory";
import { ItemQuickEditForm } from "../item-quick-edit-form";
import { PhotoGallery } from "../photo-gallery";

export const dynamic = "force-dynamic";

export default async function InventoryItemDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { account, membership } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  const { data: item } = await supabase
    .from("inventory_items")
    .select(
      "id, title, description, condition, condition_notes, internal_category, item_specifics, brand, model, mpn, upc, status, qty_on_hand, qty_listed, qty_sold, unit_cost, list_price, pricing_notes, location_bin, acquisition_source, acquisition_date, listed_at, updated_at"
    )
    .eq("account_id", account.id)
    .eq("id", params.id)
    .maybeSingle();
  if (!item) notFound();

  const { data: photos } = await supabase
    .from("inventory_photos")
    .select("id, object_key, object_url, display_order")
    .eq("account_id", account.id)
    .eq("inventory_item_id", params.id)
    .order("display_order", { ascending: true });

  const { data: allItems } = await supabase
    .from("inventory_items")
    .select("id, internal_category")
    .eq("account_id", account.id);
  const categories = Array.from(
    new Set((allItems ?? []).map((entry) => entry.internal_category).filter(Boolean))
  ) as string[];

  const { data: lineItemsWithSales } = await supabase
    .from("sale_line_items")
    .select(
      `
      id,
      sale_id,
      qty_sold,
      unit_price,
      sold_unit_cost,
      created_at,
      sales (
        id,
        sale_date,
        channel,
        status
      )
    `
    )
    .eq("inventory_item_id", params.id)
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  type SaleRow = { id: string; sale_date: string; channel: string; status: string };
  type LineRow = {
    id: string;
    sale_id: string;
    qty_sold: number;
    unit_price: number;
    sold_unit_cost: number | null;
    created_at: string;
    sales: SaleRow | SaleRow[] | null;
  };
  const saleHistoryLines = (lineItemsWithSales ?? []) as LineRow[];
  const saleHistory = saleHistoryLines.map((line) => {
    const sale = Array.isArray(line.sales) ? line.sales[0] : line.sales;
    return {
      lineId: line.id,
      saleId: line.sale_id,
      saleDate: sale?.sale_date ?? "",
      channel: sale?.channel ?? "—",
      status: sale?.status ?? "—",
      qtySold: line.qty_sold,
      unitPrice: line.unit_price,
      soldUnitCost: line.sold_unit_cost,
      createdAt: line.created_at,
    };
  });

  const qtyAvailable = Math.max(0, item.qty_on_hand - item.qty_sold);
  const metaLine = [
    `SKU: ${item.id.slice(0, 8).toUpperCase()}`,
    item.internal_category ? `Category: ${item.internal_category}` : "Category: Unset",
    `Status: ${item.status}`,
  ].join(" • ");

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Inventory / Item</p>
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h1 className="text-heading">{item.title}</h1>
        <p className="text-caption mt-1">{metaLine}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[460px_minmax(0,1fr)] xl:grid-cols-[520px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-border shadow-card">
            <CardContent className="pt-6">
              <PhotoGallery
                accountId={account.id}
                itemId={params.id}
                photos={
                  (photos as
                    | {
                        id: string;
                        object_key: string;
                        object_url: string;
                        display_order: number;
                      }[]
                    | null) ?? []
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Item details</CardTitle>
              <CardDescription>Quick-edit essentials here. Use Edit Listing for full fields.</CardDescription>
            </CardHeader>
            <CardContent>
              <ItemQuickEditForm
                accountId={account.id}
                categories={categories}
                item={{
                  id: item.id,
                  title: item.title,
                  status: item.status,
                  condition: item.condition,
                  internal_category: item.internal_category,
                  qty_on_hand: item.qty_on_hand,
                  qty_sold: item.qty_sold,
                  list_price: item.list_price,
                  unit_cost: item.unit_cost,
                  description: item.description,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border shadow-card">
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">List Price</p>
                <p className="text-2xl font-semibold">{formatCurrency(item.list_price)}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-card">
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">List Date</p>
                <p className="text-2xl font-semibold">
                  {item.listed_at ? new Date(item.listed_at).toLocaleDateString() : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-card">
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Qty</p>
                <p className="text-2xl font-semibold">{qtyAvailable}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-card">
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="text-2xl font-semibold capitalize">{item.status}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Channel listing</CardTitle>
                <CardDescription>Future connected listing card (eBay + other channels).</CardDescription>
              </div>
              <Badge variant="warning">PLACEHOLDER</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Placeholder: listing state sync, listing id, channel actions, and external links will show here.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/app/inventory/${params.id}/edit`}>Edit Listing</Link>
                </Button>
                <Button variant="outline" size="sm" disabled>
                  End Listing (placeholder)
                </Button>
                <Button variant="outline" size="sm" disabled>
                  View on Channel (placeholder)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Sale history</CardTitle>
              <CardDescription>Timeline of sales for this item. Latest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {saleHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sales recorded yet for this item. Record a sale from the inventory table or from Sold.
                </p>
              ) : (
                <ul className="space-y-0">
                  {saleHistory.map((entry, index) => {
                    const subtotal = entry.qtySold * entry.unitPrice;
                    const cost = (entry.soldUnitCost ?? 0) * entry.qtySold;
                    const lineProfit = subtotal - cost;
                    return (
                      <li
                        key={entry.lineId}
                        className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-3 ${
                          index > 0 ? "border-t border-border" : ""
                        }`}
                      >
                        <span className="text-sm font-medium text-muted-foreground shrink-0 w-24">
                          {new Date(entry.saleDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-sm capitalize shrink-0">
                          {entry.channel === "EBAY" ? "eBay" : entry.channel === "OFFLINE" ? "Offline" : entry.channel}
                        </span>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {entry.qtySold} × {formatCurrency(entry.unitPrice)} = {formatCurrency(subtotal)}
                        </span>
                        {entry.soldUnitCost != null && (
                          <span className="text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                            Profit {formatCurrency(lineProfit)}
                          </span>
                        )}
                        <Link
                          href={`/app/sold/${entry.saleId}`}
                          className="text-sm text-primary hover:underline ml-auto shrink-0"
                        >
                          View sale →
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Changes summary</CardTitle>
                <CardDescription>Recent updates and sync notes.</CardDescription>
              </div>
              <Badge variant="warning">PLACEHOLDER</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Placeholder: activity log and channel sync events will appear here.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated: {new Date(item.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
