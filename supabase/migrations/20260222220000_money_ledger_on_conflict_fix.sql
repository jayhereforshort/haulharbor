-- Fix: ON CONFLICT requires a non-partial unique constraint.
-- Replace partial unique index with full unique constraint and ensure external_id is always unique when empty.

UPDATE public.money_events
SET external_id = id::text
WHERE external_id = '';

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

DROP INDEX IF EXISTS public.uq_money_events_idempotency;

ALTER TABLE public.money_events
  ADD CONSTRAINT uq_money_events_idempotency UNIQUE (account_id, source, external_id, event_type);
