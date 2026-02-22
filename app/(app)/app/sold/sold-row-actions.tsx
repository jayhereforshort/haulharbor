"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSale } from "./actions";

type Props = {
  saleId: string;
};

export function SoldRowActions({ saleId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "Delete this sale? Inventory quantities for the sold items will be restored. This cannot be undone."
      )
    )
      return;
    setDeleting(true);
    const result = await deleteSale(saleId);
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
        <Link href={`/app/sold/${saleId}`} aria-label="View sale">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete sale"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
