"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/inventory";

type Point = { date: string; net: number };

export function RevenueChart({ data }: { data: Point[] }) {
  const { maxNet, formatted } = useMemo(() => {
    if (!data.length) return { maxNet: 1, formatted: [] };
    const max = Math.max(...data.map((d) => d.net), 1);
    return {
      maxNet: max,
      formatted: data.map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      })),
    };
  }, [data]);

  if (!formatted.length) return null;

  return (
    <div
      className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"
      role="img"
      aria-label={`Revenue over time: ${formatted.map((d) => `${d.label} ${formatCurrency(d.net)}`).join(", ")}`}
    >
      <div className="flex items-end gap-1 sm:gap-2 min-w-0 h-[200px] sm:h-[240px] py-2">
        {formatted.map((d) => (
          <div
            key={d.date}
            className="flex flex-col items-center flex-1 min-w-0 group"
          >
            <span
              className="block w-full bg-primary/80 hover:bg-primary rounded-t min-h-[4px] transition-colors"
              style={{
                height: `${Math.max(4, (d.net / maxNet) * 100)}%`,
              }}
              title={`${d.label}: ${formatCurrency(d.net)}`}
            />
            <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate max-w-full">
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-caption mt-2 text-center text-muted-foreground">
        Net revenue per day (from ledger)
      </p>
    </div>
  );
}
