import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryForm } from "../inventory-form";

export default async function NewInventoryItemPage() {
  const supabase = await createClient();
  const { account, membership } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">New Inventory Item</h1>
        <p className="text-caption mt-1">Create an item record before listing it on any channel.</p>
      </div>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Create item</CardTitle>
          <CardDescription>
            Use inventory-native fields now; channel-specific listing data stays separate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryForm mode="create" accountId={account.id} />
        </CardContent>
      </Card>
    </div>
  );
}
