-- Fix: ON CONFLICT requires a non-partial unique constraint.
-- Replace partial unique index with full unique constraint and ensure external_id is always unique when empty.
-- Snapshot: supabase/sql_history/20260222_money_ledger_on_conflict_fix.sql

-- 1. Backfill: give any rows with empty external_id a unique value so the new constraint can apply
UPDATE public.money_events
SET external_id = id::text
WHERE external_id = '';

-- 2. Ensure future inserts with empty external_id get a unique value (for manual/import without idempotency key)
CREATE OR REPLACE FUNCTION public.money_events_set_external_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.external_id = '' THEN
    NEW.external_id := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS money_events_set_external_id_trigger ON public.money_events;
CREATE TRIGGER money_events_set_external_id_trigger
  BEFORE INSERT ON public.money_events
  FOR EACH ROW EXECUTE FUNCTION public.money_events_set_external_id();

-- 3. Drop partial unique index
DROP INDEX IF EXISTS public.uq_money_events_idempotency;

-- 4. Add non-partial unique constraint so ON CONFLICT (account_id, source, external_id, event_type) works
ALTER TABLE public.money_events
  ADD CONSTRAINT uq_money_events_idempotency UNIQUE (account_id, source, external_id, event_type);
