export const INVENTORY_STATUSES = [
  "draft",
  "ready",
  "listed",
  "sold",
  "archived",
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

/** Badge variant for each inventory status (Sold=red, Listed=green, etc.) */
export const STATUS_BADGE_VARIANT: Record<
  InventoryStatus,
  "secondary" | "info" | "success" | "destructive" | "muted"
> = {
  sold: "destructive",
  listed: "success",
  ready: "info",
  draft: "secondary",
  archived: "muted",
};

export function getStatusBadgeVariant(
  status: string
): "secondary" | "info" | "success" | "destructive" | "muted" {
  return STATUS_BADGE_VARIANT[status as InventoryStatus] ?? "secondary";
}

export type ItemSpecific = { key: string; value: string };

export function parseItemSpecificsInput(input: string): Record<string, string> {
  const specifics: Record<string, string> = {};
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) specifics[key] = value;
  }

  return specifics;
}

export function itemSpecificsToInput(
  specifics: Record<string, string> | null | undefined
): string {
  if (!specifics) return "";
  return Object.entries(specifics)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

export function parseTagsInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
