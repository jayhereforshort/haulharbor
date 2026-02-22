-- Fix: "Database error saving new user"
-- Your project had a trigger on auth.users that calls create_workspace_for_user(),
-- which inserts into public.workspaces and public.workspace_members. Those tables
-- were missing, so signup failed.
--
-- APPLIED: Dropped the trigger instead (no workspaces needed for current app):
--   DROP TRIGGER IF EXISTS on_auth_user_created_create_workspace ON auth.users;
--
-- Alternative (if you later want workspaces on signup): run the SQL below in Supabase → SQL Editor.

-- Tables required by trigger on_auth_user_created_create_workspace
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_id text NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Users can view workspaces they belong to
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
  );

-- Users can view their workspace memberships
CREATE POLICY "Users can view their workspace memberships" ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow inserts (trigger runs as SECURITY DEFINER; these policies allow the insert to succeed with RLS on)
CREATE POLICY "Allow insert workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow insert workspace_members" ON public.workspace_members
  FOR INSERT WITH CHECK (true);
