-- Fix: "infinite recursion detected in policy for relation account_members"
-- The SELECT policy on account_members referenced the same table in its USING clause.
--
-- Applied via: supabase/migrations/20250222180000_fix_account_members_rls_recursion.sql

DROP POLICY IF EXISTS "Users can view members of their accounts" ON public.account_members;

CREATE POLICY "Users can view own memberships" ON public.account_members
  FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_account_members(p_account_id uuid)
RETURNS SETOF public.account_members
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.*
  FROM public.account_members m
  WHERE m.account_id = p_account_id
    AND EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = p_account_id AND am.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_account_members(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_account_members(uuid) TO authenticated;
