import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3, DollarSign, Package, Percent } from "lucide-react";

const kpis = [
  {
    title: "Revenue",
    value: "$0",
    description: "Total sales",
    icon: DollarSign,
  },
  {
    title: "Net Profit",
    value: "$0",
    description: "After COGS & fees",
    icon: BarChart3,
  },
  {
    title: "Profit Margin",
    value: "0%",
    description: "Net profit / revenue",
    icon: Percent,
  },
  {
    title: "Active Inventory",
    value: "0",
    description: "Unique SKUs",
    icon: Package,
  },
];

export default function DashboardPage() {
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
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{kpi.value}</div>
                <p className="text-caption mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card className="border-border shadow-card">
          <CardContent className="pt-6">
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title="No data yet"
              description="Connect sales sources or record offline sales to see revenue, profit, and inventory metrics here. Data will be backed by your ledger in a future update."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
