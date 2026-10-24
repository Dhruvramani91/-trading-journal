import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, verifiedBillingCountry } from '../_shared/http.ts';
import type { BillingPlanKey } from '../_shared/billingPlans.ts';

const products: Record<BillingPlanKey, { id: string; amount: number }> = {
  monthly: { id: 'pdt_0NqNTDIgk3h06oiRXqgmB', amount: 450 },
  quarterly: { id: 'pdt_0NqNTOIb8Xm2BdqJiuYg9', amount: 1_000 },
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  let reservedSubscriptionId: string | null = null;
  let cleanupAdmin: ReturnType<typeof createClient> | null = null;
  try {
    const authorization = request.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
    if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Sign in is required.' }, 401);
    }
    if (!dodoApiKey) return jsonResponse({ error: 'Dodo Payments is not configured yet.' }, 503);
    if (Deno.env.get('BILLING_USD_ENABLED')?.trim().toLowerCase() !== 'true') {
      return jsonResponse({ error: 'International subscriptions are not enabled yet.' }, 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user?.email) return jsonResponse({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await request.json().catch(() => null);
    const plan = body?.plan as BillingPlanKey;
    if (plan !== 'monthly' && plan !== 'quarterly') return jsonResponse({ error: 'Choose a valid plan.' }, 400);
    const country = await verifiedBillingCountry(body?.regionToken, Deno.env.get('BILLING_REGION_TOKEN_SECRET'));
    if (!country || country === 'IN') return jsonResponse({ error: 'A verified international billing region is required.' }, 403);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    cleanupAdmin = admin;
    const { data: existing, error: existingError } = await admin.from('billing_subscriptions')
      .select('id, payment_provider, plan_key, currency, status, dodo_checkout_url')
      .eq('user_id', userData.user.id)
      .in('status', ['created', 'authenticated', 'active', 'pending', 'paused'])
      .limit(1)
      .maybeSingle();
    if (existingError) {
      console.error('Could not check existing billing subscription:', existingError.message);
      return jsonResponse({ error: 'Could not check your subscription. Please try again.' }, 500);
    }
    if (existing) {
      if (existing.payment_provider === 'dodo' && existing.status === 'created'
        && existing.plan_key === plan && existing.currency === 'USD' && existing.dodo_checkout_url) {
        return jsonResponse({ checkoutUrl: existing.dodo_checkout_url, amount: products[plan].amount, currency: 'USD' });
      }
      return jsonResponse({ error: 'You already have a subscription or checkout in progress. Manage it from your Profile page.' }, 409);
    }

    const product = products[plan];
    const productResponse = await fetch(`https://test.dodopayments.com/products/${encodeURIComponent(product.id)}`, {
      headers: { Authorization: `Bearer ${dodoApiKey}` },
    });
    const configuredProduct = await productResponse.json().catch(() => null);
    const recurringPrice = configuredProduct?.price;
    const expectedFrequency = plan === 'monthly' ? 1 : 3;
    if (!productResponse.ok || configuredProduct?.product_id !== product.id
      || configuredProduct?.is_recurring !== true
      || recurringPrice?.type !== 'recurring_price'
      || recurringPrice?.price !== product.amount
      || recurringPrice?.currency !== 'USD'
      || recurringPrice?.payment_frequency_count !== expectedFrequency
      || recurringPrice?.payment_frequency_interval !== 'Month'
      || (recurringPrice?.trial_period_days ?? 0) !== 0) {
      console.error('Dodo product does not match the expected published price and cadence.', productResponse.status, product.id);
      return jsonResponse({ error: 'The international plan price or billing interval is not configured correctly. Please contact support.' }, 503);
    }

    const { data: localSubscription, error: insertError } = await admin.from('billing_subscriptions').insert({
      user_id: userData.user.id,
      payment_provider: 'dodo',
      plan_key: plan,
      currency: 'USD',
      dodo_product_id: product.id,
      status: 'created',
      trial_days: 0,
    }).select('id').single();
    if (insertError || !localSubscription?.id) {
      console.error('Could not reserve Dodo checkout:', insertError?.message);
      return jsonResponse({ error: 'A subscription is already in progress, or checkout could not be reserved. Refresh your Profile page.' }, 409);
    }
    reservedSubscriptionId = localSubscription.id;

    const appUrl = Deno.env.get('APP_BASE_URL')?.replace(/\/$/, '') || 'http://localhost:5176';
    const response = await fetch('https://test.dodopayments.com/checkout-sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dodoApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_cart: [{ product_id: product.id, quantity: 1 }],
        customer: { email: userData.user.email, name: userData.user.user_metadata?.full_name || userData.user.email },
        return_url: `${appUrl}/profile?checkout=dodo`,
        metadata: { billing_subscription_id: localSubscription.id, user_id: userData.user.id, plan_key: plan },
      }),
    });
    const session = await response.json().catch(() => null);
    if (!response.ok || typeof session?.checkout_url !== 'string' || typeof session?.session_id !== 'string') {
      await admin.from('billing_subscriptions').delete().eq('id', localSubscription.id);
      reservedSubscriptionId = null;
      console.error('Dodo checkout session creation failed:', response.status, session?.message || session?.error);
      return jsonResponse({ error: 'Dodo Payments could not start checkout. Please try again.' }, 502);
    }

    const { error: updateError } = await admin.from('billing_subscriptions').update({
      dodo_checkout_session_id: session.session_id,
      dodo_checkout_url: session.checkout_url,
      updated_at: new Date().toISOString(),
    }).eq('id', localSubscription.id);
    if (updateError) {
      console.error('Could not save Dodo checkout session:', updateError.message);
      await admin.from('billing_subscriptions').delete().eq('id', localSubscription.id);
      reservedSubscriptionId = null;
      return jsonResponse({ error: 'Checkout was created but could not be safely saved. Please contact support before retrying.' }, 500);
    }

    reservedSubscriptionId = null;
    return jsonResponse({ checkoutUrl: session.checkout_url, amount: product.amount, currency: 'USD' });
  } catch (error) {
    if (reservedSubscriptionId && cleanupAdmin) {
      const { error: cleanupError } = await cleanupAdmin.from('billing_subscriptions').delete().eq('id', reservedSubscriptionId);
      if (cleanupError) console.error('Could not remove incomplete Dodo checkout reservation:', cleanupError.message);
    }
    console.error('Dodo checkout creation failed:', error);
    return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});
