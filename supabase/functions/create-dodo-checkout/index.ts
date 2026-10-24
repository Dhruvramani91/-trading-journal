import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, verifiedBillingCountry } from '../_shared/http.ts';
import type { BillingPlanKey } from '../_shared/billingPlans.ts';
import { readDodoConfig } from '../_shared/dodoConfig.ts';

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
    const dodo = readDodoConfig((name) => Deno.env.get(name) ?? undefined);
    if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Sign in is required.' }, 401);
    }
    if (!dodo) return jsonResponse({ error: 'Dodo Payments is not fully configured for this environment.' }, 503);
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
      .select('id, payment_provider, plan_key, currency, status, dodo_checkout_url, trial_days')
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
        return jsonResponse({ checkoutUrl: existing.dodo_checkout_url, amount: dodo.products[plan].amount, currency: 'USD', trialDays: existing.trial_days || 0 });
      }
      return jsonResponse({ error: 'You already have a subscription or checkout in progress. Manage it from your Profile page.' }, 409);
    }

    let trialDays = 0;
    if (plan === 'monthly') {
      const { data: previousTrial, error: trialError } = await admin.from('billing_subscriptions')
        .select('id')
        .not('trial_claimed_at', 'is', null)
        .limit(1)
        .maybeSingle();
      if (trialError) {
        console.error('Could not check Dodo trial eligibility:', trialError.message);
        return jsonResponse({ error: 'Could not check trial eligibility. Please try again.' }, 500);
      }
      if (!previousTrial) trialDays = 7;
    }

    const product = dodo.products[plan];
    const productResponse = await fetch(`${dodo.baseUrl}/products/${encodeURIComponent(product.id)}`, {
      headers: { Authorization: `Bearer ${dodo.apiKey}` },
    });
    const configuredProduct = await productResponse.json().catch(() => null);
    const recurringPrice = configuredProduct?.price;
    const expectedFrequency = product.intervalCount;
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
      trial_days: trialDays,
    }).select('id').single();
    if (insertError || !localSubscription?.id) {
      console.error('Could not reserve Dodo checkout:', insertError?.message);
      return jsonResponse({ error: 'A subscription is already in progress, or checkout could not be reserved. Refresh your Profile page.' }, 409);
    }
    reservedSubscriptionId = localSubscription.id;

    const appBaseUrl = Deno.env.get('APP_BASE_URL')?.trim().replace(/\/+$/, '');
    let appOrigin: string;
    try {
      const parsedAppUrl = new URL(appBaseUrl || '');
      if (parsedAppUrl.protocol !== 'https:' || /^(localhost|127\.0\.0\.1)$/i.test(parsedAppUrl.hostname)) throw new Error('Invalid app URL');
      appOrigin = parsedAppUrl.origin;
    } catch {
      await admin.from('billing_subscriptions').delete().eq('id', localSubscription.id);
      reservedSubscriptionId = null;
      return jsonResponse({ error: 'Dodo return URL is not configured for this environment.' }, 503);
    }
    const response = await fetch(`${dodo.baseUrl}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dodo.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_cart: [{ product_id: product.id, quantity: 1 }],
        ...(trialDays > 0 ? { subscription_data: { trial_period_days: trialDays } } : {}),
        customer: { email: userData.user.email, name: userData.user.user_metadata?.full_name || userData.user.email },
        return_url: `${appOrigin}/profile?checkout=dodo`,
        metadata: { billing_subscription_id: localSubscription.id, user_id: userData.user.id, plan_key: plan },
      }),
    });
    const responseText = await response.text();
    let session: Record<string, unknown> | null = null;
    try {
      session = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      // Keep non-JSON provider responses out of logs; status and content type are enough to diagnose them.
    }
    if (!response.ok || typeof session?.checkout_url !== 'string' || typeof session?.session_id !== 'string') {
      await admin.from('billing_subscriptions').delete().eq('id', localSubscription.id);
      reservedSubscriptionId = null;
      const nestedError = session?.error && typeof session.error === 'object'
        ? session.error as Record<string, unknown>
        : null;
      const providerMessage = [
        session?.message,
        session?.detail,
        session?.code,
        nestedError?.message,
        nestedError?.detail,
        nestedError?.code,
      ].find((value): value is string => typeof value === 'string' && value.length > 0);
      console.error('Dodo checkout session creation failed:', JSON.stringify({
        status: response.status,
        contentType: response.headers.get('content-type'),
        code: typeof session?.code === 'string' ? session.code : nestedError?.code,
        message: providerMessage,
      }));
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
    return jsonResponse({ checkoutUrl: session.checkout_url, amount: product.amount, currency: 'USD', trialDays });
  } catch (error) {
    if (reservedSubscriptionId && cleanupAdmin) {
      const { error: cleanupError } = await cleanupAdmin.from('billing_subscriptions').delete().eq('id', reservedSubscriptionId);
      if (cleanupError) console.error('Could not remove incomplete Dodo checkout reservation:', cleanupError.message);
    }
    console.error('Dodo checkout creation failed:', error);
    return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});
