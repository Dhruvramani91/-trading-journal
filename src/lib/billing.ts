import { supabase } from '@/lib/supabase';
import { getCachedBillingEntitlement, cacheBillingEntitlement } from '@/lib/billingEntitlementCache';

export type BillingPlan = 'monthly' | 'quarterly';

const PLAN_INTENT_KEY = 'theprecisionlab:checkout-plan';

export function isBillingPlan(value: string | null | undefined): value is BillingPlan {
  return value === 'monthly' || value === 'quarterly';
}

export function saveBillingPlanIntent(plan: BillingPlan) {
  try {
    sessionStorage.setItem(PLAN_INTENT_KEY, plan);
  } catch {
    // Checkout still works when storage is unavailable as long as the URL carries the plan.
  }
}

export function getBillingPlanIntent(): BillingPlan | null {
  try {
    const plan = sessionStorage.getItem(PLAN_INTENT_KEY);
    return isBillingPlan(plan) ? plan : null;
  } catch {
    return null;
  }
}

export function consumeBillingPlanIntent(): BillingPlan | null {
  const plan = getBillingPlanIntent();
  try {
    sessionStorage.removeItem(PLAN_INTENT_KEY);
  } catch {
    // Ignore storage restrictions.
  }
  return plan;
}

export function checkoutPath(plan: BillingPlan | null = getBillingPlanIntent()) {
  return `/checkout?plan=${plan ?? 'monthly'}`;
}

export async function checkBillingEntitlement(userId?: string | null): Promise<boolean> {
  if (!userId || !supabase) return false;
  const cached = getCachedBillingEntitlement(userId);
  if (cached !== null) return cached.entitled;
  try {
    const { data, error } = await supabase.rpc('current_user_has_billing_entitlement');
    if (error) return false;
    const entitled = data === true;
    cacheBillingEntitlement(userId, entitled);
    return entitled;
  } catch {
    return false;
  }
}
