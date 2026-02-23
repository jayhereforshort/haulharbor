import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceEventLog } from "./finance-event-log";

export const dynamic = "force-dynamic";

export default async function FinanceSettingsPage() {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) redirect("/app");

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, title")
    .eq("account_id", account.id)
    .order("title");

  return (
    <div className="space-y-8">
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Money Ledger</CardTitle>
          <CardDescription>
            How your financial numbers are calculated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            All financial math is derived from <strong className="text-foreground">immutable facts</strong> stored in the Money Ledger. 
            Nothing is stored twice: revenue, fees, taxes, shipping, and cost of goods (COGS) are recorded once as events, 
            and dashboard metrics (revenue, net profit, margin, COGS, ROI) are <strong className="text-foreground">recalculated</strong> from those events so they never drift.
          </p>
          <p>
            <strong className="text-foreground">Event types</strong>: COST_BASIS_SET, LOT_ALLOCATED_COST, SOLD_REVENUE, FEE, TAX, SHIPPING_COST, SHIPPING_REVENUE, REFUND, ADJUSTMENT.
            Events are linked to an inventory item and optionally to a sale and channel. Imports use idempotency keys (source + external ID + type) so the same data is never duplicated.
          </p>
          <p>
            Recalc derives <strong className="text-foreground">per item</strong>: gross, fees, taxes, shipping, net, profit, ROI. 
            <strong className="text-foreground"> Per sale</strong>: totals and profit. The ledger is append-only (read-only in this page).
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Event log by item</CardTitle>
          <CardDescription>
            View money events for a specific inventory item (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceEventLog accountId={account.id} items={items ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
