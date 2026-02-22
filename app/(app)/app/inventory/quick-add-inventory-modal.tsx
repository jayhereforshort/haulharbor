"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INVENTORY_STATUSES } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  accountId: string;
  categories: string[];
};

const CONDITION_OPTIONS = [
  "New",
  "Like New",
  "Very Good",
  "Good",
  "Acceptable",
  "For Parts",
];

export function QuickAddInventoryModal({ accountId, categories }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [quantity, setQuantity] = useState("1");
  const [listPrice, setListPrice] = useState("");
  const [costInput, setCostInput] = useState("");
  const [costMode, setCostMode] = useState<"total" | "per-unit">("total");
  const [files, setFiles] = useState<File[]>([]);

  function resetForm() {
    setTitle("");
    setCategory("");
    setCondition("");
    setNotes("");
    setStatus("draft");
    setQuantity("1");
    setListPrice("");
    setCostInput("");
    setCostMode("total");
    setFiles([]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity || 0);
    if (!title.trim()) {
      setError("Item name is required.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Quantity must be at least 1.");
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" is larger than 10MB.`);
        return;
      }
    }

    const parsedCost = costInput ? Number(costInput) : null;
    if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      setError("Cost must be a valid positive number.");
      return;
    }
    const unitCost =
      parsedCost === null
        ? null
        : costMode === "per-unit"
        ? parsedCost
        : qty > 0
        ? Number((parsedCost / qty).toFixed(2))
        : parsedCost;

    setSaving(true);
    const { data: item, error: createError } = await supabase
      .from("inventory_items")
      .insert({
        account_id: accountId,
        title: title.trim(),
        internal_category: category || null,
        condition: condition || null,
        description: notes || null,
        condition_notes: notes || null,
        status,
        qty_on_hand: qty,
        list_price: listPrice ? Number(listPrice) : null,
        unit_cost: unitCost,
        acquisition_source: "manual",
      })
      .select("id")
      .single();

    if (createError || !item) {
      setSaving(false);
      setError(createError?.message ?? "Could not save item.");
      return;
    }

    for (let idx = 0; idx < files.length; idx += 1) {
      const file = files[idx];
      const presignRes = await fetch("/api/inventory/photos/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const body = (await presignRes.json().catch(() => null)) as { error?: string } | null;
        setSaving(false);
        setError(body?.error ?? "Could not prepare image upload.");
        return;
      }

      const presignBody = (await presignRes.json()) as {
        uploadUrl: string;
        objectKey: string;
        objectUrl: string;
      };

      const uploadRes = await fetch(presignBody.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) {
        setSaving(false);
        setError(`Failed to upload "${file.name}".`);
        return;
      }

      const { error: photoErr } = await supabase.from("inventory_photos").insert({
        account_id: accountId,
        inventory_item_id: item.id,
        object_key: presignBody.objectKey,
        object_url: presignBody.objectUrl,
        display_order: idx,
      });
      if (photoErr) {
        setSaving(false);
        setError(photoErr.message);
        return;
      }
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !saving) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>Add item</Button>
      </DialogTrigger>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => {
            if (!saving) setOpen(false);
          }}
        />
      ) : null}
      <DialogContent className="absolute top-8 max-w-5xl translate-y-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle>Add inventory item</DialogTitle>
          <DialogDescription>Create a standalone item for your workspace.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Item Basics
              </p>
              <p className="text-sm text-muted-foreground">Name and quick context.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-title">Item Name</Label>
                <Input
                  id="quick-title"
                  placeholder="e.g. Nike Air Max 270"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-category">Category</Label>
                <select
                  id="quick-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a category</option>
                  {categories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-condition">Condition</Label>
                <select
                  id="quick-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Condition</option>
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-notes">Notes (Internal)</Label>
              <textarea
                id="quick-notes"
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Details you want to remember about the item"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Add Images
              </p>
              <p className="text-sm text-muted-foreground">Upload photos for this item (max 10MB each).</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium">
              Select images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
            {files.length ? (
              <p className="text-xs text-muted-foreground">
                {files.length} selected: {files.map((file) => file.name).join(", ")}
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Inventory & Cost
              </p>
              <p className="text-sm text-muted-foreground">Status, quantity, and cost entry.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="quick-status">Status</Label>
                <select
                  id="quick-status"
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
              <div className="space-y-2">
                <Label htmlFor="quick-qty">Quantity</Label>
                <Input
                  id="quick-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-list-price">List Price</Label>
                <Input
                  id="quick-list-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 49.99"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-cost-input">Cost Input</Label>
              <div className="grid gap-2 md:grid-cols-[1fr_130px]">
                <Input
                  id="quick-cost-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50.00"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                />
                <select
                  value={costMode}
                  onChange={(e) => setCostMode(e.target.value as "total" | "per-unit")}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm uppercase"
                >
                  <option value="total">Total</option>
                  <option value="per-unit">Per Unit</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose whether the amount above is the total for all units or per unit.
              </p>
            </div>
          </section>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
