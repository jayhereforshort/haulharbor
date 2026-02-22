"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  INVENTORY_STATUSES,
  itemSpecificsToInput,
  parseItemSpecificsInput,
  parseTagsInput,
} from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InventoryFormItem = {
  id: string;
  title: string;
  description: string | null;
  condition: string | null;
  condition_notes: string | null;
  internal_category: string | null;
  item_specifics: Record<string, string> | null;
  brand: string | null;
  model: string | null;
  mpn: string | null;
  upc: string | null;
  status: string;
  qty_on_hand: number;
  qty_listed: number;
  qty_sold: number;
  unit_cost: number | null;
  list_price: number | null;
  pricing_notes: string | null;
  location_bin: string | null;
  acquisition_source: string | null;
  acquisition_date: string | null;
};

type Props = {
  mode: "create" | "edit";
  accountId: string;
  item?: InventoryFormItem;
  initialTags?: string[];
};

async function syncItemTags(
  accountId: string,
  inventoryItemId: string,
  tags: string[]
) {
  const supabase = createClient();
  const { data: existingTags, error: existingError } = await supabase
    .from("inventory_tags")
    .select("id, name")
    .eq("account_id", accountId);
  if (existingError) throw existingError;

  const byNormalized = new Map<string, { id: string; name: string }>();
  for (const tag of existingTags ?? []) {
    byNormalized.set(tag.name.trim().toLowerCase(), tag);
  }

  const wantedNormalized = tags.map((tag) => tag.toLowerCase());
  const missing = tags.filter((tag) => !byNormalized.has(tag.toLowerCase()));
  if (missing.length) {
    const { data: inserted, error: insertErr } = await supabase
      .from("inventory_tags")
      .insert(missing.map((name) => ({ account_id: accountId, name })))
      .select("id, name");
    if (insertErr) throw insertErr;
    for (const tag of inserted ?? []) {
      byNormalized.set(tag.name.trim().toLowerCase(), tag);
    }
  }

  const tagIds = wantedNormalized
    .map((normalized) => byNormalized.get(normalized)?.id)
    .filter((id): id is string => Boolean(id));

  const { error: removeErr } = await supabase
    .from("inventory_item_tags")
    .delete()
    .eq("inventory_item_id", inventoryItemId)
    .eq("account_id", accountId);
  if (removeErr) throw removeErr;

  if (!tagIds.length) return;

  const { error: addErr } = await supabase.from("inventory_item_tags").insert(
    tagIds.map((tagId) => ({
      account_id: accountId,
      inventory_item_id: inventoryItemId,
      tag_id: tagId,
    }))
  );
  if (addErr) throw addErr;
}

export function InventoryForm({ mode, accountId, item, initialTags = [] }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [condition, setCondition] = useState(item?.condition ?? "");
  const [conditionNotes, setConditionNotes] = useState(item?.condition_notes ?? "");
  const [internalCategory, setInternalCategory] = useState(item?.internal_category ?? "");
  const [itemSpecificsRaw, setItemSpecificsRaw] = useState(
    itemSpecificsToInput(item?.item_specifics)
  );
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [model, setModel] = useState(item?.model ?? "");
  const [mpn, setMpn] = useState(item?.mpn ?? "");
  const [upc, setUpc] = useState(item?.upc ?? "");
  const [status, setStatus] = useState(item?.status ?? "draft");
  const [qtyOnHand, setQtyOnHand] = useState(String(item?.qty_on_hand ?? 0));
  const [unitCost, setUnitCost] = useState(item?.unit_cost?.toString() ?? "");
  const [listPrice, setListPrice] = useState(item?.list_price?.toString() ?? "");
  const [pricingNotes, setPricingNotes] = useState(item?.pricing_notes ?? "");
  const [locationBin, setLocationBin] = useState(item?.location_bin ?? "");
  const [tagsRaw, setTagsRaw] = useState(initialTags.join(", "));
  const [acquisitionSource, setAcquisitionSource] = useState(
    item?.acquisition_source ?? "manual"
  );
  const [acquisitionDate, setAcquisitionDate] = useState(item?.acquisition_date ?? "");

  const derivedNumbers = useMemo(
    () => ({
      qtyListed: item?.qty_listed ?? 0,
      qtySold: item?.qty_sold ?? 0,
    }),
    [item?.qty_listed, item?.qty_sold]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const specifics = parseItemSpecificsInput(itemSpecificsRaw);
    const tags = parseTagsInput(tagsRaw);
    const supabase = createClient();
    setSaving(true);

    const payload = {
      account_id: accountId,
      title: title.trim(),
      description: description || null,
      condition: condition || null,
      condition_notes: conditionNotes || null,
      internal_category: internalCategory || null,
      item_specifics: specifics,
      brand: brand || null,
      model: model || null,
      mpn: mpn || null,
      upc: upc || null,
      status,
      qty_on_hand: Number(qtyOnHand || 0),
      unit_cost: unitCost ? Number(unitCost) : null,
      list_price: listPrice ? Number(listPrice) : null,
      pricing_notes: pricingNotes || null,
      location_bin: locationBin || null,
      acquisition_source: acquisitionSource || null,
      acquisition_date: acquisitionDate || null,
    };

    if (mode === "edit" && !item?.id) {
      setSaving(false);
      setError("Item is missing.");
      return;
    }

    if (mode === "create") {
      const { data, error: createError } = await supabase
        .from("inventory_items")
        .insert(payload)
        .select("id")
        .single();
      if (createError || !data) {
        setSaving(false);
        setError(createError?.message ?? "Could not create item.");
        return;
      }

      try {
        await syncItemTags(accountId, data.id, tags);
      } catch (tagError) {
        setSaving(false);
        setError(tagError instanceof Error ? tagError.message : "Could not set tags.");
        return;
      }

      router.push(`/app/inventory/${data.id}`);
      router.refresh();
      return;
    }

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update(payload)
      .eq("id", item?.id ?? "");
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    try {
      await syncItemTags(accountId, item?.id ?? "", tags);
    } catch (tagError) {
      setSaving(false);
      setError(tagError instanceof Error ? tagError.message : "Could not set tags.");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {INVENTORY_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Input id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conditionNotes">Condition Notes</Label>
          <Input
            id="conditionNotes"
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="internalCategory">Internal Category</Label>
          <Input
            id="internalCategory"
            value={internalCategory}
            onChange={(e) => setInternalCategory(e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mpn">MPN</Label>
          <Input id="mpn" value={mpn} onChange={(e) => setMpn(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upc">UPC</Label>
          <Input id="upc" value={upc} onChange={(e) => setUpc(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="itemSpecifics">Item Specifics (one per line: key:value)</Label>
          <textarea
            id="itemSpecifics"
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={itemSpecificsRaw}
            onChange={(e) => setItemSpecificsRaw(e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="qtyOnHand">Qty On Hand</Label>
          <Input
            id="qtyOnHand"
            type="number"
            min={0}
            value={qtyOnHand}
            onChange={(e) => setQtyOnHand(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qtyListed">Qty Listed (derived)</Label>
          <Input id="qtyListed" value={String(derivedNumbers.qtyListed)} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qtySold">Qty Sold (derived)</Label>
          <Input id="qtySold" value={String(derivedNumbers.qtySold)} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitCost">Unit Cost</Label>
          <Input
            id="unitCost"
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="listPrice">List Price</Label>
          <Input
            id="listPrice"
            type="number"
            min="0"
            step="0.01"
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pricingNotes">Pricing Notes</Label>
          <textarea
            id="pricingNotes"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={pricingNotes}
            onChange={(e) => setPricingNotes(e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locationBin">Location / Bin</Label>
          <Input
            id="locationBin"
            value={locationBin}
            onChange={(e) => setLocationBin(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquisitionSource">Acquisition Source</Label>
          <select
            id="acquisitionSource"
            value={acquisitionSource}
            onChange={(e) => setAcquisitionSource(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="manual">Manual</option>
            <option value="lot">Lot</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquisitionDate">Acquisition Date</Label>
          <Input
            id="acquisitionDate"
            type="date"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : mode === "create" ? "Create Item" : "Save Changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/app/inventory")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
