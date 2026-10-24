import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ShieldCheck,
  UserRound,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  Camera,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary } from '@/analytics/core';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { subscriptionEntitled } from '@/lib/billingEntitlement';

type BillingSubscription = {
  id: string;
  payment_provider: 'razorpay' | 'dodo';
  razorpay_subscription_id: string;
  dodo_subscription_id: string | null;
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
};

function billingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    created: 'Payment pending',
    authenticated: 'Trial / authorization',
    active: 'Active',
    halted: 'Payment needs attention',
    paused: 'Paused',
    cancelled: 'Cancelled',
    completed: 'Ended',
  };
  return labels[status] || 'Pending confirmation';
}

function billingDate(timestamp: number | null) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(timestamp * 1000));
}

function trialTimeRemaining(chargeAt: number, nowSeconds: number) {
  const remainingSeconds = Math.max(0, chargeAt - nowSeconds);
  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.max(1, Math.ceil((remainingSeconds % 3_600) / 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function hasTrialAccess(subscription: BillingSubscription, nowSeconds = Math.floor(Date.now() / 1000)) {
  return subscription.plan_key === 'monthly'
    && subscription.trial_days === 7
    && Boolean(subscription.trial_claimed_at)
    && subscription.current_start === null
    && subscription.current_end === null
    && ['authenticated', 'cancelled'].includes(subscription.status)
    && subscription.charge_at !== null
    && subscription.charge_at > nowSeconds;
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'T'
  );
}

export function ProfilePage() {
  const { user, updateProfile, error, clearError } = useAuthStore();
  const { trades, loaded, load } = useTradesStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [traderLevel, setTraderLevel] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('beginner');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [billingSubscription, setBillingSubscription] = useState<BillingSubscription | null>(null);
  const [legacyAccess, setLegacyAccess] = useState(false);
  const [billingCheckedAt, setBillingCheckedAt] = useState<number | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingBusy, setBillingBusy] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingNotice, setBillingNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canViewTradingSnapshot = legacyAccess || (billingSubscription
    ? subscriptionEntitled(
      billingSubscription.plan_key,
      billingSubscription.status,
      billingSubscription.charge_at,
      billingSubscription.current_end,
      billingSubscription.cancel_at_cycle_end,
      billingCheckedAt ?? 0,
      billingSubscription.trial_days,
      Boolean(billingSubscription.trial_claimed_at),
      billingSubscription.current_start,
    )
    : false);

  const loadBilling = useCallback(async () => {
    if (!user || !supabase) {
      setBillingSubscription(null);
      setLegacyAccess(false);
      setBillingCheckedAt(Math.floor(Date.now() / 1000));
      setBillingLoading(false);
      return;
    }
    setBillingLoading(true);
    setBillingSubscription(null);
    setLegacyAccess(false);
    setBillingError('');
    const [{ data, error: loadError }, entitlementResult] = await Promise.all([
      supabase
      .from('billing_subscriptions')
      .select('id, payment_provider, razorpay_subscription_id, dodo_subscription_id, dodo_checkout_url, plan_key, currency, status, current_start, current_end, charge_at, cancel_at_cycle_end, trial_days, trial_claimed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
      supabase.rpc('current_user_has_billing_entitlement'),
    ]);
    if (loadError || entitlementResult.error) {
      setBillingSubscription(null);
      setLegacyAccess(false);
      setBillingError('Could not load billing details right now.');
    } else {
      const subscriptions = (data || []) as BillingSubscription[];
      const nowSeconds = Math.floor(Date.now() / 1000);
      const entitledSubscription = subscriptions.find((subscription) => subscriptionEntitled(
        subscription.plan_key,
        subscription.status,
        subscription.charge_at,
        subscription.current_end,
        subscription.cancel_at_cycle_end,
        nowSeconds,
        subscription.trial_days,
        Boolean(subscription.trial_claimed_at),
        subscription.current_start,
      ));
      setBillingSubscription(entitledSubscription || subscriptions[0] || null);
      setLegacyAccess(entitlementResult.data === true && !entitledSubscription);
      setBillingError('');
    }
    setBillingCheckedAt(Math.floor(Date.now() / 1000));
    setBillingLoading(false);
  }, [user]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    const updateBillingClock = () => setBillingCheckedAt(Math.floor(Date.now() / 1000));
    const interval = window.setInterval(updateBillingClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cancelConfirmOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !billingBusy) setCancelConfirmOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelConfirmOpen, billingBusy]);

  async function cancelBillingSubscription() {
    if (!billingSubscription || !supabase || billingBusy) return;
    const canCancelAtCycleEnd = billingSubscription.status === 'active'
      && billingSubscription.current_end !== null
      && billingSubscription.current_end > Math.floor(Date.now() / 1000);

    setBillingBusy(true);
    setBillingError('');
    setBillingNotice('');
    const { error: cancelError } = billingSubscription.payment_provider === 'dodo'
      ? await supabase.functions.invoke('cancel-dodo-subscription', { body: { billingSubscriptionId: billingSubscription.id } })
      : await supabase.functions.invoke('cancel-razorpay-subscription', { body: { subscriptionId: billingSubscription.razorpay_subscription_id } });
    if (cancelError) {
      setBillingError(cancelError.message || 'Could not schedule cancellation. Please try again.');
    } else {
      setBillingNotice(['created', 'paused'].includes(billingSubscription.status)
        ? 'The subscription was canceled. You can choose a new plan.'
        : canCancelAtCycleEnd
          ? 'Cancellation is scheduled. Your plan remains available through the current period.'
          : hasTrialAccess(billingSubscription)
            ? `Renewal is cancelled. Your trial access continues until ${billingDate(billingSubscription.charge_at) || 'the end of the original trial'}; no further charge is scheduled.`
            : 'The subscription was canceled before its first billing period. No future subscription charge is scheduled.');
      setCancelConfirmOpen(false);
      await loadBilling();
    }
    setBillingBusy(false);
  }

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setTraderLevel(user.traderLevel ?? 'beginner');
      setPreview(user.avatar);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const stats = useMemo(() => {
    if (!loaded || trades.length === 0) {
      return { count: 0, totalR: 0, winRate: null as number | null };
    }

    const result = summary(trades);

    return {
      count: result.count,
      totalR: result.totalR,
      winRate: result.winRate,
    };
  }, [loaded, trades]);

  if (!user) return null;

  const currentUser = user;
  const displayName = currentUser.name || 'Trader';
  const traderLevelLabel =
    currentUser.traderLevel === 'advanced'
      ? 'Advanced Trader'
      : currentUser.traderLevel === 'intermediate'
        ? 'Intermediate Trader'
        : 'Beginner Trader';

  function openEditor() {
    clearError();
    setName(currentUser.name || '');
    setTraderLevel(currentUser.traderLevel ?? 'beginner');
    setAvatarFile(null);
    setPreview(currentUser.avatar);
    setEditing(true);
  }

  function closeEditor() {
    if (saving) return;
    clearError();
    setEditing(false);
    setAvatarFile(null);
    setName(currentUser.name || '');
    setTraderLevel(currentUser.traderLevel ?? 'beginner');
    setPreview(currentUser.avatar);
  }

  function handleAvatarChange(file?: File) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!name.trim()) return;

    setSaving(true);

    try {
      await updateProfile(name, avatarFile, traderLevel);
      setEditing(false);
      setAvatarFile(null);
    } catch {
      // Store exposes the error for the UI.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Profile"
        description="Your ThePrecisionLab account and plan details."
      />

      <Card className="overflow-hidden">
        <CardBody className="p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl object-cover border border-line shadow-sm"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-accent/15 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold">
                  {getInitials(displayName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
                  {displayName}
                </h2>

                <span className="inline-flex items-center gap-1 rounded-full bg-win/10 px-2 py-1 text-2xs font-semibold text-win">
                  <ShieldCheck className="h-3 w-3" />
                  Verified account
                </span>
              </div>

              <p className="mt-1 text-sm text-fg-muted break-all">{currentUser.email}</p>
              <p className="mt-2 text-xs text-fg-dim">{traderLevelLabel}</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={openEditor}
              leftIcon={<UserRound className="h-3.5 w-3.5" />}
            >
              Edit Profile
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-accent" />
              Account details
            </CardTitle>
          </CardHeader>

          <CardBody className="space-y-1">
            <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Email</span>
              </div>
              <span className="text-sm font-medium text-fg text-right break-all">
                {currentUser.email}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Account type</span>
              </div>
              <span className="text-sm font-medium text-fg">{traderLevelLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Current plan</span>
              </div>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                {billingLoading ? 'Loading…' : billingError ? 'Unavailable' : legacyAccess ? 'Legacy access' : billingSubscription ? `${billingSubscription.plan_key === 'monthly' ? 'Monthly' : 'Quarterly'} plan` : 'Free Plan'}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Trading snapshot
            </CardTitle>
          </CardHeader>

          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-bg-3/50 p-3">
                <p className="text-2xs uppercase tracking-wider font-semibold text-fg-dim">
                  Trades
                </p>
                <p className="mt-1 text-lg font-bold text-fg tabular-nums">
                  {billingLoading ? '—' : canViewTradingSnapshot ? stats.count : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bg-3/50 p-3">
                <p className="text-2xs uppercase tracking-wider font-semibold text-fg-dim">
                  Total R
                </p>
                <p
                  className={cn(
                    'mt-1 text-lg font-bold tabular-nums',
                    canViewTradingSnapshot && stats.totalR > 0
                      ? 'text-win'
                      : canViewTradingSnapshot && stats.totalR < 0
                        ? 'text-loss'
                        : 'text-fg',
                  )}
                >
                  {billingLoading || !canViewTradingSnapshot ? '—' : formatR(stats.totalR)}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bg-3/50 p-3">
                <p className="text-2xs uppercase tracking-wider font-semibold text-fg-dim">
                  Win rate
                </p>
                <p className="mt-1 text-lg font-bold text-fg tabular-nums">
                  {billingLoading || !canViewTradingSnapshot || stats.winRate == null ? '—' : formatPct(stats.winRate)}
                </p>
              </div>
            </div>
            {!billingLoading && !canViewTradingSnapshot && (
              <p className="mt-3 text-xs text-fg-muted">Your trading snapshot is available while your subscription is active.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-fg">Billing & subscription</h3>
              </div>
              {billingLoading ? (
                <p className="mt-2 text-xs text-fg-muted">Loading your subscription…</p>
              ) : legacyAccess ? (
                <p className="mt-2 text-xs text-fg-muted">Your account existed before subscriptions launched. Your existing workspace access is grandfathered.</p>
              ) : billingSubscription ? (
                <div className="mt-2 space-y-1 text-xs text-fg-muted">
                  <p><span className="font-semibold text-fg">{billingSubscription.plan_key === 'monthly' ? (billingSubscription.currency === 'INR' ? '₹400 monthly' : '$4.50 monthly') : (billingSubscription.currency === 'INR' ? '₹1,000 quarterly' : '$10 quarterly')}</span> · {billingStatusLabel(billingSubscription.status)}</p>
                  {billingSubscription.cancel_at_cycle_end ? (
                    <p>Your plan ends {billingDate(billingSubscription.current_end) || 'at the end of this billing period'}.</p>
                  ) : billingSubscription.status === 'cancelled' && hasTrialAccess(billingSubscription, billingCheckedAt ?? 0) ? (
                    <>
                      <p role="timer" aria-live="polite" className="font-semibold text-accent">Trial access: {trialTimeRemaining(billingSubscription.charge_at!, billingCheckedAt ?? 0)}</p>
                      <p>Access ends {billingDate(billingSubscription.charge_at)}. Renewal is cancelled, so no further charge is scheduled.</p>
                    </>
                  ) : ['cancelled', 'completed', 'expired'].includes(billingSubscription.status) ? (
                    <p>No further billing is scheduled.</p>
                  ) : billingSubscription.status === 'authenticated' && hasTrialAccess(billingSubscription, billingCheckedAt ?? 0) ? (
                    <>
                      <p role="timer" aria-live="polite" className="font-semibold text-accent">7-day trial: {trialTimeRemaining(billingSubscription.charge_at!, billingCheckedAt ?? 0)}</p>
                      <p>Trial ends {billingDate(billingSubscription.charge_at)}. The first ₹400 charge is scheduled then.</p>
                    </>
                  ) : billingSubscription.charge_at ? (
                    <p>Next billing date: {billingDate(billingSubscription.charge_at)}.</p>
                  ) : billingSubscription.status === 'authenticated' ? (
                    <p>{billingSubscription.payment_provider === 'dodo' ? 'Dodo Payments has authorized this subscription.' : 'Razorpay has authorized this subscription.'} Access is pending payment confirmation.</p>
                  ) : null}
                </div>
              ) : billingError ? (
                <p className="mt-2 text-xs text-fg-muted">Your current plan could not be verified. Try refreshing the billing details.</p>
              ) : (
                <p className="mt-2 text-xs text-fg-muted">You are currently using the free plan. Choose a subscription to continue.</p>
              )}
              {billingError && <p role="alert" className="mt-2 text-xs text-loss">{billingError}</p>}
              {billingNotice && <p role="status" className="mt-2 text-xs text-win">{billingNotice}</p>}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {billingSubscription?.status === 'created' ? (
                billingSubscription.payment_provider === 'dodo' && billingSubscription.dodo_checkout_url ? (
                  <Button asChild variant="secondary" size="sm"><a href={billingSubscription.dodo_checkout_url} target="_blank" rel="noreferrer">Complete checkout</a></Button>
                ) : billingSubscription.payment_provider === 'razorpay' ? (
                  <Button asChild variant="secondary" size="sm"><Link to={`/checkout?plan=${billingSubscription.plan_key}`}>Complete checkout</Link></Button>
                ) : null
              ) : billingSubscription ? (
                <>
                  {!billingSubscription.cancel_at_cycle_end && ['active', 'authenticated', 'paused'].includes(billingSubscription.status) && (
                    <Button variant="secondary" size="sm" onClick={() => setCancelConfirmOpen(true)} disabled={billingBusy}>
                      {billingBusy ? 'Working…' : billingSubscription.status === 'paused' ? 'Cancel paused plan' : 'Cancel plan'}
                    </Button>
                  )}
                  {['halted', 'cancelled', 'completed', 'expired'].includes(billingSubscription.status)
                    && !hasTrialAccess(billingSubscription, billingCheckedAt ?? 0) && (
                    <Button asChild variant="secondary" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                      <Link to="/#pricing">Choose a plan</Link>
                    </Button>
                  )}
                </>
              ) : (
                <Button asChild variant="secondary" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                  <Link to="/#pricing">View plans</Link>
                </Button>
              )}
              {billingSubscription?.status === 'created' && billingSubscription.payment_provider === 'razorpay' && (
                <Button variant="ghost" size="sm" onClick={() => setCancelConfirmOpen(true)} disabled={billingBusy}>
                  {billingBusy ? 'Working…' : 'Cancel checkout'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => void loadBilling()} disabled={billingLoading}>
                Refresh
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {cancelConfirmOpen && billingSubscription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !billingBusy) setCancelConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-bg-1 shadow-2xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-subscription-title"
            aria-describedby="cancel-subscription-description"
          >
            <div className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-loss/10 text-loss">
                <X className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="cancel-subscription-title" className="text-base font-bold text-fg">
                  {billingSubscription.status === 'created' ? 'Cancel checkout?' : 'Cancel subscription?'}
                </h3>
                <p id="cancel-subscription-description" className="mt-1 text-sm leading-6 text-fg-muted">
                  {billingSubscription.status === 'created'
                    ? 'This unfinished checkout will be cancelled. No subscription payment has been completed.'
                    : billingSubscription.status === 'paused'
                      ? 'This paused subscription will be cancelled now. It is not currently granting access.'
                      : billingSubscription.status === 'active' && billingSubscription.current_end !== null && billingSubscription.current_end > Math.floor(Date.now() / 1000)
                        ? `Your subscription will remain available until ${billingDate(billingSubscription.current_end) || 'the end of this billing period'}, then it will be cancelled.`
                        : 'This subscription has not started a billing period yet. Cancelling now will end the trial or authorization and prevent the scheduled first charge.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={billingBusy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-bg-4 hover:text-fg disabled:opacity-50"
                aria-label="Close cancellation dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {billingError && (
              <p role="alert" className="mx-5 mt-4 rounded-lg bg-loss/10 px-3 py-2 text-xs text-loss">
                {billingError}
              </p>
            )}

            <div className="flex justify-end gap-2 p-5">
              <Button autoFocus variant="ghost" size="sm" onClick={() => setCancelConfirmOpen(false)} disabled={billingBusy}>
                Keep subscription
              </Button>
              <Button variant="danger" size="sm" onClick={() => void cancelBillingSubscription()} disabled={billingBusy}>
                {billingBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {billingBusy ? 'Cancelling…' : 'Confirm cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeEditor();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-bg-1 shadow-2xl animate-fade-in"
            role="dialog"
            aria-modal="true"

            aria-labelledby="edit-profile-title"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 id="edit-profile-title" className="text-base font-bold text-fg">
                  Edit Profile
                </h3>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Update your name and profile picture.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-bg-4 hover:text-fg disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Profile preview"
                      className="h-24 w-24 rounded-2xl border border-line object-cover shadow-sm"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl border border-accent/20 bg-accent/15 text-accent flex items-center justify-center text-2xl font-bold">
                      {getInitials(name)}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg-1 text-fg shadow-md hover:bg-bg-3 transition-colors"
                    title="Change avatar"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                />

                <p className="mt-3 text-xs text-fg-dim">
                  JPG, PNG or WebP. The image will be compressed automatically.
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-1.5 block text-xs font-semibold text-fg"
                >
                  Display name
                </label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={50}
                  autoComplete="name"
                  className="w-full rounded-lg border border-line bg-bg-2 px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-dim focus:border-accent focus:ring-2 focus:ring-accent/10"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label
                  htmlFor="trader-level"
                  className="mb-1.5 block text-xs font-semibold text-fg"
                >
                  Trading experience
                </label>
                <select
                  id="trader-level"
                  value={traderLevel}
                  onChange={(event) =>
                    setTraderLevel(
                      event.target.value as
                        | 'beginner'
                        | 'intermediate'
                        | 'advanced'
                    )
                  }
                  className="w-full rounded-lg border border-line bg-bg-2 px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                >
                  <option value="beginner">Beginner Trader</option>
                  <option value="intermediate">Intermediate Trader</option>
                  <option value="advanced">Advanced Trader</option>
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-loss/20 bg-loss/10 px-3 py-2.5 text-xs text-loss">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  leftIcon={
                    saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
