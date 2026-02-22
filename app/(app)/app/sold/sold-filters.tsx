"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SALE_CHANNELS, SALE_STATUSES } from "@/lib/sales";

type Props = {
  searchParams: {
    channel?: string;
    status?: string;
    search?: string;
  };
};

export function SoldFilters({ searchParams }: Props) {
  const [open, setOpen] = useState(
    Boolean(
      searchParams.channel ||
        searchParams.status ||
        (searchParams.search ?? "").trim()
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
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            method="get"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Channel
              </label>
              <select
                name="channel"
                defaultValue={searchParams.channel ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                {SALE_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c === "EBAY" ? "eBay" : c === "OFFLINE" ? "Offline" : "Wholesale"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                name="status"
                defaultValue={searchParams.status ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All</option>
                {SALE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Search buyer
              </label>
              <Input
                name="search"
                defaultValue={searchParams.search ?? ""}
                placeholder="Search by buyer..."
                className="h-9"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/app/sold">Clear</Link>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
