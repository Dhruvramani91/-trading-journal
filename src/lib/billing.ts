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
  return plan ? `/checkout?plan=${plan}` : '/dashboard';
}
