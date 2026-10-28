import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, LoaderCircle, Lock, LogOut, TrendingUp, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/layout/Brand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { consumeBillingPlanIntent, isBillingPlan, type BillingPlan, checkBillingEntitlement } from '@/lib/billing';
import { cacheBillingEntitlement } from '@/lib/billingEntitlementCache';
import { needsFirstRunOnboarding } from '@/data/onboardingRepository';
import { formatBillingPrice, useBillingRegion } from '@/lib/billingRegion';

type CreateSubscriptionResponse = {
  keyId: string;
  subscriptionId: string;
  currency: 'INR' | 'USD';
  amount: number;
  trialDays: number;
};

type CreateDodoResponse = { checkoutUrl: string; amount: number; currency: 'USD'; trialDays: number };

type VerifySubscriptionResponse = { verified: boolean; status: string; entitled: boolean };

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: 'payment.failed', callback: (event: { error?: { description?: string } }) => void) => void;
    };
  }
}

/** A checkout session that has been created but not yet opened (held while the user decides about the trial). */
type PendingSession = { kind: 'dodo'; data: CreateDodoResponse } | { kind: 'razorpay'; data: CreateSubscriptionResponse };

const TRIAL_DAYS = 7;

/** Plan prices in major currency units — used only for the per-month figure and the "Save %" badge. */
const PLAN_UNITS: Record<'INR' | 'USD', Record<BillingPlan, number>> = {
  INR: { monthly: 400, quarterly: 1_000 },
  USD: { monthly: 4.5, quarterly: 10 },
};

function formatUnits(currency: 'INR' | 'USD', value: number) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(value);
}

function getPlanDetails(currency: 'INR' | 'USD'): Record<BillingPlan, { name: string; amount: string; cycle: string; note: string; badge: string; renewal: string }> {
  const monthly = formatBillingPrice(currency, 'monthly');
  const quarterly = formatBillingPrice(currency, 'quarterly');
  const units = PLAN_UNITS[currency];
  const savePct = Math.round((1 - units.quarterly / (units.monthly * 3)) * 100);
  return {
    monthly: {
      name: 'Monthly',
      amount: monthly,
      cycle: '/ month',
      note: 'Cancel anytime',
      badge: `${TRIAL_DAYS} days free`,
      renewal: `${monthly}, then monthly`,
    },
    quarterly: {
      name: 'Quarterly',
      amount: quarterly,
      cycle: '/ 3 months',
      note: `${formatUnits(currency, units.quarterly / 3)} / month, billed every 3 months`,
      badge: savePct > 0 ? `Save ${savePct}%` : '',
      renewal: `${quarterly}, then every 3 months`,
    },
  };
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getCheckoutAccentHex() {
  const channels = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim()
    .split(/[\s/]+/)
    .slice(0, 3)
    .map((channel) => Number(channel));
  return channels.length === 3 && channels.every(Number.isFinite)
    ? `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
    : '#1A1A1C';
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const billingRegion = useBillingRegion();
  const requestedPlan = searchParams.get('plan');
  const plan: BillingPlan = isBillingPlan(requestedPlan) ? requestedPlan : 'monthly';
  const allDetails = useMemo(() => getPlanDetails(billingRegion.currency), [billingRegion.currency]);
  const details = allDetails[plan];
  const billingAvailable = billingRegion.ready && (billingRegion.currency === 'INR' || billingRegion.usdEnabled);
  const paymentProvider = billingRegion.currency === 'USD' ? 'Dodo Payments' : 'Razorpay';
  const zeroAmount = billingRegion.currency === 'USD' ? '$0' : '₹0';
  const trialEndDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + TRIAL_DAYS);
    return formatShortDate(date);
  }, []);

  const [loading, setLoading] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [error, setError] = useState('');
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);

  useEffect(() => {
    consumeBillingPlanIntent();
  }, [plan]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void checkBillingEntitlement(user.id).then(async (entitled) => {
      if (active && entitled) {
        const firstRun = await needsFirstRunOnboarding().catch(() => false);
        if (active) navigate(firstRun ? '/onboarding' : '/dashboard', { replace: true });
      }
    });
    return () => { active = false; };
  }, [user?.id, navigate]);

  // Close the "trial not available" dialog with Escape.
  useEffect(() => {
    if (!pendingSession) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingSession(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingSession]);

  async function changeAccount() {
    setSwitchingAccount(true);
    setError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (signOutError) {
      setError((signOutError as Error).message || 'Could not switch accounts. Please try again.');
      setSwitchingAccount(false);
    }
  }

  async function openRazorpay(client: NonNullable<typeof supabase>, data: CreateSubscriptionResponse) {
    const checkout = new window.Razorpay!({
      key: data.keyId,
      subscription_id: data.subscriptionId,
      name: 'ThePrecisionLab',
      description: `${details.name} plan — ${details.amount} ${details.cycle}`,
      image: `${window.location.origin}/logo.png`,
      prefill: { name: user?.name || '', email: user?.email || '' },
      theme: { color: getCheckoutAccentHex() },
      modal: { ondismiss: () => setLoading(false) },
      handler: async (response) => {
        const { data: verified, error: verifyError } = await client.functions.invoke<VerifySubscriptionResponse>('verify-razorpay-subscription', {
          body: response,
        });
        if (verifyError || !verified?.verified) {
          setError('Razorpay authorized the subscription, but we could not verify it yet. Your subscription will update after confirmation.');
          setLoading(false);
        } else {
          if (user?.id) cacheBillingEntitlement(user.id, true);
          const firstRun = await needsFirstRunOnboarding().catch(() => false);
          navigate(firstRun ? '/onboarding' : '/dashboard', { replace: true });
        }
      },
    });
    checkout.on('payment.failed', (event) => {
      setError(event.error?.description || 'The payment could not be completed. Please try another payment method.');
      setLoading(false);
    });
    checkout.open();
  }

  /** Opens an already-created session with the payment provider. */
  async function openSession(client: NonNullable<typeof supabase>, session: PendingSession) {
    if (session.kind === 'dodo') {
      window.location.assign(session.data.checkoutUrl);
      return;
    }
    await openRazorpay(client, session.data);
  }

  /**
   * Creates the checkout session. The backend decides trial eligibility (trialDays > 0 = eligible).
   * If the user is not eligible and has not yet agreed to a direct purchase, the session is held
   * and the "trial not available" dialog is shown instead of opening the provider.
   */
  async function startCheckout() {
    const client = supabase;
    if (!client) {
      setError('Payments are not configured yet. Please try again later.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let session: PendingSession;

      if (billingRegion.currency === 'USD') {
        const { data, error: createError } = await client.functions.invoke<CreateDodoResponse>('create-dodo-checkout', {
          body: { plan, regionToken: billingRegion.regionToken },
        });
        if (createError) throw new Error(createError.message || 'Could not start international checkout.');
        const expectedAmount = plan === 'monthly' ? 450 : 1_000;
        if (typeof data?.checkoutUrl !== 'string' || data.currency !== 'USD' || data.amount !== expectedAmount
          || !Number.isInteger(data.trialDays) || data.trialDays < 0 || data.trialDays > TRIAL_DAYS) {
          throw new Error('Dodo Payments returned an incomplete checkout session. Refresh the page and try again.');
        }
        session = { kind: 'dodo', data };
      } else {
        const loaded = await loadRazorpayCheckout();
        if (!loaded || !window.Razorpay) {
          throw new Error('Razorpay Checkout could not be loaded. Check your connection and try again.');
        }

        const { data, error: createError } = await client.functions.invoke<CreateSubscriptionResponse>('create-razorpay-subscription', {
          body: { plan, regionToken: billingRegion.regionToken },
        });
        if (createError) throw new Error(createError.message || 'Could not start the subscription.');
        if (!data?.keyId || !data.subscriptionId) throw new Error('The payment service returned an incomplete checkout session.');
        const expectedAmount = plan === 'monthly' ? 40_000 : 100_000;
        if (data.currency !== billingRegion.currency || data.amount !== expectedAmount) {
          throw new Error('The checkout price changed. Refresh the page and try again.');
        }
        if (!Number.isInteger(data.trialDays) || data.trialDays < 0 || data.trialDays > TRIAL_DAYS) {
          throw new Error('The payment service returned invalid trial details.');
        }
        session = { kind: 'razorpay', data };
      }

      if (session.data.trialDays === 0) {
        setPendingSession(session);
        setLoading(false);
        return;
      }

      await openSession(client, session);
    } catch (checkoutError) {
      setError((checkoutError as Error).message || 'Could not open checkout. Please try again.');
      setLoading(false);
    }
  }

  async function continueWithoutTrial() {
    const client = supabase;
    const session = pendingSession;
    setPendingSession(null);
    if (!client || !session) return;
    setLoading(true);
    setError('');
    try {
      await openSession(client, session);
    } catch (checkoutError) {
      setError((checkoutError as Error).message || 'Could not open checkout. Please try again.');
      setLoading(false);
    }
  }

  const accentGlow = 'border-[rgb(var(--accent)/0.7)] bg-bg-2 shadow-[0_0_0_1px_rgb(var(--accent)/0.35),0_0_28px_rgb(var(--accent)/0.14)]';

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-bg-0 px-4 py-5 text-fg sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" aria-label="Back to ThePrecisionLab" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-bg-2 text-fg-muted transition hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo size="sm" />
            <span className="truncate text-sm font-semibold tracking-tight">ThePrecisionLab</span>
          </div>
        </div>
        {billingRegion.ready && billingRegion.paymentMode === 'test_mode' && (
          <span role="status" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-bg-2 px-3 py-1.5 text-xs font-medium text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />Test mode
          </span>
        )}
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-[1100px] items-center justify-center py-5">
        <div className="grid w-full min-w-0 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-16">
          <section aria-labelledby="checkout-title" className="min-w-0">
            <h1 id="checkout-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Choose your plan</h1>
            <p className="mt-2 text-sm text-fg-muted">Journal, discipline tracking and analytics — all included.</p>

            {billingAvailable ? (
              <div aria-label="Subscription plans" role="radiogroup" className="mt-7 grid gap-3">
                {(Object.keys(allDetails) as BillingPlan[]).map((option) => {
                  const selected = option === plan;
                  const optionDetails = allDetails[option];
                  return (
                    <Link
                      key={option}
                      to={`/checkout?plan=${option}`}
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${optionDetails.name}, ${optionDetails.amount} ${optionDetails.cycle}${selected ? ', selected' : ''}`}
                      className={`group flex items-center justify-between gap-4 rounded-2xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none ${selected ? accentGlow : 'border-line bg-bg-2 hover:border-line-strong hover:bg-bg-3'}`}
                    >
                      <span className="flex min-w-0 items-center gap-3.5">
                        <span aria-hidden="true" className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-[rgb(var(--accent))]' : 'border-line-strong'}`}>
                          {selected && <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />}
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                            {optionDetails.name}
                            {option === 'monthly' && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />{optionDetails.badge}
                              </span>
                            )}
                            {option === 'quarterly' && optionDetails.badge && (
                              <span className="rounded-full border border-line bg-bg-3 px-2 py-0.5 text-[11px] font-medium text-fg-muted">{optionDetails.badge}</span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs text-fg-muted">{optionDetails.note}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xl font-semibold tracking-tight">{optionDetails.amount}</span>
                        <span className="mt-0.5 block text-xs text-fg-muted">{optionDetails.cycle}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-7 rounded-2xl border border-line bg-bg-2 p-4 text-sm leading-6 text-fg-muted">
                {!billingRegion.ready ? 'Checking regional pricing…' : billingRegion.currency === 'USD' ? 'International recurring billing is not available yet.' : 'No billing plan is currently available for this region.'}
              </p>
            )}

            <ul className="mt-5 flex flex-wrap gap-2.5 text-xs text-fg-muted">
              {[
                { label: 'Unlimited journal', Icon: BookOpen },
                { label: 'Discipline score', Icon: TrendingUp },
                { label: 'Weekly reviews', Icon: CalendarDays },
              ].map(({ label, Icon }) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2 px-3.5 py-2">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{label}
                </li>
              ))}
            </ul>
          </section>

          <aside aria-labelledby="order-summary-title" className="min-w-0 rounded-2xl border border-line bg-bg-2 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="order-summary-title" className="text-sm font-semibold">{details.name} plan</h2>
              <span className="font-mono text-xs text-fg-muted">{billingAvailable ? `${details.amount} ${details.cycle}` : '—'}</span>
            </div>

            <ol className="mt-5 grid gap-3.5 border-b border-line pb-5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3 font-semibold">
                  <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-fg"><span className="h-1 w-1 rounded-full bg-fg" /></span>
                  Today
                </span>
                <span className="font-semibold">Free trial starts</span>
              </li>
              <li className="flex items-center justify-between gap-3 text-fg-muted">
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border-2 border-line-strong" />
                  {trialEndDate}
                </span>
                <span className="text-right">{details.renewal}</span>
              </li>
            </ol>

            <div className="flex items-center justify-between gap-3 py-5">
              <span className="text-sm text-fg-muted">Due today</span>
              <strong className="text-2xl font-semibold tracking-tight">{billingRegion.ready && billingAvailable ? zeroAmount : '—'}</strong>
            </div>

            {error && <div role="alert" className="mb-4 rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm text-loss-text">{error}</div>}

            <Button onClick={() => void startCheckout()} disabled={loading || !billingRegion.ready || !billingAvailable} variant="primary" size="lg" className="w-full">
              {loading ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />Connecting…</> : `Start ${TRIAL_DAYS}-day free trial`}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-fg-dim">One trial per account. Cancel before {trialEndDate} to pay nothing.</p>

            <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
              <p className="flex items-center gap-2 text-xs text-fg-dim"><Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Secured by {paymentProvider}</p>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-line bg-bg-1 px-3 py-1.5">
                <span className="min-w-0 truncate font-mono text-xs text-fg-muted">{user?.email || 'your account'}</span>
                <button
                  type="button"
                  onClick={() => void changeAccount()}
                  disabled={switchingAccount || loading}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-muted transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                >
                  {switchingAccount ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
                  {switchingAccount ? 'Switching…' : 'Switch'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {pendingSession && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setPendingSession(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="no-trial-title"
            aria-describedby="no-trial-desc"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line-strong bg-bg-2 p-6 shadow-2xl"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="no-trial-title" className="mt-4 text-lg font-semibold tracking-tight">Free trial not available</h2>
            <p id="no-trial-desc" className="mt-2 text-sm leading-6 text-fg-muted">
              This account has already used its free trial. You can continue with a direct purchase — {details.amount} will be charged today, then {plan === 'monthly' ? 'every month' : 'every 3 months'}.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setPendingSession(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void continueWithoutTrial()} autoFocus>Continue and pay {details.amount}</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}