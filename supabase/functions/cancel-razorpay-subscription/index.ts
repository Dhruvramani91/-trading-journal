import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
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
    const subscriptionId = body?.subscriptionId;
    if (typeof subscriptionId !== 'string') return jsonResponse({ error: 'A subscription ID is required.' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: savedSubscription, error: lookupError } = await admin.from('billing_subscriptions')
      .select('user_id, status, cancel_at_cycle_end, current_end')
      .eq('razorpay_subscription_id', subscriptionId)
      .maybeSingle();
    if (lookupError) {
      console.error('Could not load subscription for cancellation:', lookupError.message);
      return jsonResponse({ error: 'Could not check your subscription. Please try again.' }, 500);
    }
    if (!savedSubscription || savedSubscription.user_id !== userData.user.id) return jsonResponse({ error: 'This subscription is not linked to your account.' }, 403);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const razorpayAuth = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const subscriptionUrl = `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`;
    const currentResponse = await fetch(subscriptionUrl, { headers: { Authorization: razorpayAuth } });
    const currentProviderSubscription = await currentResponse.json().catch(() => null);
    if (!currentResponse.ok || currentProviderSubscription?.id !== subscriptionId) {
      console.error('Could not verify Razorpay subscription before cancellation:', currentResponse.status, currentProviderSubscription?.error?.code);
      return jsonResponse({ error: 'Could not verify the subscription with Razorpay. Refresh billing details and try again.' }, 502);
    }

    let razorpaySubscription = currentProviderSubscription;
    if (currentProviderSubscription.status !== 'cancelled') {
      if (!['created', 'active', 'authenticated', 'paused'].includes(currentProviderSubscription.status)) {
        return jsonResponse({ error: 'This subscription cannot be cancelled in its current state.' }, 409);
      }

      // Razorpay rejects end-of-cycle cancellation until a billing cycle exists.
      // Authenticated subscriptions awaiting their first charge must be cancelled now.
      const providerCurrentEnd = currentProviderSubscription.current_end;
      const cancelAtCycleEnd = currentProviderSubscription.status === 'active'
        && typeof providerCurrentEnd === 'number'
        && Number.isSafeInteger(providerCurrentEnd)
        && providerCurrentEnd > nowSeconds;
      const cancelResponse = await fetch(`${subscriptionUrl}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: razorpayAuth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd }),
      });
      razorpaySubscription = await cancelResponse.json().catch(() => null);
      if (!cancelResponse.ok) {
        const providerError = razorpaySubscription?.error;
        const description = typeof providerError?.description === 'string'
          ? providerError.description
              .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
              .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted number]')
              .slice(0, 240)
          : 'No description provided.';
        console.error('Razorpay cancellation failed:', cancelResponse.status, providerError?.code, description);
        return jsonResponse({ error: 'Razorpay could not cancel this subscription. Refresh billing details and try again.' }, 502);
      }
    }

    const providerStatus = razorpaySubscription?.status;
    const rawCancelAtCycleEnd = razorpaySubscription?.cancel_at_cycle_end;
    const providerCancelAtCycleEnd = ['active', 'authenticated'].includes(providerStatus)
      && [true, 1, '1', 'true'].includes(rawCancelAtCycleEnd)
      ? true
      : providerStatus === 'cancelled'
        && [undefined, null, false, 0, '0', 'false'].includes(rawCancelAtCycleEnd)
        ? false
        : null;
    if (providerCancelAtCycleEnd === null) {
      console.error('Razorpay returned an unexpected cancellation state:', providerStatus, rawCancelAtCycleEnd);
      return jsonResponse({ error: 'Razorpay returned an unexpected cancellation status. Refresh billing details before retrying.' }, 502);
    }

    const { error: updateError } = await admin.rpc('apply_razorpay_subscription_cancellation', {
      p_subscription_id: subscriptionId,
      p_user_id: userData.user.id,
      p_status: providerStatus,
      p_current_start: Number.isSafeInteger(razorpaySubscription.current_start) ? razorpaySubscription.current_start : null,
      p_current_end: Number.isSafeInteger(razorpaySubscription.current_end) ? razorpaySubscription.current_end : null,
      p_charge_at: Number.isSafeInteger(razorpaySubscription.charge_at) ? razorpaySubscription.charge_at : null,
      p_cancel_at_cycle_end: providerCancelAtCycleEnd,
      p_action_at: nowSeconds,
    });
    if (updateError) {
      console.error('Could not persist cancellation:', updateError.message);
      return jsonResponse({ error: 'Cancellation was sent, but the app could not refresh its status yet.' }, 500);
    }

    return jsonResponse({ cancelled: true });
  } catch (error) {
    console.error('Subscription cancellation failed:', error);
    return jsonResponse({ error: 'Could not cancel this subscription. Please try again.' }, 500);
  }
});
