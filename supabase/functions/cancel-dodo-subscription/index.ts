import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
    if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Sign in is required.' }, 401);
    if (!apiKey) return jsonResponse({ error: 'Dodo Payments is not configured.' }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'Your session has expired. Sign in again.' }, 401);
    const body = await request.json().catch(() => null);
    if (typeof body?.billingSubscriptionId !== 'string') return jsonResponse({ error: 'A billing subscription ID is required.' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: saved, error: lookupError } = await admin.from('billing_subscriptions')
      .select('id, user_id, dodo_subscription_id, status, current_end')
      .eq('id', body.billingSubscriptionId)
      .eq('payment_provider', 'dodo')
      .maybeSingle();
    if (lookupError) return jsonResponse({ error: 'Could not check your subscription. Please try again.' }, 500);
    if (!saved || saved.user_id !== userData.user.id) return jsonResponse({ error: 'This subscription is not linked to your account.' }, 403);
    if (!saved.dodo_subscription_id) return jsonResponse({ error: 'Finish or close the Dodo checkout before cancelling this subscription.' }, 409);

    const cancelAtCycleEnd = saved.status === 'active' && saved.current_end !== null && saved.current_end > Math.floor(Date.now() / 1000);
    const response = await fetch(`https://test.dodopayments.com/subscriptions/${encodeURIComponent(saved.dodo_subscription_id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cancelAtCycleEnd ? { cancel_at_next_billing_date: true } : {}),
    });
    const subscription = await response.json().catch(() => null);
    if (!response.ok || subscription?.subscription_id !== saved.dodo_subscription_id) {
      console.error('Dodo cancellation failed:', response.status, subscription?.message || subscription?.error);
      return jsonResponse({ error: 'Dodo Payments could not cancel this subscription. Refresh billing details and try again.' }, 502);
    }

    const providerStatus = typeof subscription.status === 'string' ? subscription.status : saved.status;
    const endsAt = typeof subscription.next_billing_date === 'string' ? Math.floor(Date.parse(subscription.next_billing_date) / 1000) : saved.current_end;
    const { error: updateError } = await admin.from('billing_subscriptions').update({
      status: providerStatus,
      current_end: endsAt,
      charge_at: endsAt,
      cancel_at_cycle_end: subscription.cancel_at_next_billing_date === true,
      updated_at: new Date().toISOString(),
    }).eq('id', saved.id);
    if (updateError) {
      console.error('Could not save Dodo cancellation:', updateError.message);
      return jsonResponse({ error: 'Cancellation was sent, but the app could not refresh its status yet.' }, 500);
    }
    return jsonResponse({ cancelled: true, cancelAtCycleEnd: subscription.cancel_at_next_billing_date === true });
  } catch (error) {
    console.error('Dodo cancellation failed:', error);
    return jsonResponse({ error: 'Could not cancel this subscription. Please try again.' }, 500);
  }
});
