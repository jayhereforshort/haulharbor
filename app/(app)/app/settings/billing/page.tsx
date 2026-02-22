import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { getEntitlementsForPlan } from "@/lib/account";
import { ENTITLEMENT_KEYS } from "@/lib/entitlements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) redirect("/app");

  const { planName, ...entitlements } = getEntitlementsForPlan(account.plan_id);

  // Placeholder current usage (no listings/items tables yet)
  const currentUsage = {
    [ENTITLEMENT_KEYS.max_active_listings]: 0,
    [ENTITLEMENT_KEYS.max_items]: 0,
    [ENTITLEMENT_KEYS.max_users]: 0,
    [ENTITLEMENT_KEYS.sync_frequency_hours]: 24,
  };

  const { count: memberCount } = await supabase
    .from("account_members")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id);

  const usageRows: { label: string; key: keyof typeof ENTITLEMENT_KEYS; current: number; limit: number }[] = [
    { label: "Active listings", key: "max_active_listings", current: currentUsage.max_active_listings, limit: entitlements.max_active_listings ?? 0 },
    { label: "Items", key: "max_items", current: currentUsage.max_items, limit: entitlements.max_items ?? 0 },
    { label: "Seats (members)", key: "max_users", current: memberCount ?? 0, limit: entitlements.max_users ?? 0 },
    { label: "Sync frequency (hours)", key: "sync_frequency_hours", current: currentUsage.sync_frequency_hours, limit: entitlements.sync_frequency_hours ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Your current plan and limits.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{planName}</p>
          <p className="text-sm text-muted-foreground mt-1">Plan ID: {account.plan_id}</p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Usage & limits</CardTitle>
          <CardDescription>Current usage against your plan entitlements.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">Entitlement</th>
                <th className="text-right py-2 font-medium">Current</th>
                <th className="text-right py-2 font-medium">Limit</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((row) => (
                <tr key={row.key} className="border-b border-border/50">
                  <td className="py-2">{row.label}</td>
                  <td className="text-right py-2">{row.current}</td>
                  <td className="text-right py-2">{row.limit === -1 ? "Unlimited" : row.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
