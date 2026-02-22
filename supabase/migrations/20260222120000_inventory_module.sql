-- Standalone inventory core schema (channel-ready, not channel-specific).
-- Notes:
-- - account-scoped via account_id on all inventory tables
-- - channel-specific listing data belongs in a future channel_listings table
-- - derived fields (qty_listed, qty_sold) can be updated by downstream processes

CREATE OR REPLACE FUNCTION public.is_account_member(p_account_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = p_account_id
      AND am.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_account_member(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_account_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  condition text,
  condition_notes text,
  internal_category text,
  item_specifics jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand text,
  model text,
  mpn text,
  upc text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'listed', 'sold', 'archived')),
  qty_on_hand integer NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  qty_listed integer NOT NULL DEFAULT 0 CHECK (qty_listed >= 0),
  qty_sold integer NOT NULL DEFAULT 0 CHECK (qty_sold >= 0),
  unit_cost numeric(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  list_price numeric(12, 2) CHECK (list_price IS NULL OR list_price >= 0),
  pricing_notes text,
  location_bin text,
  acquisition_source text CHECK (
    acquisition_source IS NULL OR acquisition_source IN ('lot', 'manual', 'other')
  ),
  acquisition_date date,
  listed_at timestamptz,
  sold_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_account_id
  ON public.inventory_items(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status
  ON public.inventory_items(account_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category
  ON public.inventory_items(account_id, internal_category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_bin
  ON public.inventory_items(account_id, location_bin);
CREATE INDEX IF NOT EXISTS idx_inventory_items_updated_at
  ON public.inventory_items(account_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_specifics_gin
  ON public.inventory_items USING gin(item_specifics);

CREATE TABLE IF NOT EXISTS public.inventory_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  object_url text NOT NULL,
  alt_text text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_photos_item_id
  ON public.inventory_photos(account_id, inventory_item_id, display_order);

CREATE TABLE IF NOT EXISTS public.inventory_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_tags_account_name_lower
  ON public.inventory_tags(account_id, lower(name));

CREATE TABLE IF NOT EXISTS public.inventory_item_tags (
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.inventory_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (inventory_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_item_tags_account_item
  ON public.inventory_item_tags(account_id, inventory_item_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory items account members can select" ON public.inventory_items
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Inventory items account members can insert" ON public.inventory_items
  FOR INSERT WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory items account members can update" ON public.inventory_items
  FOR UPDATE USING (public.is_account_member(account_id))
  WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory items account members can delete" ON public.inventory_items
  FOR DELETE USING (public.is_account_member(account_id));

CREATE POLICY "Inventory photos account members can select" ON public.inventory_photos
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Inventory photos account members can insert" ON public.inventory_photos
  FOR INSERT WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory photos account members can update" ON public.inventory_photos
  FOR UPDATE USING (public.is_account_member(account_id))
  WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory photos account members can delete" ON public.inventory_photos
  FOR DELETE USING (public.is_account_member(account_id));

CREATE POLICY "Inventory tags account members can select" ON public.inventory_tags
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Inventory tags account members can insert" ON public.inventory_tags
  FOR INSERT WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory tags account members can update" ON public.inventory_tags
  FOR UPDATE USING (public.is_account_member(account_id))
  WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory tags account members can delete" ON public.inventory_tags
  FOR DELETE USING (public.is_account_member(account_id));

CREATE POLICY "Inventory item tags account members can select" ON public.inventory_item_tags
  FOR SELECT USING (public.is_account_member(account_id));
CREATE POLICY "Inventory item tags account members can insert" ON public.inventory_item_tags
  FOR INSERT WITH CHECK (public.is_account_member(account_id));
CREATE POLICY "Inventory item tags account members can delete" ON public.inventory_item_tags
  FOR DELETE USING (public.is_account_member(account_id));

DROP TRIGGER IF EXISTS set_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_inventory_photos_updated_at ON public.inventory_photos;
CREATE TRIGGER set_inventory_photos_updated_at
  BEFORE UPDATE ON public.inventory_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_inventory_tags_updated_at ON public.inventory_tags;
CREATE TRIGGER set_inventory_tags_updated_at
  BEFORE UPDATE ON public.inventory_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
