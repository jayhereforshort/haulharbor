import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  saleCost,
  saleNet,
  saleProfit,
  saleProfitMargin,
  saleGross,
} from "@/lib/sales";
import { DeleteSaleButton } from "./delete-sale-button";

export const dynamic = "force-dynamic";

function channelLabel(channel: string): string {
  if (channel === "EBAY") return "eBay";
  if (channel === "OFFLINE") return "Offline";
  if (channel === "WHOLESALE") return "Wholesale";
  return channel;
}

export default async function SaleDetailPage({
  params,
}: {
  params: { saleId: string };
}) {
  const supabase = await createClient();
  const { account, membership } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, account_id, channel, buyer, sale_date, status, fees, taxes, shipping, created_at, updated_at"
    )
    .eq("account_id", account.id)
    .eq("id", params.saleId)
    .maybeSingle();

  if (!sale) notFound();

  const { data: lineItems } = await supabase
    .from("sale_line_items")
    .select(
      "id, inventory_item_id, qty_sold, unit_price, sold_unit_cost, line_fees, line_taxes, line_shipping"
    )
    .eq("sale_id", params.saleId)
    .order("created_at", { ascending: true });

  const items = (lineItems ?? []) as {
    id: string;
    inventory_item_id: string;
    qty_sold: number;
    unit_price: number;
    sold_unit_cost: number | null;
    line_fees: number;
    line_taxes: number;
    line_shipping: number;
  }[];

  const inventoryIds = [...new Set(items.map((i) => i.inventory_item_id))];
  const { data: invRows } = await supabase
    .from("inventory_items")
    .select("id, title")
    .in("id", inventoryIds);
  const titleById = new Map(
    (invRows ?? []).map((r) => [r.id, r.title as string])
  );

  const gross = saleGross(items);
  const net = saleNet(gross, sale.fees, sale.taxes, sale.shipping);
  const cost = saleCost(items);
  const profit = saleProfit(net, items);
  const profitMargin = saleProfitMargin(profit, net);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/sold" aria-label="Back to sales">
              ←
            </Link>
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sold
            </p>
            <h1 className="text-display">
              Sale — {new Date(sale.sale_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </h1>
            <p className="text-caption mt-1">
              {channelLabel(sale.channel)}
              {sale.buyer ? ` · ${sale.buyer}` : ""}
            </p>
          </div>
        </div>
        <Badge variant={sale.status === "paid" ? "default" : "secondary"} className="capitalize">
          {sale.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-card">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cost
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(cost)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-card">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Net
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(net)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-card">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Profit
            </p>
            <p
              className={`text-2xl font-semibold ${
                profit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatCurrency(profit)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-card">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Profit margin
            </p>
            <p className="text-2xl font-semibold">
              {profitMargin != null
                ? `${profitMargin.toFixed(1)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>
            Items sold in this transaction. Qty on hand was reduced when the sale was recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!items.length ? (
            <p className="text-sm text-muted-foreground">No line items.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ITEM</TableHead>
                    <TableHead className="text-right">QTY</TableHead>
                    <TableHead className="text-right">UNIT PRICE</TableHead>
                    <TableHead className="text-right">SUBTOTAL</TableHead>
                    <TableHead className="text-right">FEES</TableHead>
                    <TableHead className="text-right">TAXES</TableHead>
                    <TableHead className="text-right">SHIPPING</TableHead>
                    <TableHead className="text-right">COST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((line) => {
                    const subtotal = line.qty_sold * line.unit_price;
                    const title = titleById.get(line.inventory_item_id) ?? "—";
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Link
                            href={`/app/inventory/${line.inventory_item_id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {title.length > 50 ? `${title.slice(0, 50)}...` : title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{line.qty_sold}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(line.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(subtotal)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(line.line_fees)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(line.line_taxes)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(line.line_shipping)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {line.sold_unit_cost != null
                            ? formatCurrency(line.sold_unit_cost * line.qty_sold)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/app/sold">Back to sales</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/app/inventory">Inventory</Link>
        </Button>
        <DeleteSaleButton saleId={params.saleId} />
      </div>
    </div>
  );
}
