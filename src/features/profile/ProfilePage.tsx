import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { needsFirstRunOnboarding } from '@/data/onboardingRepository';
import {
  Mail,
  ShieldCheck,
  UserRound,
  CreditCard,
  BarChart3,
  ArrowLeft,
  Camera,
  X,
  Check,
  Loader2,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary } from '@/analytics/core';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { subscriptionEntitled } from '@/lib/billingEntitlement';
import { cacheBillingEntitlement, invalidateBillingEntitlement } from '@/lib/billingEntitlementCache';

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
  const navigate = useNavigate();
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
      invalidateBillingEntitlement(user?.id);
      setBillingSubscription(null);
      setLegacyAccess(false);
      setBillingCheckedAt(Math.floor(Date.now() / 1000));
      setBillingLoading(false);
      return;
    }
    setBillingLoading(true);
    setBillingSubscription(null);
    setLegacyAccess(false);
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
      invalidateBillingEntitlement(user.id);
      setBillingSubscription(null);
      setLegacyAccess(false);
    } else {
      cacheBillingEntitlement(user.id, entitlementResult.data === true);
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

      if (window.location.search.includes('checkout=dodo') && entitlementResult.data === true) {
        void needsFirstRunOnboarding().then((firstRun) => {
          if (firstRun) navigate('/onboarding', { replace: true });
        });
      }
    }
    setBillingCheckedAt(Math.floor(Date.now() / 1000));
    setBillingLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    const updateBillingClock = () => setBillingCheckedAt(Math.floor(Date.now() / 1000));
    const interval = window.setInterval(updateBillingClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

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
        description="Your personal account details and trading snapshot."
        actions={<div className="flex flex-wrap gap-2"><Button asChild variant="secondary" leftIcon={<CreditCard className="h-4 w-4" />}><Link to="/manage-subscription">Manage subscription</Link></Button><Button asChild variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}><Link to="/settings">Back to settings</Link></Button></div>}
      />

      <div className="bg-bg-1 border border-line rounded-xl p-5 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={displayName}
                className="h-16 w-16 rounded-xl object-cover border border-line shadow-sm"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-bg-2 border border-line text-fg flex items-center justify-center text-lg font-bold shadow-sm">
                {getInitials(displayName)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-fg tracking-tight">
                {displayName}
              </h2>

              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-2xs font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Verified Pro
              </span>
            </div>

            <p className="mt-1 text-xs text-fg-muted break-all">{currentUser.email}</p>
            <p className="mt-1.5 text-xs font-medium text-fg-dim">{traderLevelLabel}</p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={openEditor}
            leftIcon={<UserRound className="h-3.5 w-3.5" />}
          >
            Edit profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-1 border border-line rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-fg-dim" />
            <h3 className="text-sm font-semibold text-fg tracking-tight">Account details</h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 py-2.5 border-b border-line">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-xs text-fg-muted">Email</span>
              </div>
              <span className="text-xs font-medium text-fg text-right break-all">
                {currentUser.email}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-2.5 border-b border-line">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-xs text-fg-muted">Account type</span>
              </div>
              <span className="text-xs font-medium text-fg">{traderLevelLabel}</span>
            </div>
          </div>
        </div>

        <div className="bg-bg-1 border border-line rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-fg-dim" />
            <h3 className="text-sm font-semibold text-fg tracking-tight">Trading snapshot</h3>
          </div>

          <div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-line bg-bg-2 p-3">
                <p className="text-xs font-medium text-fg-dim">
                  Trades
                </p>
                <p className="mt-1 text-base font-bold text-fg tabular-nums">
                  {billingLoading ? '—' : canViewTradingSnapshot ? stats.count : '—'}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-bg-2 p-3">
                <p className="text-xs font-medium text-fg-dim">
                  Total R
                </p>
                <p
                  className={cn(
                    'mt-1 text-base font-bold tabular-nums',
                    canViewTradingSnapshot && stats.totalR > 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : canViewTradingSnapshot && stats.totalR < 0
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-fg',
                  )}
                >
                  {billingLoading || !canViewTradingSnapshot ? '—' : formatR(stats.totalR)}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-bg-2 p-3">
                <p className="text-xs font-medium text-fg-dim">
                  Win rate
                </p>
                <p className="mt-1 text-base font-bold text-fg tabular-nums">
                  {billingLoading || !canViewTradingSnapshot || stats.winRate == null ? '—' : formatPct(stats.winRate)}
                </p>
              </div>
            </div>
            {!billingLoading && !canViewTradingSnapshot && (
              <p className="mt-2.5 text-xs text-fg-muted">Your trading snapshot is available while your subscription is active.</p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeEditor();
          }}
        >
          <div
            className="w-full max-w-4xl rounded-xl border border-line bg-bg-1 shadow-2xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="flex items-center justify-between border-b border-line bg-bg-1/95 px-5 py-4 sm:px-6">
              <div>
                <h3 id="edit-profile-title" className="text-base font-semibold text-fg">
                  Edit profile
                </h3>
                <p className="mt-0.5 text-xs text-fg-muted">
                  A couple of details to make your workspace yours.
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

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-12 lg:gap-6">
              <section aria-labelledby="profile-form-heading" className="lg:col-span-7">
                <div className="mb-4">
                  <h4 id="profile-form-heading" className="text-lg font-bold tracking-tight text-fg">
                    Set up your profile
                  </h4>
                  <p className="mt-0.5 text-xs text-fg-muted">Two quick details. You can change them anytime.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="profile-name" className="mb-1.5 block text-xs font-medium text-fg-dim">
                      Your name
                    </label>
                    <input
                      id="profile-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={50}
                      autoComplete="name"
                      className="h-9 w-full rounded-lg border border-line bg-bg-2 px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-dim focus-visible:border-focus focus-visible:ring-1 focus-visible:ring-focus/20"
                      placeholder="What should we call you?"
                    />
                  </div>

                  <fieldset>
                    <legend className="text-xs font-medium text-fg-dim">Trading experience</legend>
                    <p className="mb-2 mt-0.5 text-xs text-fg-muted">Pick what feels closest. You can update this later.</p>
                    <div className="space-y-2">
                      {([
                        ['beginner', 'Beginner', "I'm learning the basics and building good habits."],
                        ['intermediate', 'Intermediate', "I have a routine and I'm working on consistency."],
                        ['advanced', 'Advanced', "I'm refining a well-established approach."],
                      ] as const).map(([value, label, description]) => (
                        <label
                          key={value}
                          className={cn(
                            'group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-focus/40',
                            traderLevel === value
                              ? 'border-line-strong bg-bg-3'
                              : 'border-line bg-bg-2 hover:border-line-strong hover:bg-bg-3/70',
                          )}
                        >
                          <input
                            className="h-4 w-4 shrink-0 accent-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
                            type="radio"
                            name="trader-level"
                            value={value}
                            checked={traderLevel === value}
                            onChange={() => setTraderLevel(value)}
                          />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-fg">{label}</span>
                            <span className="block text-2xs text-fg-muted leading-tight">{description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </section>

              <aside aria-label="Live profile preview" className="flex flex-col justify-center lg:col-span-5">
                <div className="rounded-xl border border-line bg-bg-2 p-4">
                  <div className="mb-3.5 flex items-center justify-between border-b border-line pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-fg-muted" aria-hidden="true" />
                      <span className="text-xs font-medium text-fg-muted">Your profile preview</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-3 px-2 py-0.5 text-2xs font-medium text-fg-muted">
                      <Eye className="h-3 w-3" /> Live
                    </span>
                  </div>

                  <div className="rounded-lg border border-line bg-bg-1 p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {preview ? (
                          <img src={preview} alt="Profile preview" className="h-12 w-12 rounded-full border border-line object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-bg-3 text-base font-bold text-fg">
                            {getInitials(name)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-bg-1 bg-fg text-bg-1 shadow-sm transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
                          aria-label="Upload profile picture"
                          title="Change profile photo"
                        >
                          <Camera className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className={cn('truncate text-xs font-semibold', name.trim() ? 'text-fg' : 'text-fg-dim')}>
                            {name.trim() || 'Your name'}
                          </span>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Verified account" />
                        </div>
                        <p className="truncate text-xs text-fg-muted">{currentUser.email}</p>
                        <p className="mt-0.5 text-2xs text-fg-dim">ThePrecisionLab trader</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-3 px-2 py-0.5 text-2xs font-medium text-fg-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-fg-muted" aria-hidden="true" />
                        {traderLevel.charAt(0).toUpperCase() + traderLevel.slice(1)}
                      </span>
                      <span className="text-2xs text-fg-dim">Experience level</span>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                  />
                  <p className="mt-2 text-center text-2xs text-fg-dim">Profile photo is optional. JPG, PNG or WebP.</p>
                </div>
              </aside>

              {error && (
                <div className="lg:col-span-12 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss" role="alert">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end lg:col-span-12">
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
