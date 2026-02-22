"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInventoryItem } from "./actions";
import { RecordSaleModal } from "./record-sale-modal";

type Props = {
  itemId: string;
  accountId: string;
  item: {
    title: string;
    qty_on_hand: number;
    list_price: number | null;
    unit_cost: number | null;
  };
};

export function InventoryRowActions({ itemId, accountId, item }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [recordSaleOpen, setRecordSaleOpen] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this item from inventory? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteInventoryItem(itemId);
    setDeleting(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  const canSell = item.qty_on_hand > 0;

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/app/inventory/${itemId}`} aria-label="Edit item">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => setRecordSaleOpen(true)}
        disabled={!canSell}
        title={canSell ? "Record sale" : "No qty on hand"}
        aria-label="Record sale"
      >
        <DollarSign className="h-4 w-4" />
      </Button>
      <RecordSaleModal
        open={recordSaleOpen}
        onOpenChange={setRecordSaleOpen}
        accountId={accountId}
        item={{
          id: itemId,
          title: item.title,
          qty_on_hand: item.qty_on_hand,
          list_price: item.list_price,
          unit_cost: item.unit_cost,
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
