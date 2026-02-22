/**
 * Plan and entitlement scaffolding. All limits are defined here; plan_id on Account maps to a key in PLANS.
 * Enforcement: use enforceEntitlement(accountId, key) before operations that consume a limit.
 */

export const ENTITLEMENT_KEYS = {
  max_active_listings: "max_active_listings",
  max_items: "max_items",
  max_users: "max_users",
  sync_frequency_hours: "sync_frequency_hours",
} as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];

export type EntitlementsMap = Partial<Record<EntitlementKey, number>>;

export interface Plan {
  id: string;
  name: string;
  entitlements: EntitlementsMap;
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "Free",
    entitlements: {
      [ENTITLEMENT_KEYS.max_active_listings]: 5,
      [ENTITLEMENT_KEYS.max_items]: 100,
      [ENTITLEMENT_KEYS.max_users]: 1,
      [ENTITLEMENT_KEYS.sync_frequency_hours]: 24,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    entitlements: {
      [ENTITLEMENT_KEYS.max_active_listings]: 25,
      [ENTITLEMENT_KEYS.max_items]: 1000,
      [ENTITLEMENT_KEYS.max_users]: 3,
      [ENTITLEMENT_KEYS.sync_frequency_hours]: 12,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    entitlements: {
      [ENTITLEMENT_KEYS.max_active_listings]: 100,
      [ENTITLEMENT_KEYS.max_items]: 10000,
      [ENTITLEMENT_KEYS.max_users]: 10,
      [ENTITLEMENT_KEYS.sync_frequency_hours]: 4,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    entitlements: {
      [ENTITLEMENT_KEYS.max_active_listings]: -1, // unlimited
      [ENTITLEMENT_KEYS.max_items]: -1,
      [ENTITLEMENT_KEYS.max_users]: -1,
      [ENTITLEMENT_KEYS.sync_frequency_hours]: 1,
    },
  },
};

/** Get entitlement value for a plan (-1 = unlimited). */
export function getEntitlement(planId: string, key: EntitlementKey): number {
  const plan = PLANS[planId] ?? PLANS.free;
  const value = plan.entitlements[key];
  return value === undefined ? (PLANS.free.entitlements[key] ?? 0) : value;
}

/** Check if a value is within the plan limit (-1 means unlimited). */
export function isWithinLimit(planId: string, key: EntitlementKey, current: number): boolean {
  const limit = getEntitlement(planId, key);
  if (limit === -1) return true;
  return current <= limit;
}
