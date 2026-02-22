import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SoldInventoryPage() {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) redirect("/app");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inventory
          </p>
          <h1 className="text-display">Sold</h1>
          <p className="text-caption mt-1">Items marked as sold. (Placeholder)</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/app/inventory">Back to Active inventory</Link>
        </Button>
      </div>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Sold items and sale history will appear here. For now, use status filters on Active
            inventory to see sold items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/inventory">Go to Active inventory</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
