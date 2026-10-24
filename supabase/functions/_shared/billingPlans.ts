export type BillingPlanKey = 'monthly' | 'quarterly';
export type BillingCurrency = 'INR' | 'USD';

export type BillingPlanConfig = {
  key: BillingPlanKey;
  currency: BillingCurrency;
  amount: number;
  period: 'monthly' | 'quarterly';
  interval: 1;
  planId: string;
  trialDays: number;
};

type EnvReader = (name: string) => string | undefined;

const planDefaults: Record<BillingCurrency, Record<BillingPlanKey, Omit<BillingPlanConfig, 'planId'>>> = {
  INR: {
    monthly: { key: 'monthly', currency: 'INR', amount: 40_000, period: 'monthly', interval: 1, trialDays: 7 },
    quarterly: { key: 'quarterly', currency: 'INR', amount: 100_000, period: 'quarterly', interval: 1, trialDays: 0 },
  },
  USD: {
    monthly: { key: 'monthly', currency: 'USD', amount: 400, period: 'monthly', interval: 1, trialDays: 7 },
    quarterly: { key: 'quarterly', currency: 'USD', amount: 1_000, period: 'quarterly', interval: 1, trialDays: 0 },
  },
};

function configuredPlanId(currency: BillingCurrency, plan: BillingPlanKey, readEnv: EnvReader) {
  const explicit = readEnv(`RAZORPAY_PLAN_${plan.toUpperCase()}_${currency}_ID`)?.trim();
  if (explicit) return explicit;
  if (currency === 'INR') return readEnv(`RAZORPAY_PLAN_${plan.toUpperCase()}_ID`)?.trim() || '';
  return '';
}

export function getConfiguredBillingPlan(
  plan: BillingPlanKey,
  currency: BillingCurrency,
  readEnv: EnvReader,
): BillingPlanConfig | null {
  if (currency === 'USD' && readEnv('BILLING_USD_ENABLED')?.trim().toLowerCase() !== 'true') return null;
  const planId = configuredPlanId(currency, plan, readEnv);
  if (!/^plan_[A-Za-z0-9]{14}$/.test(planId)) return null;
  return { ...planDefaults[currency][plan], planId };
}

export function razorpayPlanMatches(config: BillingPlanConfig, plan: Record<string, unknown>) {
  const item = plan.item as Record<string, unknown> | undefined;
  return plan.id === config.planId
    && item?.amount === config.amount
    && item?.currency === config.currency
    && plan.period === config.period
    && plan.interval === config.interval;
}

export function storedSubscriptionUsesConfiguredPlan(storedPlanId: string | null, configuredPlan: BillingPlanConfig) {
  return typeof storedPlanId === 'string' && storedPlanId === configuredPlan.planId;
}

export function subscriptionStartAt(plan: BillingPlanConfig, nowSeconds: number) {
  return plan.trialDays > 0 ? nowSeconds + plan.trialDays * 24 * 60 * 60 : undefined;
}
