export const BILLING_ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedEntitlement = { entitled: boolean; checkedAt: number };

const entitlementCache = new Map<string, CachedEntitlement>();

export function getCachedBillingEntitlement(userId: string, now = Date.now()) {
  const cached = entitlementCache.get(userId);
  if (!cached) return null;
  if (now - cached.checkedAt >= BILLING_ENTITLEMENT_CACHE_TTL_MS) {
    entitlementCache.delete(userId);
    return null;
  }
  return cached;
}

export function cacheBillingEntitlement(userId: string, entitled: boolean) {
  entitlementCache.set(userId, { entitled, checkedAt: Date.now() });
}

export function invalidateBillingEntitlement(userId?: string | null) {
  if (userId) entitlementCache.delete(userId);
  else entitlementCache.clear();
}
