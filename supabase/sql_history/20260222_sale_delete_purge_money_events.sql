-- When a sale is deleted, remove its money_events so ledger and recalc stay in sync.
-- Snapshot: supabase/sql_history/20260222_sale_delete_purge_money_events.sql

CREATE OR REPLACE FUNCTION public.purge_money_events_on_sale_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.money_events WHERE sale_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS purge_money_events_on_sale_delete_trigger ON public.sales;
CREATE TRIGGER purge_money_events_on_sale_delete_trigger
  BEFORE DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.purge_money_events_on_sale_delete();
