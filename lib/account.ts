/**
 * Account-scoped access and enforcement.
 *
 * All data access must be account-scoped: resolve account via getCurrentAccountForUser(),
 * then always filter by account_id (e.g. .eq("account_id", account.id)) when querying
 * account-scoped tables. No workspace switching UI; single account per user by default.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getEntitlement,
  type EntitlementKey,
  type EntitlementsMap,
} from "@/lib/entitlements";
import { PLANS } from "@/lib/entitlements";

export type AccountRole = "owner" | "admin" | "member";

const ROLE_ORDER: Record<AccountRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/** Returns the user's membership row for their first (primary) account. Single-account UX; no switcher. */
/** If the user has no account (e.g. signed up before trigger existed), creates one and returns it. */
export async function getCurrentAccountForUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { account: null, membership: null, user: null };

  // Use maybeSingle() so 0 or 1 row both yield data (no error); 2+ rows still error
  let { data: membership } = await supabase
    .from("account_members")
    .select("id, account_id, user_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Backfill: user exists but has no account (e.g. trigger wasn't applied or they signed up before we added it)
  if (!membership) {
    const accountName =
      (user.email?.split("@")[0] || "My") + "'s Account";
    const { data: newAccount, error: accountErr } = await supabase
      .from("accounts")
      .insert({ name: accountName })
      .select("id")
      .single();

    if (accountErr || !newAccount) return { account: null, membership: null, user };

    const { error: memberErr } = await supabase.from("account_members").insert({
      account_id: newAccount.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberErr) return { account: null, membership: null, user };

    const { data: newMembership } = await supabase
      .from("account_members")
      .select("id, account_id, user_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    membership = newMembership ?? null;
  }

  if (!membership) return { account: null, membership: null, user };

  let { data: account } = await supabase
    .from("accounts")
    .select("id, name, plan_id, created_at, updated_at")
    .eq("id", membership.account_id)
    .maybeSingle();

  // Retry once if we have membership but account fetch failed (e.g. RLS timing)
  if (!account) {
    const retry = await supabase
      .from("accounts")
      .select("id, name, plan_id, created_at, updated_at")
      .eq("id", membership.account_id)
      .maybeSingle();
    account = retry.data ?? null;
  }

  return { account, membership, user };
}

/** Throws if the current user does not have at least the required role on the account. Use in server actions / API. */
export async function enforceRole(
  supabase: SupabaseClient,
  accountId: string,
  requiredRole: AccountRole
): Promise<{ account_id: string; user_id: string; role: AccountRole }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: membership, error } = await supabase
    .from("account_members")
    .select("account_id, user_id, role")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .single();

  if (error || !membership) throw new Error("Forbidden: not a member of this account");

  const role = membership.role as AccountRole;
  if (ROLE_ORDER[role] < ROLE_ORDER[requiredRole]) {
    throw new Error(`Forbidden: requires ${requiredRole} or higher`);
  }

  return {
    account_id: membership.account_id,
    user_id: membership.user_id,
    role,
  };
}

/** Throws if the account's plan does not grant the entitlement (or usage would exceed limit). Pass currentUsage when checking a limit. */
export async function enforceEntitlement(
  supabase: SupabaseClient,
  accountId: string,
  entitlementKey: EntitlementKey,
  currentUsage?: number
): Promise<{ limit: number; planId: string }> {
  const { data: account, error } = await supabase
    .from("accounts")
    .select("id, plan_id")
    .eq("id", accountId)
    .single();

  if (error || !account) throw new Error("Account not found");

  const limit = getEntitlement(account.plan_id, entitlementKey);
  if (currentUsage !== undefined && limit !== -1 && currentUsage >= limit) {
    throw new Error(
      `Entitlement limit reached: ${entitlementKey} (${currentUsage}/${limit})`
    );
  }

  return { limit, planId: account.plan_id };
}

/** Get full entitlements map for an account (for display). */
export function getEntitlementsForPlan(planId: string): EntitlementsMap & { planName: string } {
  const plan = PLANS[planId] ?? PLANS.free;
  return {
    ...plan.entitlements,
    planName: plan.name,
  };
}
