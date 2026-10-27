import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, CreditCard, LoaderCircle, LogOut, ShieldCheck, TrendingUp } from 'lucide-react';
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

function getPlanDetails(currency: 'INR' | 'USD'): Record<BillingPlan, { name: string; amount: string; cycle: string; summary: string }> {
  const monthly = formatBillingPrice(currency, 'monthly');
  const quarterly = formatBillingPrice(currency, 'quarterly');
  return {
    monthly: { name: 'Monthly', amount: monthly, cycle: 'per month', summary: `7-day free trial if eligible, then ${monthly} every month.` },
    quarterly: { name: 'Quarterly', amount: quarterly, cycle: 'every 3 months', summary: `${quarterly} billed every 3 months.` },
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

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const billingRegion = useBillingRegion();
  const requestedPlan = searchParams.get('plan');
  const plan: BillingPlan = isBillingPlan(requestedPlan) ? requestedPlan : 'monthly';
  const details = useMemo(() => getPlanDetails(billingRegion.currency)[plan], [plan, billingRegion.currency]);
  const [manualRegion, setManualRegion] = useState<'IN' | 'INTERNATIONAL'>('IN');
  const manualInternationalUnavailable = !billingRegion.regionToken && manualRegion === 'INTERNATIONAL';
  const billingAvailable = billingRegion.ready && !manualInternationalUnavailable && (billingRegion.currency === 'INR' || billingRegion.usdEnabled);
  const [loading, setLoading] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [error, setError] = useState('');
  const [actualTrialDays, setActualTrialDays] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const hasMonthlyTrial = plan === 'monthly' && actualTrialDays === 7;
  const paymentProvider = billingRegion.currency === 'USD' ? 'Dodo Payments' : 'Razorpay';
  const todayAmount = !billingRegion.ready
    ? 'Checking…'
    : !billingAvailable
      ? 'Unavailable'
      : plan === 'monthly' && actualTrialDays === null
        ? `${billingRegion.currency === 'USD' ? '$0' : '₹0'} if eligible · ${details.amount} otherwise`
        : plan === 'monthly' && hasMonthlyTrial
          ? billingRegion.currency === 'USD' ? '$0' : '₹0'
          : details.amount;

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

  async function startCheckout() {
    const client = supabase;
    if (!client) {
      setError('Payments are not configured yet. Please try again later.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (billingRegion.currency === 'USD') {
        const { data, error: createError } = await client.functions.invoke<{ checkoutUrl: string; amount: number; currency: 'USD'; trialDays: number }>('create-dodo-checkout', {
          body: { plan, regionToken: billingRegion.regionToken },
        });
        if (createError) throw new Error(createError.message || 'Could not start international checkout.');
        const expectedAmount = plan === 'monthly' ? 450 : 1_000;
        if (typeof data?.checkoutUrl !== 'string' || data.currency !== 'USD' || data.amount !== expectedAmount
          || !Number.isInteger(data.trialDays) || data.trialDays < 0 || data.trialDays > 7) {
          throw new Error('Dodo Payments returned an incomplete checkout session. Refresh the page and try again.');
        }
        if (plan === 'monthly' && data.trialDays === 0 && actualTrialDays !== 0) {
          setActualTrialDays(0);
          setNotice(`Your monthly trial has already been used. The first ${details.amount} charge will be due today. Review the updated amount and continue again to proceed.`);
          setLoading(false);
          return;
        }
        setActualTrialDays(data.trialDays);
        window.location.assign(data.checkoutUrl);
        return;
      }

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
      if (!Number.isInteger(data.trialDays) || data.trialDays < 0 || data.trialDays > 7) {
        throw new Error('The payment service returned invalid trial details.');
      }
      if (plan === 'monthly' && data.trialDays === 0 && actualTrialDays !== 0) {
        setActualTrialDays(0);
        setNotice(`Your monthly trial has already been used. The first ${details.amount} charge will be due when you authorize the subscription. Review the updated amount and continue again to proceed.`);
        setLoading(false);
        return;
      }
      setActualTrialDays(data.trialDays);

      const checkout = new window.Razorpay({
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
    } catch (checkoutError) {
      setError((checkoutError as Error).message || 'Could not open checkout. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-bg-0 px-4 py-5 text-fg sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 pb-5">
        <div className="flex min-w-0 items-center gap-4">
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
            <span className="h-1.5 w-1.5 rounded-full bg-fg-muted" aria-hidden="true" />Test mode
          </span>
        )}
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl items-center justify-center py-5 sm:min-h-[calc(100dvh-6rem)]">
        <div className="grid w-full min-w-0 items-start gap-5 lg:grid-cols-12 lg:gap-8">
          <section aria-labelledby="checkout-title" className="min-w-0 lg:col-span-7">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-dim">Secure checkout</p>
              <h1 id="checkout-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.1rem]">Choose your plan</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-fg-muted">Journal, discipline tracking and analytics — all included.</p>
            </div>

            {!billingRegion.regionToken && (
              <label className="mb-3 flex max-w-sm flex-col gap-1.5 text-xs text-fg-muted" htmlFor="billing-region">
                Billing region
                <select id="billing-region" value={manualRegion} onChange={(event) => setManualRegion(event.target.value as 'IN' | 'INTERNATIONAL')} className="rounded-xl border border-line bg-bg-2 px-3 py-2.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  <option value="IN">India · INR</option>
                  <option value="INTERNATIONAL">Outside India · international billing</option>
                </select>
              </label>
            )}
            <p className="mb-3 text-xs text-fg-dim">{!billingRegion.ready ? 'Detecting billing region…' : manualInternationalUnavailable ? 'International location could not be verified. Only India billing is available for this session.' : `Billing region: ${billingRegion.country} · ${billingRegion.currency}${billingRegion.currency === 'USD' && !billingRegion.usdEnabled ? ' · International checkout is not available yet' : ''}`}</p>

            {billingAvailable ? (
              <div aria-label="Subscription plans" role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(getPlanDetails(billingRegion.currency)) as BillingPlan[]).map((option) => {
                  const selected = option === plan;
                  const optionDetails = getPlanDetails(billingRegion.currency)[option];
                  return (
                    <Link
                      key={option}
                      to={`/checkout?plan=${option}`}
                      aria-current={selected ? 'true' : undefined}
                      aria-label={`${optionDetails.name}, ${optionDetails.amount} ${optionDetails.cycle}${selected ? ', selected' : ''}`}
                      className={`group relative flex min-h-28 items-center justify-between gap-3 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none ${selected ? 'border-focus bg-bg-3 ring-1 ring-focus/40' : 'border-line bg-bg-2 hover:border-line-strong hover:bg-bg-3'}`}
                    >
                      <span className="flex min-w-0 items-center gap-3.5">
                        <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-focus bg-bg-0' : 'border-line-strong group-hover:border-focus'}`}>
                          {selected && <span className="h-2.5 w-2.5 rounded-full bg-fg" />}
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight">
                            {optionDetails.name}
                            {option === 'monthly' && actualTrialDays !== 0 && <span className="rounded-full border border-line bg-bg-3 px-2 py-0.5 text-[11px] font-medium text-fg-muted">7-day trial if eligible</span>}
                            {option === 'quarterly' && <span className="rounded-full border border-line bg-bg-3 px-2 py-0.5 text-[11px] font-medium text-fg-muted">Every 3 months</span>}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-fg-muted">{option === 'monthly' && actualTrialDays === 0 ? `${optionDetails.amount} billed monthly; trial already used.` : option === 'monthly' ? 'Cancel anytime' : optionDetails.summary}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xl font-semibold tracking-tight">{optionDetails.amount}</span>
                        <span className="mt-1 block text-xs text-fg-muted">{optionDetails.cycle}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-line bg-bg-2 p-4 text-sm leading-6 text-fg-muted">{!billingRegion.ready ? 'Checking regional pricing…' : manualInternationalUnavailable || billingRegion.currency === 'USD' ? 'International recurring billing is not available yet.' : 'No billing plan is currently available for this region.'}</p>
            )}

            <ul className="mt-6 flex flex-wrap gap-2.5 text-xs text-fg-muted">
              {[
                { label: 'Unlimited journal', Icon: BookOpen },
                { label: 'Discipline score', Icon: TrendingUp },
                { label: 'Weekly reviews', Icon: CalendarDays },
              ].map(({ label, Icon }) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-2 px-3.5 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />{label}
                </li>
              ))}
            </ul>
          </section>

          <aside aria-labelledby="order-summary-title" className="min-w-0 rounded-2xl border border-line bg-bg-2 p-5 sm:p-6 lg:col-span-5">
            <h2 id="order-summary-title" className="text-sm font-semibold tracking-tight">Order summary</h2>
            <div className="mt-5 flex items-start justify-between gap-4 border-b border-line pb-4">
              <div className="min-w-0"><p className="font-semibold">ThePrecisionLab {details.name}</p><p className="mt-1 text-xs text-fg-muted">{!billingAvailable ? 'Billing unavailable for this region' : plan === 'monthly' ? actualTrialDays === 0 ? 'Monthly recurring billing · trial already used' : '7-day free trial if eligible, then monthly billing' : 'Quarterly recurring billing'}</p></div>
              <strong className="shrink-0 text-sm font-semibold">{!billingRegion.ready ? 'Checking…' : billingAvailable ? details.amount : 'Unavailable'}</strong>
            </div>

            <div className="relative py-4 pl-6">
              <span aria-hidden="true" className="absolute bottom-5 left-[7px] top-5 w-px bg-line-strong" />
              <div className="relative flex items-start justify-between gap-3 pb-5">
                <span aria-hidden="true" className="absolute -left-6 top-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-fg bg-bg-2"><span className="h-1 w-1 rounded-full bg-fg" /></span>
                <div><p className="text-sm font-medium text-fg">Today</p><p className="mt-1 text-xs leading-5 text-fg-muted">{plan === 'monthly' && actualTrialDays !== 0 ? 'Trial starts if eligible' : 'Subscription begins'}</p></div>
                <span className="text-right text-xs font-medium text-fg-muted">{plan === 'monthly' && actualTrialDays !== 0 ? '7 days free if eligible' : todayAmount}</span>
              </div>
              <div className="relative flex items-start justify-between gap-3">
                <span aria-hidden="true" className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-line-strong bg-bg-2" />
                <div><p className={`text-sm font-medium ${plan === 'monthly' && actualTrialDays !== 0 ? 'text-fg-muted' : 'text-fg'}`}>{plan === 'monthly' ? actualTrialDays === 0 ? 'Next month' : 'After 7 days' : 'Next billing date'}</p><p className="mt-1 text-xs leading-5 text-fg-muted">{plan === 'monthly' && actualTrialDays !== 0 ? 'First monthly charge, if eligible' : plan === 'monthly' ? 'Monthly renewal' : 'Billed again in 3 months'}</p></div>
                <span className="text-right text-xs font-medium text-fg-muted">{details.amount}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line py-4">
              <span className="text-sm text-fg-muted">Due today</span>
              <strong className="max-w-[68%] break-words text-right text-xl font-semibold tracking-tight">{todayAmount}</strong>
            </div>

            {billingAvailable && plan === 'monthly' && (
              <div className="mb-4 rounded-xl border border-line bg-bg-1 p-3.5 text-xs leading-5 text-fg-muted">
                {actualTrialDays === 0 ? (
                  <><p className="font-semibold text-fg">Trial already used</p><p className="mt-1">{details.amount} is due today, then billed every month.</p></>
                ) : (
                  <><p className="font-semibold text-fg">7-day free trial if eligible</p><p className="mt-1">You pay {billingRegion.currency === 'USD' ? '$0' : '₹0'} today if eligible. Your first {details.amount} payment is taken automatically after the trial. If you’ve already used it, {details.amount} is due today.</p></>
                )}
              </div>
            )}

            {notice && <div role="status" className="mb-4 rounded-xl border border-line bg-bg-1 px-3 py-2.5 text-sm text-fg-muted">{notice}</div>}
            {error && <div role="alert" className="mb-4 rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm text-loss-text">{error}</div>}
            <Button onClick={() => void startCheckout()} disabled={loading || !billingRegion.ready || !billingAvailable} variant="primary" size="lg" className="w-full">
              {loading ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />Connecting…</> : <><CreditCard className="h-4 w-4" />{plan === 'monthly' && actualTrialDays === 0 ? 'Continue without free trial' : plan === 'monthly' ? 'Start 7-day free trial' : `Continue with ${paymentProvider}`}</>}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-fg-dim">{plan === 'monthly' && actualTrialDays !== 0 ? 'One trial per account. Cancel before the first charge to pay nothing.' : 'Review the billing terms before confirming with your payment provider.'}</p>

            <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-fg-dim"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />Secure checkout with {paymentProvider}. Your card details are not stored by ThePrecisionLab.</p>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-bg-1 px-3 py-2.5">
                <span className="min-w-0 truncate font-mono text-xs text-fg-muted">{user?.email || 'your account'}</span>
                <button
                  type="button"
                  onClick={() => void changeAccount()}
                  disabled={switchingAccount || loading}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-fg-muted transition hover:bg-bg-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                >
                  {switchingAccount ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <LogOut className="h-3.5 w-3.5" />}
                  {switchingAccount ? 'Switching…' : 'Change account'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
