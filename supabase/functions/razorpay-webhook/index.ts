import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hmacSha256Hex, jsonResponse, safeEqualHex } from '../_shared/http.ts';

const handledEvents = new Set([
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.halted',
  'subscription.paused',
  'subscription.resumed',
  'subscription.updated',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.pending',
]);

function statusForEvent(event: string, providerStatus: unknown) {
  const byEvent: Record<string, string> = {
    'subscription.authenticated': 'authenticated',
    'subscription.activated': 'active',
    'subscription.charged': 'active',
    'subscription.halted': 'halted',
    'subscription.paused': 'paused',
    'subscription.resumed': 'active',
    'subscription.cancelled': 'cancelled',
    'subscription.completed': 'completed',
    'subscription.pending': 'pending',
  };
  if (byEvent[event]) return byEvent[event];
  return ['created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'cancelled', 'completed', 'expired'].includes(String(providerStatus))
    ? String(providerStatus)
    : 'pending';
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, false);

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Webhook is not configured.' }, 503, false);

    const signature = request.headers.get('x-razorpay-signature') || '';
    const rawBody = await request.text();
    const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
    if (!safeEqualHex(expectedSignature, signature)) return jsonResponse({ error: 'Invalid webhook signature.' }, 401, false);

    const eventBody = JSON.parse(rawBody);
    const eventId = eventBody.id;
    const event = eventBody.event;
    const eventCreatedAt = eventBody.created_at;
    if (typeof eventId !== 'string' || !Number.isSafeInteger(eventCreatedAt) || eventCreatedAt < 0) {
      return jsonResponse({ error: 'Webhook event metadata is invalid.' }, 400, false);
    }
    if (typeof event !== 'string' || !event.startsWith('subscription.')) {
      return jsonResponse({ received: true }, 200, false);
    }
    if (!handledEvents.has(event)) return jsonResponse({ received: true }, 200, false);

    const entity = eventBody.payload?.subscription?.entity;
    if (typeof entity?.id !== 'string' || typeof entity.plan_id !== 'string') {
      return jsonResponse({ error: 'Subscription payload is incomplete.' }, 400, false);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('apply_razorpay_subscription_event', {
      p_event_id: eventId,
      p_subscription_id: entity.id,
      p_event_type: event,
      p_event_created_at: eventCreatedAt,
      p_status: statusForEvent(event, entity.status),
      p_current_start: Number.isSafeInteger(entity.current_start) ? entity.current_start : null,
      p_current_end: Number.isSafeInteger(entity.current_end) ? entity.current_end : null,
      p_charge_at: Number.isSafeInteger(entity.charge_at) ? entity.charge_at : null,
      p_cancel_at_cycle_end: typeof entity.cancel_at_cycle_end === 'boolean' ? entity.cancel_at_cycle_end : null,
      p_plan_id: entity.plan_id,
    });
    if (error) {
      console.error('Could not apply Razorpay subscription event:', error.message);
      return jsonResponse({ error: 'Could not persist subscription status.' }, 500, false);
    }

    return jsonResponse({ received: true, result: data }, 200, false);
  } catch (error) {
    console.error('Razorpay webhook processing failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not process webhook.' }, 500, false);
  }
});
