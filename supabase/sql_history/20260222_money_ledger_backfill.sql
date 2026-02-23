-- Backfill money_events from existing sales and sale_line_items (run once after ledger migration).
-- Idempotent: only inserts when no matching event exists (same source + external_id + type).
-- Snapshot: supabase/sql_history/20260222_money_ledger_backfill.sql

-- Sale-level: FEE, TAX, SHIPPING_COST per sale
INSERT INTO public.money_events (account_id, sale_id, channel, event_type, amount, source, external_id)
SELECT s.account_id, s.id, s.channel, 'FEE'::public.money_event_type, s.fees, 'sale', 'sale_fee_' || s.id::text
FROM public.sales s
WHERE NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = s.account_id AND me.source = 'sale' AND me.external_id = 'sale_fee_' || s.id::text AND me.event_type = 'FEE');

INSERT INTO public.money_events (account_id, sale_id, channel, event_type, amount, source, external_id)
SELECT s.account_id, s.id, s.channel, 'TAX'::public.money_event_type, s.taxes, 'sale', 'sale_tax_' || s.id::text
FROM public.sales s
WHERE NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = s.account_id AND me.source = 'sale' AND me.external_id = 'sale_tax_' || s.id::text AND me.event_type = 'TAX');

INSERT INTO public.money_events (account_id, sale_id, channel, event_type, amount, source, external_id)
SELECT s.account_id, s.id, s.channel, 'SHIPPING_COST'::public.money_event_type, s.shipping, 'sale', 'sale_ship_' || s.id::text
FROM public.sales s
WHERE NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = s.account_id AND me.source = 'sale' AND me.external_id = 'sale_ship_' || s.id::text AND me.event_type = 'SHIPPING_COST');

-- Line-level: SOLD_REVENUE and COST_BASIS_SET per sale_line_item
INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
SELECT sli.account_id, sli.inventory_item_id, sli.sale_id, s.channel, 'SOLD_REVENUE'::public.money_event_type, sli.qty_sold * sli.unit_price, 'sale', 'sli_rev_' || sli.id::text
FROM public.sale_line_items sli
JOIN public.sales s ON s.id = sli.sale_id
WHERE NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = sli.account_id AND me.source = 'sale' AND me.external_id = 'sli_rev_' || sli.id::text AND me.event_type = 'SOLD_REVENUE');

INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
SELECT sli.account_id, sli.inventory_item_id, sli.sale_id, s.channel, 'COST_BASIS_SET'::public.money_event_type, sli.qty_sold * sli.sold_unit_cost, 'sale', 'sli_cog_' || sli.id::text
FROM public.sale_line_items sli
JOIN public.sales s ON s.id = sli.sale_id
WHERE sli.sold_unit_cost IS NOT NULL AND sli.sold_unit_cost > 0
  AND NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = sli.account_id AND me.source = 'sale' AND me.external_id = 'sli_cog_' || sli.id::text AND me.event_type = 'COST_BASIS_SET');

INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
SELECT sli.account_id, sli.inventory_item_id, sli.sale_id, s.channel, 'FEE'::public.money_event_type, COALESCE(sli.line_fees, 0), 'sale', 'sli_fee_' || sli.id::text
FROM public.sale_line_items sli JOIN public.sales s ON s.id = sli.sale_id
WHERE COALESCE(sli.line_fees, 0) <> 0
  AND NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = sli.account_id AND me.source = 'sale' AND me.external_id = 'sli_fee_' || sli.id::text AND me.event_type = 'FEE');

INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
SELECT sli.account_id, sli.inventory_item_id, sli.sale_id, s.channel, 'TAX'::public.money_event_type, COALESCE(sli.line_taxes, 0), 'sale', 'sli_tax_' || sli.id::text
FROM public.sale_line_items sli JOIN public.sales s ON s.id = sli.sale_id
WHERE COALESCE(sli.line_taxes, 0) <> 0
  AND NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = sli.account_id AND me.source = 'sale' AND me.external_id = 'sli_tax_' || sli.id::text AND me.event_type = 'TAX');

INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
SELECT sli.account_id, sli.inventory_item_id, sli.sale_id, s.channel, 'SHIPPING_COST'::public.money_event_type, COALESCE(sli.line_shipping, 0), 'sale', 'sli_ship_' || sli.id::text
FROM public.sale_line_items sli JOIN public.sales s ON s.id = sli.sale_id
WHERE COALESCE(sli.line_shipping, 0) <> 0
  AND NOT EXISTS (SELECT 1 FROM public.money_events me WHERE me.account_id = sli.account_id AND me.source = 'sale' AND me.external_id = 'sli_ship_' || sli.id::text AND me.event_type = 'SHIPPING_COST');
