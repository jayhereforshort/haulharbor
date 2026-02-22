# Supabase

## Migrations

Apply migrations so the database has the required tables and RLS:

**Option A – Supabase CLI (linked project)**

```bash
supabase db push
```

**Option B – Supabase Dashboard**

1. Open your project → **SQL Editor**.
2. Paste and run the contents of `migrations/20250222000000_account_account_members_profile.sql`.

## Required schema

- **profiles** – user display info (id → auth.users).
- **accounts** – tenant per subscription (name, plan_id).
- **account_members** – membership with roles owner/admin/member.

After signup, a trigger creates an account and adds the user as owner. Users who signed up before the trigger can get an account on first load via app backfill in `getCurrentAccountForUser`.
