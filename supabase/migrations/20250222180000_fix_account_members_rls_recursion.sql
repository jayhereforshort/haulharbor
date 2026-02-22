-- Fix infinite recursion in account_members RLS.
-- The previous SELECT policy queried account_members inside its own USING, causing recursion.
-- Replace with: users can see their own membership rows. For listing other members, use a SECURITY DEFINER function.

DROP POLICY IF EXISTS "Users can view members of their accounts" ON public.account_members;

-- Users can only see their own membership row(s) (no self-reference, no recursion)
CREATE POLICY "Users can view own memberships" ON public.account_members
  FOR SELECT USING (user_id = auth.uid());

-- Returns account members for the given account_id; only allowed if auth.uid() is a member of that account.
-- Use this for the settings "member list" so we can show other members without recursive RLS.
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

-- Grant execute to anon and authenticated (RLS still applies via the EXISTS check)
GRANT EXECUTE ON FUNCTION public.get_account_members(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_account_members(uuid) TO authenticated;
