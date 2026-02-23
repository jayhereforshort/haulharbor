-- Money Ledger + Recalc (st4_ledger_recalc)
-- Immutable money_events; all financial math derived from facts. Idempotency for imports.
-- SQL snapshot: supabase/sql_history/20260222_money_ledger_recalc.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'money_event_type') THEN
    CREATE TYPE public.money_event_type AS ENUM (
      'COST_BASIS_SET',
      'LOT_ALLOCATED_COST',
      'SOLD_REVENUE',
      'FEE',
      'TAX',
      'SHIPPING_COST',
      'SHIPPING_REVENUE',
      'REFUND',
      'ADJUSTMENT'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.money_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  order_id text,
  channel text CHECK (channel IS NULL OR channel IN ('EBAY', 'OFFLINE', 'WHOLESALE')),
  event_type public.money_event_type NOT NULL,
  amount numeric(12, 2) NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'sale', 'inventory', 'import', 'system')),
  external_id text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_money_events_idempotency
  ON public.money_events(account_id, source, external_id, event_type)
  WHERE external_id <> '';

CREATE INDEX IF NOT EXISTS idx_money_events_account_id ON public.money_events(account_id);
CREATE INDEX IF NOT EXISTS idx_money_events_inventory_item_id ON public.money_events(account_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_money_events_sale_id ON public.money_events(account_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_money_events_created_at ON public.money_events(account_id, created_at DESC);

ALTER TABLE public.money_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Money events account members can select" ON public.money_events
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Money events account members can insert" ON public.money_events
  FOR INSERT WITH CHECK (public.is_account_member(account_id));

CREATE OR REPLACE VIEW public.item_financial_summary AS
SELECT
  me.account_id,
  me.inventory_item_id,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'SOLD_REVENUE'), 0) AS gross_revenue,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'SHIPPING_REVENUE'), 0) AS shipping_revenue,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'REFUND'), 0) AS refunds,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'FEE'), 0) AS fees,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'TAX'), 0) AS taxes,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'SHIPPING_COST'), 0) AS shipping_cost,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type IN ('COST_BASIS_SET', 'LOT_ALLOCATED_COST')), 0) AS cogs,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'ADJUSTMENT'), 0) AS adjustment
FROM public.money_events me
WHERE me.inventory_item_id IS NOT NULL
GROUP BY me.account_id, me.inventory_item_id;

CREATE OR REPLACE VIEW public.item_financial_totals AS
SELECT
  account_id,
  inventory_item_id,
  gross_revenue + shipping_revenue - refunds AS gross,
  fees,
  taxes,
  shipping_cost,
  shipping_revenue,
  (shipping_revenue - shipping_cost) AS shipping_net,
  (gross_revenue + shipping_revenue - refunds) - fees - taxes - (shipping_cost - shipping_revenue) + adjustment AS net,
  cogs,
  (gross_revenue + shipping_revenue - refunds) - fees - taxes - (shipping_cost - shipping_revenue) + adjustment - cogs AS profit,
  CASE WHEN cogs > 0 THEN (((gross_revenue + shipping_revenue - refunds) - fees - taxes - (shipping_cost - shipping_revenue) + adjustment - cogs) / cogs * 100) ELSE NULL END AS roi_pct
FROM public.item_financial_summary;

CREATE OR REPLACE VIEW public.sale_financial_summary AS
SELECT
  me.account_id,
  me.sale_id,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'SOLD_REVENUE'), 0) AS gross_revenue,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'SHIPPING_REVENUE'), 0) AS shipping_revenue,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'REFUND'), 0) AS refunds,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'FEE'), 0) AS fees,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'TAX'), 0) AS taxes,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'SHIPPING_COST'), 0) AS shipping_cost,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type IN ('COST_BASIS_SET', 'LOT_ALLOCATED_COST')), 0) AS cogs,
  COALESCE(SUM(me.amount) FILTER (WHERE me.event_type = 'ADJUSTMENT'), 0) AS adjustment
FROM public.money_events me
WHERE me.sale_id IS NOT NULL
GROUP BY me.account_id, me.sale_id;

CREATE OR REPLACE VIEW public.sale_financial_totals AS
SELECT
  account_id,
  sale_id,
  gross_revenue + shipping_revenue - refunds AS gross,
  fees,
  taxes,
  (shipping_revenue - shipping_cost) AS shipping_net,
  (gross_revenue + shipping_revenue - refunds) - fees - taxes - (shipping_cost - shipping_revenue) + adjustment AS net,
  cogs,
  (gross_revenue + shipping_revenue - refunds) - fees - taxes - (shipping_cost - shipping_revenue) + adjustment - cogs AS profit
FROM public.sale_financial_summary;

CREATE OR REPLACE FUNCTION public.emit_sale_money_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.money_events (account_id, sale_id, channel, event_type, amount, source, external_id)
  VALUES
    (NEW.account_id, NEW.id, NEW.channel, 'FEE', NEW.fees, 'sale', 'sale_fee_' || NEW.id::text),
    (NEW.account_id, NEW.id, NEW.channel, 'TAX', NEW.taxes, 'sale', 'sale_tax_' || NEW.id::text),
    (NEW.account_id, NEW.id, NEW.channel, 'SHIPPING_COST', NEW.shipping, 'sale', 'sale_ship_' || NEW.id::text)
  ON CONFLICT (account_id, source, external_id, event_type) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emit_sale_money_events_trigger ON public.sales;
CREATE TRIGGER emit_sale_money_events_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.emit_sale_money_events();

CREATE OR REPLACE FUNCTION public.emit_sale_line_item_money_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel text;
BEGIN
  SELECT s.channel INTO v_channel FROM public.sales s WHERE s.id = NEW.sale_id;
  INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
  VALUES (NEW.account_id, NEW.inventory_item_id, NEW.sale_id, v_channel, 'SOLD_REVENUE', NEW.qty_sold * NEW.unit_price, 'sale', 'sli_rev_' || NEW.id::text)
  ON CONFLICT (account_id, source, external_id, event_type) DO NOTHING;
  IF NEW.sold_unit_cost IS NOT NULL AND NEW.sold_unit_cost > 0 THEN
    INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
    VALUES (NEW.account_id, NEW.inventory_item_id, NEW.sale_id, v_channel, 'COST_BASIS_SET', NEW.qty_sold * NEW.sold_unit_cost, 'sale', 'sli_cog_' || NEW.id::text)
    ON CONFLICT (account_id, source, external_id, event_type) DO NOTHING;
  END IF;
  IF (COALESCE(NEW.line_fees, 0) <> 0) OR (COALESCE(NEW.line_taxes, 0) <> 0) OR (COALESCE(NEW.line_shipping, 0) <> 0) THEN
    INSERT INTO public.money_events (account_id, inventory_item_id, sale_id, channel, event_type, amount, source, external_id)
    VALUES
      (NEW.account_id, NEW.inventory_item_id, NEW.sale_id, v_channel, 'FEE', COALESCE(NEW.line_fees, 0), 'sale', 'sli_fee_' || NEW.id::text),
      (NEW.account_id, NEW.inventory_item_id, NEW.sale_id, v_channel, 'TAX', COALESCE(NEW.line_taxes, 0), 'sale', 'sli_tax_' || NEW.id::text),
      (NEW.account_id, NEW.inventory_item_id, NEW.sale_id, v_channel, 'SHIPPING_COST', COALESCE(NEW.line_shipping, 0), 'sale', 'sli_ship_' || NEW.id::text)
    ON CONFLICT (account_id, source, external_id, event_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emit_sale_line_item_money_events_trigger ON public.sale_line_items;
CREATE TRIGGER emit_sale_line_item_money_events_trigger
  AFTER INSERT ON public.sale_line_items
  FOR EACH ROW EXECUTE FUNCTION public.emit_sale_line_item_money_events();
