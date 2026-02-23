/**
 * Dashboard metrics derived from the Money Ledger (sale_financial_totals + sales.sale_date).
 * All financial math is recalc from immutable money_events.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardMetrics = {
  revenue7d: number;
  revenue30d: number;
  netProfit7d: number;
  netProfit30d: number;
  profitMarginPct: number | null;
  cogs30d: number;
  avgProfitPerItem: number | null;
  activeInventoryCount: number;
  revenueByDay: { date: string; net: number }[];
};

export async function getDashboardMetrics(
  supabase: SupabaseClient,
  accountId: string
): Promise<DashboardMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const date7 = sevenDaysAgo.toISOString().slice(0, 10);
  const date30 = thirtyDaysAgo.toISOString().slice(0, 10);

  const { count } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .in("status", ["draft", "ready", "listed"]);
  const activeInventoryCount = count ?? 0;

  const { data: totalsRows } = await supabase
    .from("sale_financial_totals")
    .select("sale_id, net, profit, cogs")
    .eq("account_id", accountId);

  const { data: salesRows } = await supabase
    .from("sales")
    .select("id, sale_date")
    .eq("account_id", accountId);

  const saleById = new Map(
    (salesRows ?? []).map((s: { id: string; sale_date: string }) => [s.id, s])
  );

  let revenue7d = 0;
  let revenue30d = 0;
  let netProfit7d = 0;
  let netProfit30d = 0;
  let cogs30d = 0;
  const dayNet: Record<string, number> = {};

  for (const row of totalsRows ?? []) {
    const r = row as { sale_id: string; net: number; profit: number; cogs: number };
    const sale = saleById.get(r.sale_id);
    if (!sale) continue;
    const d = sale.sale_date;

    if (d >= date30) {
      revenue30d += r.net;
      netProfit30d += r.profit;
      cogs30d += r.cogs;
      dayNet[d] = (dayNet[d] ?? 0) + r.net;
    }
    if (d >= date7) {
      revenue7d += r.net;
      netProfit7d += r.profit;
    }
  }

  const profitMarginPct =
    revenue30d > 0 ? (netProfit30d / revenue30d) * 100 : null;

  const saleCount30d = (totalsRows ?? []).filter((row) => {
    const sale = saleById.get((row as { sale_id: string }).sale_id);
    return sale && sale.sale_date >= date30;
  }).length;
  const avgProfitPerItem =
    saleCount30d > 0 ? netProfit30d / saleCount30d : null;

  const sortedDays = Object.keys(dayNet).sort();
  const revenueByDay = sortedDays.map((date) => ({
    date,
    net: dayNet[date],
  }));

  return {
    revenue7d,
    revenue30d,
    netProfit7d,
    netProfit30d,
    profitMarginPct,
    cogs30d,
    avgProfitPerItem,
    activeInventoryCount,
    revenueByDay,
  };
}
