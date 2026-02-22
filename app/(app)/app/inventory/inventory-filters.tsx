"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  searchParams: {
    status?: string;
    ebay?: string;
    category?: string;
    lot?: string;
    search?: string;
  };
  categories: string[];
};

export function InventoryFilters({ searchParams, categories }: Props) {
  const [open, setOpen] = useState(
    Boolean(
      searchParams.status ||
        searchParams.ebay ||
        searchParams.category ||
        searchParams.lot ||
        searchParams.search
    )
  );

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
      >
        <span>Filters</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" method="get">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                name="status"
                defaultValue={searchParams.status ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="listed">Listed</option>
                <option value="sold">Sold</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">eBay</label>
              <select
                name="ebay"
                defaultValue={searchParams.ebay ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                <option value="listed">Listed</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                name="category"
                defaultValue={searchParams.category ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Lot</label>
              <select
                name="lot"
                defaultValue={searchParams.lot ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                <option value="yes">Has lot</option>
                <option value="no">No lot</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Search items</label>
              <Input
                name="search"
                defaultValue={searchParams.search ?? ""}
                placeholder="Search by title..."
                className="h-9"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/app/inventory">Clear</Link>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
