import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3, DollarSign, Package, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import {
  formatCurrency,
  saleCost,
  saleGross,
  saleNet,
  saleProfit,
} from "@/lib/sales";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);

  let activeInventoryCount = 0;
  let totalRevenue = 0;
  let totalProfit = 0;

  if (account) {
    const { count } = await supabase
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.id)
      .in("status", ["draft", "ready", "listed"]);
    activeInventoryCount = count ?? 0;

    const { data: sales } = await supabase
      .from("sales")
      .select("id, fees, taxes, shipping")
      .eq("account_id", account.id);

    if (sales?.length) {
      const saleIds = sales.map((s) => s.id);
      const { data: lineItems } = await supabase
        .from("sale_line_items")
        .select("sale_id, qty_sold, unit_price, sold_unit_cost")
        .in("sale_id", saleIds);

      const itemsBySale = new Map<string, { qty_sold: number; unit_price: number; sold_unit_cost: number | null }[]>();
      for (const line of lineItems ?? []) {
        const row = line as { sale_id: string; qty_sold: number; unit_price: number; sold_unit_cost: number | null };
        if (!itemsBySale.has(row.sale_id)) itemsBySale.set(row.sale_id, []);
        itemsBySale.get(row.sale_id)!.push(row);
      }

      for (const sale of sales) {
        const lines = itemsBySale.get(sale.id) ?? [];
        const gross = saleGross(lines);
        const net = saleNet(gross, sale.fees, sale.taxes, sale.shipping);
        const cost = saleCost(lines);
        const profit = saleProfit(net, lines);
        totalRevenue += net;
        totalProfit += profit;
      }
    }
  }

  const profitMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

  const kpis = [
    {
      title: "Revenue",
      value: formatCurrency(totalRevenue),
      description: "Net from sales (after fees, taxes, shipping)",
      icon: DollarSign,
    },
    {
      title: "Net Profit",
      value: formatCurrency(totalProfit),
      description: "After COGS & fees",
      icon: BarChart3,
    },
    {
      title: "Profit Margin",
      value: profitMargin != null ? `${profitMargin.toFixed(1)}%` : "—",
      description: "Net profit / revenue",
      icon: Percent,
    },
    {
      title: "Active Inventory",
      value: String(activeInventoryCount),
      description: "SKUs (draft, ready, listed)",
      icon: Package,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display">Dashboard</h1>
        <p className="text-caption mt-1">
          Your accounting metrics at a glance.
        </p>
      </div>

      <section>
        <h2 className="text-subheading mb-4">Key metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="border-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{kpi.value}</div>
                <p className="text-caption mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {(totalRevenue > 0 || totalProfit !== 0 || activeInventoryCount > 0) ? null : (
        <section>
          <Card className="border-border shadow-card">
            <CardContent className="pt-6">
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="No data yet"
                description="Record sales from Sold or from the inventory row actions to see revenue, profit, and margin here."
              />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
