"use client";

import { useState, useEffect } from "react";
import { getMoneyEventsForItem } from "./actions";
import { formatCurrency } from "@/lib/inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EVENT_TYPE_LABELS: Record<string, string> = {
  COST_BASIS_SET: "Cost basis",
  LOT_ALLOCATED_COST: "Lot cost",
  SOLD_REVENUE: "Sale revenue",
  FEE: "Fee",
  TAX: "Tax",
  SHIPPING_COST: "Shipping cost",
  SHIPPING_REVENUE: "Shipping revenue",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
};

type Item = { id: string; title: string };

type MoneyEvent = {
  id: string;
  event_type: string;
  amount: number;
  source: string;
  channel: string | null;
  sale_id: string | null;
  created_at: string;
};

export function FinanceEventLog({
  accountId,
  items,
}: {
  accountId: string;
  items: Item[];
}) {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [events, setEvents] = useState<MoneyEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedItemId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    getMoneyEventsForItem(accountId, selectedItemId)
      .then((data) => {
        setEvents(data ?? []);
      })
      .finally(() => setLoading(false));
  }, [accountId, selectedItemId]);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">
        Inventory item
      </label>
      <select
        className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        value={selectedItemId}
        onChange={(e) => setSelectedItemId(e.target.value)}
        aria-label="Select item to view event log"
      >
        <option value="">Select an item…</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title.length > 60 ? item.title.slice(0, 60) + "…" : item.title}
          </option>
        ))}
      </select>

      {selectedItemId && (
        <div className="rounded-md border border-border overflow-hidden">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No money events for this item yet. Events are added when you record sales or set cost basis.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Channel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(ev.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ev.source}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ev.channel ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
