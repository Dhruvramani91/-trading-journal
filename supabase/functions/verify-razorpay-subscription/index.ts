import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, verifyRazorpaySubscriptionSignature } from '../_shared/http.ts';
import { subscriptionEntitled } from '../_shared/entitlements.ts';
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
    if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Sign in is required.' }, 401);
    if (!credentials) return jsonResponse({ error: 'Razorpay is not configured.' }, 503);
    const { keyId, keySecret } = credentials;

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await request.json().catch(() => null);
    const paymentId = body?.razorpay_payment_id;
    const subscriptionId = body?.razorpay_subscription_id;
    const signature = body?.razorpay_signature;
    if (typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId)
      || typeof subscriptionId !== 'string' || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)
      || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
      return jsonResponse({ error: 'Razorpay returned incomplete payment details.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: savedSubscription, error: lookupError } = await admin
      .from('billing_subscriptions')
      .select('user_id, razorpay_subscription_id, plan_key, razorpay_plan_id, trial_days, trial_claimed_at, last_event_created_at')
      .eq('razorpay_subscription_id', subscriptionId)
      .maybeSingle();
    if (lookupError) {
      console.error('Could not load subscription for verification:', lookupError.message);
      return jsonResponse({ error: 'Could not check your subscription. Please try again.' }, 500);
    }
    if (!savedSubscription || savedSubscription.user_id !== userData.user.id) {
      return jsonResponse({ error: 'This subscription is not linked to your account.' }, 403);
    }

    if (!await verifyRazorpaySubscriptionSignature(keySecret, paymentId, savedSubscription.razorpay_subscription_id, signature)) {
      return jsonResponse({ error: 'Payment signature verification failed.' }, 400);
    }

    const apiResponse = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
    });
    const subscription = await apiResponse.json();
    const statuses = ['created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'cancelled', 'completed', 'expired'];
    if (!apiResponse.ok || subscription.id !== subscriptionId || subscription.plan_id !== savedSubscription.razorpay_plan_id || !statuses.includes(subscription.status)) {
      return jsonResponse({ error: 'Could not confirm this subscription with Razorpay.' }, 502);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const update: Record<string, unknown> = {
      status: subscription.status,
      cancel_at_cycle_end: Boolean(subscription.cancel_at_cycle_end),
      updated_at: new Date().toISOString(),
    };
    if (subscription.current_start != null) update.current_start = subscription.current_start;
    if (subscription.current_end != null) update.current_end = subscription.current_end;
    if (subscription.charge_at != null) update.charge_at = subscription.charge_at;
    if (savedSubscription.plan_key === 'monthly' && savedSubscription.trial_days === 7 && subscription.status === 'authenticated') {
      update.trial_claimed_at = new Date().toISOString();
    }
    const { error: updateError } = await admin.from('billing_subscriptions').update(update)
      .eq('razorpay_subscription_id', subscriptionId).eq('user_id', userData.user.id)
      .is('last_event_created_at', null)
      .not('status', 'in', '(cancelled,completed,expired)');
    if (updateError) {
      console.error('Could not update verified Razorpay subscription:', updateError.message);
      return jsonResponse({ error: 'The payment was verified, but its status could not be saved yet.' }, 500);
    }

    const entitled = subscriptionEntitled(
      savedSubscription.plan_key,
      subscription.status,
      subscription.charge_at ?? null,
      subscription.current_end ?? null,
      Boolean(subscription.cancel_at_cycle_end),
      nowSeconds,
      savedSubscription.trial_days,
      Boolean(savedSubscription.trial_claimed_at)
        || (savedSubscription.plan_key === 'monthly' && savedSubscription.trial_days === 7 && subscription.status === 'authenticated'),
      subscription.current_start ?? null,
    );
    return jsonResponse({ verified: true, status: subscription.status, entitled });
  } catch (error) {
    console.error('Subscription verification failed:', error);
    return jsonResponse({ error: 'Could not verify this payment. Please contact support if you were charged.' }, 500);
  }
});
