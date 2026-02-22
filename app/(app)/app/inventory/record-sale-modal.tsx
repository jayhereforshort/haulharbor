"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSale } from "@/app/(app)/app/sold/actions";
import { formatCurrency } from "@/lib/inventory";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/dialog";

type ItemForSale = {
  id: string;
  title: string;
  qty_on_hand: number;
  list_price: number | null;
  unit_cost: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  item: ItemForSale;
};

export function RecordSaleModal({
  open,
  onOpenChange,
  accountId,
  item,
}: Props) {
  const router = useRouter();
  const [channel, setChannel] = useState<"EBAY" | "OFFLINE" | "WHOLESALE">("OFFLINE");
  const [buyer, setBuyer] = useState("");
  const [saleDate, setSaleDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(item.list_price ?? 0);
  const [soldUnitCost, setSoldUnitCost] = useState<number | "">(
    item.unit_cost ?? ""
  );
  const [fees, setFees] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQty = Math.max(0, item.qty_on_hand);

  useEffect(() => {
    if (open) {
      setUnitPrice(item.list_price ?? 0);
      setSoldUnitCost(item.unit_cost ?? "");
      setQty(1);
      setError(null);
    }
  }, [open, item.id, item.list_price, item.unit_cost]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (maxQty < 1) {
      setError("No quantity on hand to sell.");
      return;
    }
    if (qty < 1 || qty > maxQty) {
      setError(`Quantity must be between 1 and ${maxQty}.`);
      return;
    }
    setSubmitting(true);

    const result = await createSale({
      channel,
      buyer: buyer.trim() || null,
      sale_date: saleDate,
      status: "paid",
      fees: Number(fees) || 0,
      taxes: Number(taxes) || 0,
      shipping: Number(shipping) || 0,
      line_items: [
        {
          inventory_item_id: item.id,
          qty_sold: qty,
          unit_price: Number(unitPrice) || 0,
          sold_unit_cost:
            soldUnitCost === "" ? null : Number(soldUnitCost) || null,
          line_fees: 0,
          line_taxes: 0,
          line_shipping: 0,
        },
      ],
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record sale</DialogTitle>
          <DialogDescription>
            Sell &quot;{item.title.length > 50 ? `${item.title.slice(0, 50)}...` : item.title}&quot;.
            Qty on hand: {item.qty_on_hand}. This will reduce stock when you save.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="record-sale-channel">Channel</Label>
              <select
                id="record-sale-channel"
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as "EBAY" | "OFFLINE" | "WHOLESALE")
                }
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-[40px]"
                )}
              >
                <option value="EBAY">eBay</option>
                <option value="OFFLINE">Offline</option>
                <option value="WHOLESALE">Wholesale</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-sale-date">Sale date</Label>
              <Input
                id="record-sale-date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="record-sale-buyer">Buyer (optional)</Label>
            <Input
              id="record-sale-buyer"
              type="text"
              placeholder="Name or identifier"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
            />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Line item
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="record-sale-qty">Qty</Label>
                <Input
                  id="record-sale-qty"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.min(maxQty, Math.max(0, parseInt(e.target.value, 10) || 0)))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Max {maxQty} on hand
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="record-sale-price">Price ($)</Label>
                <Input
                  id="record-sale-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitPrice || ""}
                  onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="record-sale-cost">Cost ($)</Label>
                <Input
                  id="record-sale-cost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={soldUnitCost}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSoldUnitCost(v === "" ? "" : Number(v) || 0);
                  }}
                  placeholder={formatCurrency(item.unit_cost)}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="record-sale-fees">Fees ($)</Label>
              <Input
                id="record-sale-fees"
                type="number"
                min={0}
                step={0.01}
                value={fees || ""}
                onChange={(e) => setFees(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-sale-taxes">Taxes ($)</Label>
              <Input
                id="record-sale-taxes"
                type="number"
                min={0}
                step={0.01}
                value={taxes || ""}
                onChange={(e) => setTaxes(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-sale-shipping">Shipping ($)</Label>
              <Input
                id="record-sale-shipping"
                type="number"
                min={0}
                step={0.01}
                value={shipping || ""}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || maxQty < 1}>
              {submitting ? "Saving…" : "Record sale"}
            </Button>
          </DialogFooter>
        </form>
        <p className="text-xs text-muted-foreground">
          To sell multiple items at once,{" "}
          <Link href="/app/sold/new" className="text-primary underline">
            create a sale from Sold
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
