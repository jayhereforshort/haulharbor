import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3, DollarSign, Package, Percent, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { formatCurrency } from "@/lib/inventory";
import { getDashboardMetrics } from "@/lib/ledger";
import { RevenueChart } from "./revenue-chart";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);

  const metrics = account
    ? await getDashboardMetrics(supabase, account.id)
    : {
        revenue7d: 0,
        revenue30d: 0,
        netProfit7d: 0,
        netProfit30d: 0,
        profitMarginPct: null,
        cogs30d: 0,
        avgProfitPerItem: null,
        activeInventoryCount: 0,
        revenueByDay: [] as { date: string; net: number }[],
      };

  const kpis = [
    {
      title: "Revenue (7d / 30d)",
      value: `${formatCurrency(metrics.revenue7d)} / ${formatCurrency(metrics.revenue30d)}`,
      description: "Net from ledger (after fees, taxes, shipping)",
      icon: DollarSign,
    },
    {
      title: "Net Profit (7d / 30d)",
      value: `${formatCurrency(metrics.netProfit7d)} / ${formatCurrency(metrics.netProfit30d)}`,
      description: "Derived from ledger recalc",
      icon: BarChart3,
    },
    {
      title: "Profit Margin",
      value: metrics.profitMarginPct != null ? `${metrics.profitMarginPct.toFixed(1)}%` : "—",
      description: "Net profit / revenue (30d)",
      icon: Percent,
    },
    {
      title: "COGS (30d)",
      value: formatCurrency(metrics.cogs30d),
      description: "Cost of goods sold",
      icon: TrendingUp,
    },
    {
      title: "Active Inventory",
      value: String(metrics.activeInventoryCount),
      description: "SKUs (draft, ready, listed)",
      icon: Package,
    },
  ];

  const hasData =
    metrics.revenue30d > 0 ||
    metrics.netProfit30d !== 0 ||
    metrics.activeInventoryCount > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display">Dashboard</h1>
        <p className="text-caption mt-1">
          Metrics derived from the Money Ledger (recalc from immutable facts).
        </p>
      </div>

      <section>
        <h2 className="text-subheading mb-4">Key metrics</h2>
        <div className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="border-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold break-inside-avoid">{kpi.value}</div>
                <p className="text-caption mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {metrics.revenueByDay.length > 0 && (
        <section>
          <h2 className="text-subheading mb-4">Revenue over time</h2>
          <Card className="border-border shadow-card">
            <CardContent className="pt-6">
              <RevenueChart data={metrics.revenueByDay} />
            </CardContent>
          </Card>
        </section>
      )}

      {!hasData && (
        <section>
          <Card className="border-border shadow-card">
            <CardContent className="pt-6">
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="No data yet"
                description="Record sales from Sold or from the inventory row actions. Metrics are derived from the Money Ledger (Settings → Finance)."
              />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
