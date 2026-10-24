import { describe, expect, it } from 'vitest';
import { getConfiguredBillingPlan, razorpayPlanMatches, storedSubscriptionUsesConfiguredPlan, subscriptionStartAt } from './billingPlans';
import { subscriptionEntitled } from '../../../src/lib/billingEntitlement';
import { hmacSha256Hex, verifiedBillingCountry, verifyRazorpaySubscriptionSignature } from './http';
import { subscriptionEntitled as edgeSubscriptionEntitled } from './entitlements';

const env = (values: Record<string, string>) => (name: string) => values[name];

describe('Razorpay billing plan configuration', () => {
  it('loads INR monthly and quarterly plans with paise amounts and intervals', () => {
    const read = env({
      RAZORPAY_PLAN_MONTHLY_ID: 'plan_TmG2ycKW4323ZS',
      RAZORPAY_PLAN_QUARTERLY_ID: 'plan_TmG3pC7I7ZOkAm',
    });
    expect(getConfiguredBillingPlan('monthly', 'INR', read)).toMatchObject({ amount: 40_000, currency: 'INR', period: 'monthly', interval: 1, trialDays: 7 });
    expect(getConfiguredBillingPlan('quarterly', 'INR', read)).toMatchObject({ amount: 100_000, currency: 'INR', period: 'quarterly', interval: 1, trialDays: 0 });
  });

  it('keeps USD disabled unless explicitly enabled and both selected plan and IDs are valid', () => {
    const disabled = env({ RAZORPAY_PLAN_MONTHLY_USD_ID: 'plan_TmG2ycKW4323ZS' });
    expect(getConfiguredBillingPlan('monthly', 'USD', disabled)).toBeNull();

    const enabled = env({ BILLING_USD_ENABLED: 'true', RAZORPAY_PLAN_MONTHLY_USD_ID: 'plan_TmG2ycKW4323ZS' });
    expect(getConfiguredBillingPlan('monthly', 'USD', enabled)).toMatchObject({ amount: 400, currency: 'USD' });
    expect(getConfiguredBillingPlan('quarterly', 'USD', enabled)).toBeNull();
    expect(getConfiguredBillingPlan('monthly', 'USD', env({ BILLING_USD_ENABLED: 'true', RAZORPAY_PLAN_MONTHLY_USD_ID: 'missing' }))).toBeNull();
  });

  it('rejects a configured Razorpay plan with the wrong currency, amount, or cadence', () => {
    const config = getConfiguredBillingPlan('monthly', 'INR', env({ RAZORPAY_PLAN_MONTHLY_ID: 'plan_TmG2ycKW4323ZS' }))!;
    expect(razorpayPlanMatches(config, { id: config.planId, period: 'monthly', interval: 1, item: { amount: 40_000, currency: 'INR' } })).toBe(true);
    expect(razorpayPlanMatches(config, { id: config.planId, period: 'monthly', interval: 1, item: { amount: 400, currency: 'INR' } })).toBe(false);
    expect(razorpayPlanMatches(config, { id: config.planId, period: 'monthly', interval: 1, item: { amount: 40_000, currency: 'USD' } })).toBe(false);
    expect(razorpayPlanMatches(config, { id: config.planId, period: 'quarterly', interval: 1, item: { amount: 40_000, currency: 'INR' } })).toBe(false);
  });

  it('only reuses an unfinished subscription when its stored plan ID is still configured', () => {
    const configured = getConfiguredBillingPlan('monthly', 'INR', env({ RAZORPAY_PLAN_MONTHLY_ID: 'plan_TmG2ycKW4323ZS' }))!;
    expect(storedSubscriptionUsesConfiguredPlan(configured.planId, configured)).toBe(true);
    expect(storedSubscriptionUsesConfiguredPlan('plan_OldPlan000001', configured)).toBe(false);
    expect(storedSubscriptionUsesConfiguredPlan(null, configured)).toBe(false);
  });

  it('schedules one monthly trial and charges quarterly plans immediately', () => {
    const read = env({ RAZORPAY_PLAN_MONTHLY_ID: 'plan_TmG2ycKW4323ZS', RAZORPAY_PLAN_QUARTERLY_ID: 'plan_TmG3pC7I7ZOkAm' });
    expect(subscriptionStartAt(getConfiguredBillingPlan('monthly', 'INR', read)!, 1_000)).toBe(605_800);
    expect(subscriptionStartAt(getConfiguredBillingPlan('quarterly', 'INR', read)!, 1_000)).toBeUndefined();
  });
});

describe('subscription entitlement rules', () => {
  it('allows an authorized monthly subscription during its scheduled trial only', () => {
    expect(subscriptionEntitled('monthly', 'authenticated', 2_000, null, false, 1_000, 7, true)).toBe(true);
    expect(edgeSubscriptionEntitled('monthly', 'authenticated', 2_000, null, false, 1_000, 7, true)).toBe(true);
    expect(subscriptionEntitled('monthly', 'authenticated', 900, null, false, 1_000, 7, true)).toBe(false);
    expect(subscriptionEntitled('monthly', 'authenticated', 2_000, null, false, 1_000, 7, false)).toBe(false);
    expect(subscriptionEntitled('monthly', 'authenticated', 2_000, null, false, 1_000, 0, true)).toBe(false);
    expect(subscriptionEntitled('quarterly', 'authenticated', 2_000, null, false, 1_000, 7, true)).toBe(false);
  });

  it('requires active status or an unexpired cancel-at-period-end entitlement', () => {
    expect(subscriptionEntitled('quarterly', 'active', null, 2_000, false, 1_000)).toBe(true);
    expect(subscriptionEntitled('quarterly', 'active', null, null, false, 1_000)).toBe(false);
    expect(edgeSubscriptionEntitled('quarterly', 'active', null, null, false, 1_000)).toBe(false);
    expect(subscriptionEntitled('quarterly', 'halted', null, 2_000, false, 1_000)).toBe(false);
    expect(subscriptionEntitled('quarterly', 'cancelled', null, 2_000, true, 1_000)).toBe(true);
    expect(subscriptionEntitled('quarterly', 'cancelled', null, 900, true, 1_000)).toBe(false);
  });

  it('preserves a claimed monthly trial after cancellation only through its original end time', () => {
    expect(subscriptionEntitled('monthly', 'cancelled', 2_000, null, false, 1_000, 7, true)).toBe(true);
    expect(edgeSubscriptionEntitled('monthly', 'cancelled', 2_000, null, false, 1_000, 7, true)).toBe(true);
    expect(subscriptionEntitled('monthly', 'cancelled', 900, null, false, 1_000, 7, true)).toBe(false);
    expect(subscriptionEntitled('monthly', 'cancelled', 2_000, null, false, 1_000, 7, false)).toBe(false);
    expect(subscriptionEntitled('monthly', 'cancelled', 2_000, null, false, 1_000, 0, true)).toBe(false);
    expect(subscriptionEntitled('monthly', 'cancelled', 2_000, null, false, 1_000, 7, true, 1_000)).toBe(false);
    expect(subscriptionEntitled('quarterly', 'cancelled', 2_000, null, false, 1_000, 7, true)).toBe(false);
  });

  it('keeps frontend and Edge Function entitlement rules identical', () => {
    const cases = [
      ['monthly', 'authenticated', 2_000, null, false],
      ['quarterly', 'authenticated', 2_000, null, false],
      ['quarterly', 'active', null, 2_000, false],
      ['quarterly', 'halted', null, 2_000, false],
      ['quarterly', 'cancelled', null, 2_000, true],
    ] as const;
    for (const [plan, status, chargeAt, currentEnd, cancelAtCycleEnd] of cases) {
      expect(edgeSubscriptionEntitled(plan, status, chargeAt, currentEnd, cancelAtCycleEnd, 1_000))
        .toBe(subscriptionEntitled(plan, status, chargeAt, currentEnd, cancelAtCycleEnd, 1_000));
    }
  });
});

describe('Razorpay subscription checkout signature', () => {
  it('accepts a valid payment_id|subscription_id signature', async () => {
    const secret = 'subscription-test-secret';
    const paymentId = 'pay_0123456789';
    const subscriptionId = 'sub_9876543210';
    const signature = await hmacSha256Hex(secret, `${paymentId}|${subscriptionId}`);
    expect(await verifyRazorpaySubscriptionSignature(secret, paymentId, subscriptionId, signature)).toBe(true);
  });

  it('rejects invalid signatures and tampered payment or subscription IDs', async () => {
    const secret = 'subscription-test-secret';
    const paymentId = 'pay_0123456789';
    const subscriptionId = 'sub_9876543210';
    const signature = await hmacSha256Hex(secret, `${paymentId}|${subscriptionId}`);
    expect(await verifyRazorpaySubscriptionSignature(secret, paymentId, subscriptionId, '0'.repeat(64))).toBe(false);
    expect(await verifyRazorpaySubscriptionSignature(secret, 'pay_tampered', subscriptionId, signature)).toBe(false);
    expect(await verifyRazorpaySubscriptionSignature(secret, paymentId, 'sub_tampered', signature)).toBe(false);
  });
});

describe('signed region assertions', () => {
  it('accepts a recent server signature and rejects edited, expired, or unsigned region data', async () => {
    const now = 1_800_000_000;
    const secret = 'a'.repeat(32);
    const payload = `US.${now + 600}`;
    const token = `${payload}.${await hmacSha256Hex(secret, payload)}`;
    expect(await verifiedBillingCountry(token, secret, now)).toBe('US');
    expect(await verifiedBillingCountry(token.replace('US', 'IN'), secret, now)).toBeNull();
    expect(await verifiedBillingCountry(token, secret, now + 601)).toBeNull();
    expect(await verifiedBillingCountry(token, undefined, now)).toBeNull();
    expect(await verifiedBillingCountry(`${payload}.${'0'.repeat(64)}`, secret, now)).toBeNull();
  });
});
