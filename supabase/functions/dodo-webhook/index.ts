import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function verifyDodoSignature(secret: string, rawBody: string, id: string, timestamp: string, signatureHeader: string) {
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const encodedSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(encodedSecret), (character) => character.charCodeAt(0));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = `${id}.${timestamp}.${rawBody}`;
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed)));
  const expected = btoa(String.fromCharCode(...digest));
  return signatureHeader.split(' ').some((candidate) => {
    const [version, supplied] = candidate.split(',', 2);
    return version === 'v1' && typeof supplied === 'string' && constantTimeEqual(expected, supplied);
  });
}

function seconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function appStatus(providerStatus: unknown) {
  switch (providerStatus) {
    case 'active': case 'pending': case 'paused': case 'cancelled': case 'expired': case 'failed': return providerStatus;
    case 'on_hold': return 'halted';
    case 'past_due': return 'active';
    default: return null;
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405 });
  try {
    const webhookKey = Deno.env.get('DODO_PAYMENTS_WEBHOOK_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const eventId = request.headers.get('webhook-id');
    const timestamp = request.headers.get('webhook-timestamp');
    const signature = request.headers.get('webhook-signature');
    if (!webhookKey || !supabaseUrl || !serviceRoleKey) return new Response('Webhook is not configured.', { status: 503 });
    if (!eventId || !timestamp || !signature) return new Response('Missing webhook signature headers.', { status: 401 });

    const rawBody = await request.text();
    if (!await verifyDodoSignature(webhookKey, rawBody, eventId, timestamp, signature)) {
      return new Response('Invalid webhook signature.', { status: 401 });
    }
    const event = JSON.parse(rawBody);
    const type = event?.type;
    const data = event?.data;
    const subscriptionId = data?.subscription_id;
    const productId = data?.product_id;
    if (typeof type !== 'string' || typeof subscriptionId !== 'string' || typeof productId !== 'string') {
      return new Response('Invalid subscription event payload.', { status: 400 });
    }

    const metadata = data?.metadata;
    const billingSubscriptionId = typeof metadata?.billing_subscription_id === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadata.billing_subscription_id)
      ? metadata.billing_subscription_id
      : null;
    const eventCreatedAt = seconds(event?.timestamp) ?? Math.floor(Number(timestamp));
    const statusByEvent: Record<string, string> = {
      'subscription.active': 'active',
      'subscription.renewed': 'active',
      'subscription.updated': appStatus(data.status) || 'active',
      'subscription.cancelled': 'cancelled',
      'subscription.expired': 'expired',
      'subscription.on_hold': 'halted',
      'subscription.failed': 'failed',
      'subscription.past_due': 'active',
      'subscription.paused': 'paused',
      'subscription.unpaused': 'active',
      'subscription.update_payment_method': appStatus(data.status) || 'active',
    };
    const status = statusByEvent[type];
    if (!status) return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { error } = await supabase.rpc('apply_dodo_subscription_event', {
      p_event_id: eventId,
      p_subscription_id: subscriptionId,
      p_event_type: type,
      p_event_created_at: eventCreatedAt,
      p_status: status,
      p_current_start: seconds(data.previous_billing_date),
      p_current_end: type === 'subscription.past_due' || data.status === 'past_due' ? seconds(data.past_due_ends_at) : seconds(data.next_billing_date),
      p_charge_at: type === 'subscription.past_due' || data.status === 'past_due' ? seconds(data.past_due_ends_at) : seconds(data.next_billing_date),
      p_cancel_at_cycle_end: typeof data.cancel_at_next_billing_date === 'boolean' ? data.cancel_at_next_billing_date : null,
      p_billing_subscription_id: billingSubscriptionId,
      p_product_id: productId,
    });
    if (error) {
      console.error('Could not apply Dodo subscription event:', error.message);
      return new Response('Could not apply subscription event.', { status: 500 });
    }
    if (type === 'subscription.active' || type === 'subscription.renewed') {
      const { error: trialClaimError } = await supabase.from('billing_subscriptions')
        .update({ trial_claimed_at: new Date().toISOString() })
        .eq('payment_provider', 'dodo')
        .eq('dodo_subscription_id', subscriptionId)
        .eq('trial_days', 7)
        .is('trial_claimed_at', null);
      if (trialClaimError) {
        console.error('Could not record Dodo trial claim:', trialClaimError.message);
        return new Response('Could not save trial status.', { status: 500 });
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Dodo webhook processing failed:', error);
    return new Response('Invalid webhook payload.', { status: 400 });
  }
});
