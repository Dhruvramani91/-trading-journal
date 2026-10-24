import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, verifiedBillingCountry } from '../_shared/http.ts';
import { getConfiguredBillingPlan, razorpayPlanMatches, storedSubscriptionUsesConfiguredPlan, subscriptionStartAt, type BillingPlanKey } from '../_shared/billingPlans.ts';
import { readRazorpayCredentials } from '../_shared/razorpayConfig.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const credentials = readRazorpayCredentials((name) => Deno.env.get(name));
    if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Sign in is required.' }, 401);
    }
    if (!credentials) return jsonResponse({ error: 'Razorpay is not configured yet.' }, 503);
    const { keyId, keySecret } = credentials;

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await request.json().catch(() => null);
    const plan = body?.plan as BillingPlanKey;
    if (plan !== 'monthly' && plan !== 'quarterly') return jsonResponse({ error: 'Choose a valid plan.' }, 400);

    // Currency is derived from a country assertion signed by the same-origin
    // Vercel function. A client-supplied country/currency is never authoritative.
    const country = await verifiedBillingCountry(body?.regionToken, Deno.env.get('BILLING_REGION_TOKEN_SECRET'));
    const currency = country && country !== 'IN' ? 'USD' : 'INR';
    if (currency === 'USD') return jsonResponse({ error: 'International subscriptions are handled by Dodo Payments.' }, 409);
    const configuredPlan = getConfiguredBillingPlan(plan, currency, (name) => Deno.env.get(name));
    if (!configuredPlan) {
      return jsonResponse({ error: currency === 'USD'
        ? 'International subscriptions are not available for this account yet.'
        : 'The selected Razorpay plan has not been configured.' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const nowSeconds = Math.floor(Date.now() / 1000);
    const { data: cancelledTrial, error: cancelledTrialError } = await admin.from('billing_subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', userData.user.id)
      .eq('plan_key', 'monthly')
      .eq('status', 'cancelled')
      .eq('trial_days', 7)
      .not('trial_claimed_at', 'is', null)
      .is('current_start', null)
      .is('current_end', null)
      .gt('charge_at', nowSeconds)
      .limit(1)
      .maybeSingle();
    if (cancelledTrialError) {
      console.error('Could not check cancelled trial access:', cancelledTrialError.message);
      return jsonResponse({ error: 'Could not check your current subscription. Please try again.' }, 500);
    }
    if (cancelledTrial) {
      return jsonResponse({ error: 'Your cancelled trial is still active. Return to your workspace; no payment is due until the trial ends.' }, 409);
    }

    const { data: existingSubscription, error: existingError } = await admin.from('billing_subscriptions')
      .select('razorpay_subscription_id, razorpay_plan_id, plan_key, status, currency, trial_claimed_at, trial_days')
      .eq('user_id', userData.user.id)
      .in('status', ['active', 'authenticated', 'created', 'pending', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) {
      console.error('Could not check existing subscription:', existingError.message);
      return jsonResponse({ error: 'Could not check your current subscription. Please try again.' }, 500);
    }
    if (existingSubscription && existingSubscription.status !== 'created') {
      return jsonResponse({ error: 'You already have a subscription in progress. Manage it from your Profile page.' }, 409);
    }
    if (existingSubscription?.status === 'created') {
      if (existingSubscription.plan_key !== plan) {
        return jsonResponse({ error: 'You have an unfinished checkout for another plan. Resume or cancel it from your Profile page first.' }, 409);
      }
      if (existingSubscription.currency && existingSubscription.currency !== configuredPlan.currency) {
        return jsonResponse({ error: 'You have an unfinished checkout for another billing region. Complete or contact support to cancel it first.' }, 409);
      }
      if (!storedSubscriptionUsesConfiguredPlan(existingSubscription.razorpay_plan_id, configuredPlan)) {
        return jsonResponse({ error: 'Your unfinished checkout uses an older price. Cancel it from your Profile page before starting checkout at the current price.' }, 409);
      }
      return jsonResponse({ keyId, subscriptionId: existingSubscription.razorpay_subscription_id, currency: existingSubscription.currency || 'INR', amount: configuredPlan.amount, trialDays: existingSubscription.trial_days || 0 });
    }

    let selectedPlan = configuredPlan;
    if (plan === 'monthly') {
      const { data: previousTrial, error: trialError } = await admin.from('billing_subscriptions')
        .select('id')
        .eq('user_id', userData.user.id)
        .not('trial_claimed_at', 'is', null)
        .limit(1)
        .maybeSingle();
      if (trialError) {
        console.error('Could not check monthly trial eligibility:', trialError.message);
        return jsonResponse({ error: 'Could not check trial eligibility. Please try again.' }, 500);
      }
      if (previousTrial) selectedPlan = { ...configuredPlan, trialDays: 0 };
    }

    const basic = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const planResponse = await fetch(`https://api.razorpay.com/v1/plans/${encodeURIComponent(selectedPlan.planId)}`, {
      headers: { Authorization: basic },
    });
    if (!planResponse.ok) {
      console.error('Could not fetch configured Razorpay plan:', planResponse.status);
      return jsonResponse({ error: 'Could not validate the selected payment plan.' }, 502);
    }
    const razorpayPlan = await planResponse.json();
    if (!razorpayPlanMatches(selectedPlan, razorpayPlan)) {
      console.error('Configured Razorpay plan does not match the published price/cadence.', { plan, planId: selectedPlan.planId });
      return jsonResponse({ error: 'The configured Razorpay plan does not match the price shown. Please contact support.' }, 503);
    }

    const startAt = subscriptionStartAt(selectedPlan, Math.floor(Date.now() / 1000));
    const createResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { Authorization: basic, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: selectedPlan.planId,
        quantity: 1,
        customer_notify: false,
        total_count: plan === 'monthly' ? 1200 : 400,
        ...(startAt ? { start_at: startAt } : {}),
        notes: { user_id: userData.user.id, plan_key: plan, currency: selectedPlan.currency },
      }),
    });
    const subscription = await createResponse.json();
    if (!createResponse.ok || typeof subscription.id !== 'string') {
      console.error('Razorpay subscription create failed:', createResponse.status, subscription?.error?.code);
      return jsonResponse({ error: 'Razorpay could not create this subscription. Please try again.' }, 502);
    }

    const { error: saveError } = await admin.from('billing_subscriptions').upsert({
      user_id: userData.user.id,
      razorpay_subscription_id: subscription.id,
      plan_key: plan,
      currency: selectedPlan.currency,
      razorpay_plan_id: selectedPlan.planId,
      trial_days: selectedPlan.trialDays,
      status: subscription.status || 'created',
      current_start: subscription.current_start,
      current_end: subscription.current_end,
      charge_at: subscription.charge_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'razorpay_subscription_id' });
    if (saveError) {
      console.error('Could not persist Razorpay subscription:', saveError.message);
      // A provider subscription without a durable owner record must never be
      // offered to the customer. Cancel it immediately so it cannot be charged.
      const cleanupResponse = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscription.id)}/cancel`, {
        method: 'POST',
        headers: { Authorization: basic, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_cycle_end: false }),
      });
      if (!cleanupResponse.ok) console.error('Could not cancel unmanaged Razorpay subscription:', cleanupResponse.status);
      return jsonResponse({ error: 'Could not safely save your checkout. Please try again.' }, 500);
    }

    return jsonResponse({ keyId, subscriptionId: subscription.id, currency: selectedPlan.currency, amount: selectedPlan.amount, trialDays: selectedPlan.trialDays });
  } catch (error) {
    console.error('Subscription creation failed:', error);
    return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});
