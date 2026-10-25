import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CreditCard, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { subscriptionEntitled } from '@/lib/billingEntitlement';
import { formatBillingPrice } from '@/lib/billingRegion';
import { cacheBillingEntitlement, invalidateBillingEntitlement } from '@/lib/billingEntitlementCache';
import { useAuthStore } from '@/store/authStore';

type BillingSubscription = {
  id: string;
  payment_provider: 'razorpay' | 'dodo';
  razorpay_subscription_id: string | null;
  dodo_subscription_id: string | null;
  dodo_checkout_session_id: string | null;
  dodo_checkout_url: string | null;
  plan_key: 'monthly' | 'quarterly';
  currency: 'INR' | 'USD';
  status: string;
  current_start: number | null;
  current_end: number | null;
  charge_at: number | null;
  cancel_at_cycle_end: boolean;
  trial_days: number;
  trial_claimed_at: string | null;
  created_at: string;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    created: 'Payment pending', authenticated: 'Authorization pending', active: 'Active',
    halted: 'Payment needs attention', paused: 'Paused', cancelled: 'Cancelled',
    completed: 'Ended', expired: 'Expired', pending: 'Pending',
  };
  return labels[status] || 'Pending confirmation';
}

function formatDate(value: number | string | null) {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function remainingTrial(chargeAt: number, now: number) {
  const seconds = Math.max(0, chargeAt - now);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.max(1, Math.ceil((seconds % 3_600) / 60));
  if (days) return `${days}d ${hours}h left`;
  if (hours) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function hasTrial(subscription: BillingSubscription, now: number) {
  const claimedAt = subscription.trial_claimed_at ? Date.parse(subscription.trial_claimed_at) / 1000 : Number.NaN;
  return subscription.plan_key === 'monthly' && subscription.trial_days === 7
    && Number.isFinite(claimedAt) && claimedAt + 7 * 86_400 > now
    && ['active', 'authenticated', 'cancelled'].includes(subscription.status)
    && subscription.charge_at !== null && subscription.charge_at > now;
}

function referenceFor(subscription: BillingSubscription) {
  return subscription.payment_provider === 'dodo'
    ? subscription.dodo_subscription_id || subscription.dodo_checkout_session_id
    : subscription.razorpay_subscription_id;
}

export function ManageSubscriptionPage() {
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
  const [legacyAccess, setLegacyAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const loadSubscriptions = useCallback(async () => {
    if (!user || !supabase) {
      invalidateBillingEntitlement(user?.id);
      setSubscriptions([]);
      setLegacyAccess(false);
      setError('Billing is unavailable right now.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const [{ data, error: queryError }, entitlement] = await Promise.all([
      supabase.from('billing_subscriptions')
        .select('id, payment_provider, razorpay_subscription_id, dodo_subscription_id, dodo_checkout_session_id, dodo_checkout_url, plan_key, currency, status, current_start, current_end, charge_at, cancel_at_cycle_end, trial_days, trial_claimed_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.rpc('current_user_has_billing_entitlement'),
    ]);
    if (queryError || entitlement.error) {
      invalidateBillingEntitlement(user.id);
      setSubscriptions([]);
      setLegacyAccess(false);
      setError('Could not load subscription history. Try refreshing.');
    } else {
      const rows = (data ?? []) as BillingSubscription[];
      const checkedAt = Math.floor(Date.now() / 1000);
      const entitled = rows.some((item) => subscriptionEntitled(
        item.plan_key, item.status, item.charge_at, item.current_end,
        item.cancel_at_cycle_end, checkedAt, item.trial_days,
        Boolean(item.trial_claimed_at), item.current_start,
      ));
      cacheBillingEntitlement(user.id, entitlement.data === true);
      setSubscriptions(rows);
      setLegacyAccess(entitlement.data === true && !entitled);
    }
    setNow(Math.floor(Date.now() / 1000));
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadSubscriptions(); }, [loadSubscriptions]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setConfirmOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmOpen, busy]);

  const current = subscriptions.find((item) => subscriptionEntitled(
    item.plan_key, item.status, item.charge_at, item.current_end,
    item.cancel_at_cycle_end, now, item.trial_days,
    Boolean(item.trial_claimed_at), item.current_start,
  )) ?? subscriptions[0] ?? null;

  async function cancelSubscription() {
    if (!current || !supabase || busy) return;
    const canCancelAtCycleEnd = current.status === 'active' && current.current_end !== null && current.current_end > now;
    setBusy(true);
    setError('');
    setNotice('');
    const { error: cancelError } = current.payment_provider === 'dodo'
      ? await supabase.functions.invoke('cancel-dodo-subscription', { body: { billingSubscriptionId: current.id } })
      : await supabase.functions.invoke('cancel-razorpay-subscription', { body: { subscriptionId: current.razorpay_subscription_id } });
    if (cancelError) {
      setError(cancelError.message || 'Could not cancel the subscription. Please try again.');
    } else {
      setNotice(['created', 'paused'].includes(current.status)
        ? 'The subscription was cancelled. You can choose a new plan.'
        : canCancelAtCycleEnd
          ? 'Cancellation is scheduled. Your plan remains available through the current period.'
          : hasTrial(current, now)
            ? 'Renewal is cancelled. Your trial access continues until the scheduled first charge date.'
            : 'The subscription was cancelled before its first billing period. No future charge is scheduled.');
      setConfirmOpen(false);
      await loadSubscriptions();
    }
    setBusy(false);
  }

  const activeTrial = current ? hasTrial(current, now) : false;
  const price = current ? formatBillingPrice(current.currency, current.plan_key) : null;

  return <div className="space-y-6">
    <PageHeader
      title="Manage subscription"
      description="Review your plan, payment status, billing dates, and subscription history."
      actions={<Button asChild variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}><Link to="/profile">Back to profile</Link></Button>}
    />

    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-fg-muted" />Current plan</CardTitle>
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void loadSubscriptions()} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardBody>
        {loading ? <p className="py-3 text-sm text-fg-muted">Loading your subscription…</p> : legacyAccess ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-fg">Grandfathered workspace access</p><Badge tone="neutral">Legacy access</Badge></div>
            <p className="text-sm text-fg-muted">Your account has access from before subscriptions launched. No payment is currently scheduled.</p>
          </div>
        ) : current ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold text-fg">{current.plan_key === 'monthly' ? 'Monthly' : 'Quarterly'} plan</h2><Badge tone="neutral">{statusLabel(current.status)}</Badge>{current.cancel_at_cycle_end && <Badge tone="outline">Cancellation scheduled</Badge>}</div>
              <p className="text-sm text-fg-muted">{price} / {current.plan_key === 'monthly' ? 'month' : '3 months'} · {current.payment_provider === 'dodo' ? 'Dodo Payments' : 'Razorpay'} · {current.currency}</p>
              {activeTrial ? <div className="space-y-1 text-sm text-fg-muted"><p className="font-medium text-fg">7-day trial · {remainingTrial(current.charge_at!, now)}</p><p>Trial ends {formatDate(current.charge_at)}. Your first {formatBillingPrice(current.currency, 'monthly')} payment is scheduled then.</p></div>
                : current.cancel_at_cycle_end ? <p className="text-sm text-fg-muted">Access ends {formatDate(current.current_end)}. No renewal is scheduled.</p>
                  : ['cancelled', 'completed', 'expired'].includes(current.status) ? <p className="text-sm text-fg-muted">No further billing is scheduled.</p>
                    : current.charge_at ? <p className="text-sm text-fg-muted">{current.status === 'authenticated' ? 'First charge scheduled' : 'Next billing date'}: {formatDate(current.charge_at)}.</p>
                      : current.status === 'authenticated' ? <p className="text-sm text-fg-muted">Payment provider authorization is recorded; access is pending payment confirmation.</p> : null}
              {current.current_start && <p className="text-xs text-fg-dim">Current period: {formatDate(current.current_start)} – {formatDate(current.current_end)}</p>}
            </div>
            <div className="flex flex-wrap content-start gap-2 lg:justify-end">
              {current.status === 'created' && current.payment_provider === 'dodo' && current.dodo_checkout_url && <Button asChild variant="secondary" size="sm"><a href={current.dodo_checkout_url} target="_blank" rel="noreferrer">Complete checkout</a></Button>}
              {current.status === 'created' && current.payment_provider === 'razorpay' && <Button asChild variant="secondary" size="sm"><Link to={`/checkout?plan=${current.plan_key}`}>Complete checkout</Link></Button>}
              {!current.cancel_at_cycle_end && ['active', 'authenticated', 'paused'].includes(current.status) && <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>{current.status === 'paused' ? 'Cancel paused plan' : 'Cancel plan'}</Button>}
              {current.status === 'created' && current.payment_provider === 'razorpay' && <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>Cancel checkout</Button>}
              {['halted', 'cancelled', 'completed', 'expired'].includes(current.status) && !activeTrial && <Button asChild variant="secondary" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}><Link to="/#pricing">Choose a plan</Link></Button>}
            </div>
          </div>
        ) : error ? <p role="alert" className="py-3 text-sm text-fg-muted">{error}</p> : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-medium text-fg">No subscription yet</p><p className="mt-1 text-sm text-fg-muted">Choose a plan to unlock the full workspace.</p></div>
            <Button asChild variant="secondary" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}><Link to="/#pricing">View plans</Link></Button>
          </div>
        )}
        {error && current && <p role="alert" className="mt-4 text-sm text-loss">{error}</p>}
        {notice && <p role="status" className="mt-4 text-sm text-fg-muted">{notice}</p>}
      </CardBody>
    </Card>

    <Card>
      <CardHeader><div><CardTitle>Subscription history</CardTitle><p className="mt-1 text-sm text-fg-muted">Past and current subscription records linked to this account.</p></div></CardHeader>
      <CardBody className="p-0">
        {loading ? <p className="px-5 py-6 text-sm text-fg-muted">Loading history…</p> : error && subscriptions.length === 0 ? <p role="alert" className="px-5 py-6 text-sm text-fg-muted">History could not be loaded. Use Refresh to try again.</p> : subscriptions.length === 0 ? <p className="px-5 py-6 text-sm text-fg-muted">No subscription history yet.</p> : (
          <div className="divide-y divide-line">
            {subscriptions.map((item) => {
              const itemPrice = formatBillingPrice(item.currency, item.plan_key);
              const ref = referenceFor(item);
              return <article key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-fg">{item.plan_key === 'monthly' ? 'Monthly' : 'Quarterly'} · {itemPrice} {item.currency}</h3><Badge tone="neutral">{statusLabel(item.status)}</Badge></div>
                  <p className="text-sm text-fg-muted">{item.payment_provider === 'dodo' ? 'Dodo Payments' : 'Razorpay'} · Started {formatDate(item.created_at)}</p>
                  <p className="text-xs text-fg-dim">{item.current_start ? `Billing period ${formatDate(item.current_start)} – ${formatDate(item.current_end)}` : item.trial_claimed_at ? `Trial started ${formatDate(item.trial_claimed_at)}` : 'Billing period not started'}</p>
                  {ref && <p className="break-all text-xs text-fg-dim">Subscription reference: {ref}</p>}
                </div>
                {item.charge_at && <div className="text-sm text-fg-muted sm:text-right"><span className="block text-xs text-fg-dim">{item.cancel_at_cycle_end ? 'Access ends' : ['cancelled', 'completed', 'expired'].includes(item.status) ? 'Last scheduled date' : 'Next charge / period end'}</span>{formatDate(item.charge_at)}</div>}
              </article>;
            })}
          </div>
        )}
      </CardBody>
      <div className="border-t border-line px-5 py-3 text-xs leading-5 text-fg-dim">Card and payment-method details are stored by your payment provider, not in this app. Use the receipt from Razorpay or Dodo Payments for completed charge details.</div>
    </Card>

    {confirmOpen && current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) setConfirmOpen(false); }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-bg-1 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" aria-describedby="cancel-subscription-description">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-3 text-fg-muted"><X className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 id="cancel-subscription-title" className="text-base font-semibold text-fg">{current.status === 'created' ? 'Cancel checkout?' : 'Cancel subscription?'}</h2><p id="cancel-subscription-description" className="mt-1 text-sm leading-6 text-fg-muted">{current.status === 'created' ? 'This unfinished checkout will be cancelled. No subscription payment has been completed.' : current.status === 'paused' ? 'This paused subscription will be cancelled now. It is not currently granting access.' : current.status === 'active' && current.current_end !== null && current.current_end > now ? `Your subscription will remain available until ${formatDate(current.current_end)}, then it will be cancelled.` : 'This subscription has not started a billing period yet. Cancelling now will end the trial or authorization and prevent the scheduled first charge.'}</p></div><button type="button" onClick={() => setConfirmOpen(false)} disabled={busy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-bg-4 hover:text-fg disabled:opacity-50" aria-label="Close cancellation dialog"><X className="h-4 w-4" /></button></div>
        {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-bg-3 px-3 py-2 text-xs text-fg">{error}</p>}
        <div className="flex justify-end gap-2 p-5"><Button autoFocus variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={busy}>Keep subscription</Button><Button variant="danger" size="sm" onClick={() => void cancelSubscription()} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{busy ? 'Cancelling…' : 'Confirm cancellation'}</Button></div>
      </div>
    </div>}
  </div>;
}
