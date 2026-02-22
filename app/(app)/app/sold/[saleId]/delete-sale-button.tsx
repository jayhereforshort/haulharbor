"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSale } from "../actions";

type Props = {
  saleId: string;
};

export function DeleteSaleButton({ saleId }: Props) {
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
    router.push("/app/sold");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? "Deleting…" : "Delete sale"}
    </Button>
  );
}
