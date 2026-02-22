"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSale } from "./actions";
import { SALE_CHANNELS, SALE_STATUSES } from "@/lib/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

type InventoryOption = { id: string; title: string; qty_on_hand: number };

type Props = {
  accountId: string;
  inventoryItems: InventoryOption[];
};

type LineRow = {
  inventory_item_id: string;
  qty_sold: number;
  unit_price: number;
  sold_unit_cost: number | null;
  line_fees: number;
  line_taxes: number;
  line_shipping: number;
};

const defaultLine = (): LineRow => ({
  inventory_item_id: "",
  qty_sold: 1,
  unit_price: 0,
  sold_unit_cost: null,
  line_fees: 0,
  line_taxes: 0,
  line_shipping: 0,
});

export function NewSaleForm({ accountId, inventoryItems }: Props) {
  const router = useRouter();
  const [channel, setChannel] = useState<"EBAY" | "OFFLINE" | "WHOLESALE">("OFFLINE");
  const [buyer, setBuyer] = useState("");
  const [saleDate, setSaleDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState("paid");
  const [fees, setFees] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [lines, setLines] = useState<LineRow[]>([defaultLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableItems = inventoryItems.filter((i) => i.qty_on_hand > 0);

  function addLine() {
    setLines((prev) => [...prev, defaultLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, updates: Partial<LineRow>) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const validLines = lines.filter(
      (l) =>
        l.inventory_item_id &&
        l.qty_sold > 0 &&
        l.unit_price >= 0
    );

    if (!validLines.length) {
      setError("Add at least one line with item, qty, and price.");
      setSubmitting(false);
      return;
    }

    const itemQtys = new Map<string, number>();
    for (const l of validLines) {
      const current = itemQtys.get(l.inventory_item_id) ?? 0;
      itemQtys.set(l.inventory_item_id, current + l.qty_sold);
    }
    for (const item of availableItems) {
      const requested = itemQtys.get(item.id) ?? 0;
      if (requested > item.qty_on_hand) {
        setError(
          `"${item.title}" has only ${item.qty_on_hand} on hand; you requested ${requested}.`
        );
        setSubmitting(false);
        return;
      }
    }

    const result = await createSale({
      channel,
      buyer: buyer.trim() || null,
      sale_date: saleDate,
      status,
      fees: Number(fees) || 0,
      taxes: Number(taxes) || 0,
      shipping: Number(shipping) || 0,
      line_items: validLines.map((l) => ({
        inventory_item_id: l.inventory_item_id,
        qty_sold: l.qty_sold,
        unit_price: Number(l.unit_price),
        sold_unit_cost: l.sold_unit_cost != null ? Number(l.sold_unit_cost) : null,
        line_fees: Number(l.line_fees) || 0,
        line_taxes: Number(l.line_taxes) || 0,
        line_shipping: Number(l.line_shipping) || 0,
      })),
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.saleId) router.push(`/app/sold/${result.saleId}`);
    else router.push("/app/sold");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Sale details</CardTitle>
          <CardDescription>
            Channel, buyer (optional), date, and sale-level fees/taxes/shipping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={channel}
                onValueChange={(v) => setChannel(v as "EBAY" | "OFFLINE" | "WHOLESALE")}
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "EBAY" ? "eBay" : c === "OFFLINE" ? "Offline" : "Wholesale"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_date">Sale date</Label>
              <Input
                id="sale_date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer (optional)</Label>
              <Input
                id="buyer"
                type="text"
                placeholder="Name or identifier"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fees">Fees ($)</Label>
              <Input
                id="fees"
                type="number"
                min={0}
                step={0.01}
                value={fees || ""}
                onChange={(e) => setFees(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxes">Taxes ($)</Label>
              <Input
                id="taxes"
                type="number"
                min={0}
                step={0.01}
                value={taxes || ""}
                onChange={(e) => setTaxes(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping ($)</Label>
              <Input
                id="shipping"
                type="number"
                min={0}
                step={0.01}
                value={shipping || ""}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line items</CardTitle>
            <CardDescription>
              Select inventory item, quantity, and sold price. Qty on hand will be reduced when you save.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!availableItems.length ? (
            <p className="text-sm text-muted-foreground">
              No inventory items with qty on hand. Add stock in Inventory first.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="min-w-[180px] flex-1 space-y-2 sm:min-w-[200px]">
                    <Label className="text-xs">Item</Label>
                    <Select
                      value={line.inventory_item_id}
                      onValueChange={(v) =>
                        updateLine(index, { inventory_item_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            disabled={
                              item.qty_on_hand < 1
                            }
                          >
                            {item.title.length > 40
                              ? `${item.title.slice(0, 40)}...`
                              : item.title}{" "}
                            (qty: {item.qty_on_hand})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={line.qty_sold || ""}
                      onChange={(e) =>
                        updateLine(index, {
                          qty_sold: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label className="text-xs">Price ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price || ""}
                      onChange={(e) =>
                        updateLine(index, {
                          unit_price: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label className="text-xs">Cost ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.sold_unit_cost ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateLine(index, {
                          sold_unit_cost: v === "" ? null : Number(v) || 0,
                        });
                      }}
                      placeholder="COGS"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting || !availableItems.length}>
          {submitting ? "Saving…" : "Create sale"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/app/sold">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
