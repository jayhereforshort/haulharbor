import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryForm, type InventoryFormItem } from "../../inventory-form";
import { PhotoGallery } from "../../photo-gallery";

export const dynamic = "force-dynamic";

export default async function InventoryItemAdvancedEditPage({
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
      "id, title, description, condition, condition_notes, internal_category, item_specifics, brand, model, mpn, upc, status, qty_on_hand, qty_listed, qty_sold, unit_cost, list_price, pricing_notes, location_bin, acquisition_source, acquisition_date"
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

  const { data: tags } = await supabase
    .from("inventory_item_tags")
    .select("inventory_tags(name)")
    .eq("account_id", account.id)
    .eq("inventory_item_id", params.id);

  const tagNames =
    (tags as { inventory_tags: { name: string } | null }[] | null)
      ?.map((row) => row.inventory_tags?.name)
      .filter((name): name is string => Boolean(name)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-display">Edit Listing (Advanced)</h1>
          <p className="text-caption mt-1">
            Full standalone inventory fields and photo management.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/app/inventory/${params.id}`}>Back to Item</Link>
        </Button>
      </div>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Advanced item editor</CardTitle>
          <CardDescription>
            Use this screen for complete field coverage beyond the quick item layout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryForm
            mode="edit"
            accountId={account.id}
            item={item as InventoryFormItem}
            initialTags={tagNames}
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>Wasabi-backed gallery with upload, reorder, and delete.</CardDescription>
        </CardHeader>
        <CardContent>
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
    </div>
  );
}
