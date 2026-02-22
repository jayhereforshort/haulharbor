"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INVENTORY_STATUSES } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ItemQuickEdit = {
  id: string;
  title: string;
  status: string;
  condition: string | null;
  internal_category: string | null;
  qty_on_hand: number;
  qty_sold: number;
  list_price: number | null;
  unit_cost: number | null;
  description: string | null;
};

type Props = {
  accountId: string;
  item: ItemQuickEdit;
  categories: string[];
};

export function ItemQuickEditForm({ accountId, item, categories }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(item.title);
  const [status, setStatus] = useState(item.status);
  const [condition, setCondition] = useState(item.condition ?? "");
  const [internalCategory, setInternalCategory] = useState(item.internal_category ?? "");
  const [qtyOnHand, setQtyOnHand] = useState(String(item.qty_on_hand));
  const [listPrice, setListPrice] = useState(item.list_price?.toString() ?? "");
  const [unitCost, setUnitCost] = useState(item.unit_cost?.toString() ?? "");
  const [notes, setNotes] = useState(item.description ?? "");

  const qtyAvailable = Math.max(0, Number(qtyOnHand || 0) - item.qty_sold);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        account_id: accountId,
        title: title.trim(),
        status,
        condition: condition || null,
        internal_category: internalCategory || null,
        qty_on_hand: Number(qtyOnHand || 0),
        list_price: listPrice ? Number(listPrice) : null,
        unit_cost: unitCost ? Number(unitCost) : null,
        description: notes || null,
        condition_notes: notes || null,
      })
      .eq("id", item.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        <Label htmlFor="quick-edit-title">Name</Label>
        <Input
          id="quick-edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quick-edit-category">Category</Label>
          <select
            id="quick-edit-category"
            value={internalCategory}
            onChange={(e) => setInternalCategory(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quick-edit-status">Status</Label>
          <select
            id="quick-edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {INVENTORY_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quick-edit-condition">Condition</Label>
          <Input
            id="quick-edit-condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quick-edit-qty">Qty Purchased</Label>
          <Input
            id="quick-edit-qty"
            type="number"
            min={0}
            value={qtyOnHand}
            onChange={(e) => setQtyOnHand(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quick-edit-list-price">List Price</Label>
          <Input
            id="quick-edit-list-price"
            type="number"
            min="0"
            step="0.01"
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quick-edit-cost">Cost Input</Label>
          <Input
            id="quick-edit-cost"
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Qty Available</p>
          <p className="text-lg font-semibold">{qtyAvailable}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Qty Sold</p>
          <p className="text-lg font-semibold">{item.qty_sold}</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quick-edit-notes">Notes</Label>
        <textarea
          id="quick-edit-notes"
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
