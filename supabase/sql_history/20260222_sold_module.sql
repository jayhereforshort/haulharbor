-- Sold module: sales and sale_line_items (channel-agnostic sell events).
-- When a sale line item is inserted, qty_on_hand is reduced and qty_sold increased.
-- Fees, taxes, shipping stored as raw fields; Ledger will formalize in Stage 4.

-- Sales (one per sell event)
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('EBAY', 'OFFLINE', 'WHOLESALE')),
  buyer text,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'pending', 'refunded', 'cancelled', 'partial_refund')),
  fees numeric(12, 2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  taxes numeric(12, 2) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
  shipping numeric(12, 2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_account_id ON public.sales(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(account_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_channel ON public.sales(account_id, channel);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(account_id, status);

-- Line items reference inventory and quantities; optional line-level fees/taxes/shipping
CREATE TABLE IF NOT EXISTS public.sale_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  qty_sold integer NOT NULL CHECK (qty_sold > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  sold_unit_cost numeric(12, 2) CHECK (sold_unit_cost IS NULL OR sold_unit_cost >= 0),
  line_fees numeric(12, 2) NOT NULL DEFAULT 0 CHECK (line_fees >= 0),
  line_taxes numeric(12, 2) NOT NULL DEFAULT 0 CHECK (line_taxes >= 0),
  line_shipping numeric(12, 2) NOT NULL DEFAULT 0 CHECK (line_shipping >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_line_items_sale_id ON public.sale_line_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_line_items_account_id ON public.sale_line_items(account_id);
CREATE INDEX IF NOT EXISTS idx_sale_line_items_inventory_item_id ON public.sale_line_items(inventory_item_id);

-- Reduce qty_on_hand and increase qty_sold when a line item is inserted
CREATE OR REPLACE FUNCTION public.apply_sale_line_item_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  SELECT qty_on_hand INTO v_current
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id AND account_id = NEW.account_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_item not found or wrong account';
  END IF;
  IF v_current < NEW.qty_sold THEN
    RAISE EXCEPTION 'insufficient qty_on_hand: has % need %', v_current, NEW.qty_sold;
  END IF;
  UPDATE public.inventory_items
  SET
    qty_on_hand = qty_on_hand - NEW.qty_sold,
    qty_sold = qty_sold + NEW.qty_sold,
    updated_at = now(),
    status = CASE WHEN (qty_on_hand - NEW.qty_sold) <= 0 THEN 'sold'::text ELSE status END
  WHERE id = NEW.inventory_item_id AND account_id = NEW.account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_sale_line_item_inventory_trigger ON public.sale_line_items;
CREATE TRIGGER apply_sale_line_item_inventory_trigger
  AFTER INSERT ON public.sale_line_items
  FOR EACH ROW EXECUTE FUNCTION public.apply_sale_line_item_inventory();

-- Restore qty_on_hand and reduce qty_sold when a sale line item is deleted (e.g. sale reverted)
CREATE OR REPLACE FUNCTION public.reverse_sale_line_item_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory_items
  SET
    qty_on_hand = qty_on_hand + OLD.qty_sold,
    qty_sold = GREATEST(0, qty_sold - OLD.qty_sold),
    updated_at = now()
  WHERE id = OLD.inventory_item_id AND account_id = OLD.account_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS reverse_sale_line_item_inventory_trigger ON public.sale_line_items;
CREATE TRIGGER reverse_sale_line_item_inventory_trigger
  AFTER DELETE ON public.sale_line_items
  FOR EACH ROW EXECUTE FUNCTION public.reverse_sale_line_item_inventory();

-- updated_at triggers
DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales;
CREATE TRIGGER set_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_sale_line_items_updated_at ON public.sale_line_items;
CREATE TRIGGER set_sale_line_items_updated_at
  BEFORE UPDATE ON public.sale_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales account members can select" ON public.sales
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Sales account members can insert" ON public.sales
  FOR INSERT WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Sales account members can update" ON public.sales
  FOR UPDATE USING (public.is_account_member(account_id))
  WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Sales account members can delete" ON public.sales
  FOR DELETE USING (public.is_account_member(account_id));

CREATE POLICY "Sale line items account members can select" ON public.sale_line_items
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Sale line items account members can insert" ON public.sale_line_items
  FOR INSERT WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Sale line items account members can update" ON public.sale_line_items
  FOR UPDATE USING (public.is_account_member(account_id))
  WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Sale line items account members can delete" ON public.sale_line_items
  FOR DELETE USING (public.is_account_member(account_id));
