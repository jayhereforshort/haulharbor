-- Subscription SaaS foundations: Account (tenant), AccountMembers, Profile
-- On signup: create Account, make user Owner, create Profile.
-- No workspace switching UI; single account per user by default.

-- Profile: optional display info for auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Account (tenant) per subscription
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_id text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Membership: Owner / Admin / Member
CREATE TABLE IF NOT EXISTS public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON public.account_members(account_id);
CREATE INDEX IF NOT EXISTS idx_account_members_user_id ON public.account_members(user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own row
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Accounts: users can view accounts they are members of
CREATE POLICY "Users can view accounts they belong to" ON public.accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.account_members WHERE account_id = accounts.id AND user_id = auth.uid())
  );

-- Account members: users can view members of their accounts
CREATE POLICY "Users can view members of their accounts" ON public.account_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.account_members am WHERE am.account_id = account_members.account_id AND am.user_id = auth.uid())
  );

-- Allow inserts for trigger (SECURITY DEFINER) and for app backfill / add member
CREATE POLICY "Allow insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow insert account_members" ON public.account_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Owner/Admin can update account (name, plan_id later)
CREATE POLICY "Owners and admins can update account" ON public.accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_id = accounts.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Function: create account and set user as owner (called from trigger)
CREATE OR REPLACE FUNCTION public.create_account_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id uuid;
  user_email text;
BEGIN
  user_email := COALESCE(NEW.raw_user_meta_data->>'email', NEW.email, 'Account');
  INSERT INTO public.accounts (name)
  VALUES (split_part(user_email, '@', 1) || '''s Account')
  RETURNING id INTO new_account_id;

  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (new_account_id, NEW.id, 'owner');

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(user_email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: on signup create Account + Owner + Profile
DROP TRIGGER IF EXISTS on_auth_user_created_create_account ON auth.users;
CREATE TRIGGER on_auth_user_created_create_account
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_account_for_user();
