"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInventoryItem } from "./actions";

type Props = {
  itemId: string;
};

export function InventoryRowActions({ itemId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

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
        className="h-8 w-8 text-muted-foreground"
        disabled
        title="Mark as sold (coming soon)"
        aria-label="Sold (placeholder)"
      >
        <DollarSign className="h-4 w-4" />
      </Button>
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
