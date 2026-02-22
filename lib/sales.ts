export const SALE_CHANNELS = ["EBAY", "OFFLINE", "WHOLESALE"] as const;
export type SaleChannel = (typeof SALE_CHANNELS)[number];

export const SALE_STATUSES = [
  "paid",
  "pending",
  "refunded",
  "cancelled",
  "partial_refund",
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export type Sale = {
  id: string;
  account_id: string;
  channel: SaleChannel;
  buyer: string | null;
  sale_date: string;
  status: SaleStatus;
  fees: number;
  taxes: number;
  shipping: number;
  created_at: string;
  updated_at: string;
};

export type SaleLineItem = {
  id: string;
  sale_id: string;
  account_id: string;
  inventory_item_id: string;
  qty_sold: number;
  unit_price: number;
  sold_unit_cost: number | null;
  line_fees: number;
  line_taxes: number;
  line_shipping: number;
  created_at: string;
  updated_at: string;
};

export type SaleWithLines = Sale & {
  line_items: (SaleLineItem & { inventory_item?: { id: string; title: string } })[];
};

/** Gross = sum of (qty_sold * unit_price) across line items */
export function saleGross(lineItems: { qty_sold: number; unit_price: number }[]): number {
  return lineItems.reduce((sum, l) => sum + l.qty_sold * l.unit_price, 0);
}

/** Total line-level fees/taxes/shipping */
export function saleLineTotals(lineItems: SaleLineItem[]): {
  fees: number;
  taxes: number;
  shipping: number;
} {
  return lineItems.reduce(
    (acc, l) => ({
      fees: acc.fees + l.line_fees,
      taxes: acc.taxes + l.line_taxes,
      shipping: acc.shipping + l.line_shipping,
    }),
    { fees: 0, taxes: 0, shipping: 0 }
  );
}

/** Net = Gross - sale-level (fees + taxes + shipping) - line-level totals (if we use them). For list we use sale-level only; line-level is per-line. */
export function saleNet(
  gross: number,
  saleFees: number,
  saleTaxes: number,
  saleShipping: number
): number {
  return gross - saleFees - saleTaxes - saleShipping;
}

/** Profit = Net - COGS; COGS = sum(qty_sold * sold_unit_cost) where sold_unit_cost is set */
export function saleProfit(
  net: number,
  lineItems: { qty_sold: number; sold_unit_cost: number | null }[]
): number {
  const cogs = lineItems.reduce(
    (sum, l) => sum + (l.sold_unit_cost ?? 0) * l.qty_sold,
    0
  );
  return net - cogs;
}

export { formatCurrency } from "@/lib/inventory";
