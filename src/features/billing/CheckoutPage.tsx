import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
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
    <main className="min-h-screen w-full overflow-x-hidden bg-bg-0 px-4 py-10 text-fg sm:px-6 lg:py-5">
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-fg-muted transition hover:text-fg lg:mb-5">
          <ArrowLeft className="h-4 w-4" /> Back to ThePrecisionLab
        </Link>

        <div className="grid min-w-0 items-start gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-4">
          <section className="min-w-0 rounded-3xl border border-line bg-bg-2 p-6 shadow-pop sm:p-8 lg:p-6">
            <BrandLogo size="md" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-fg-dim lg:mt-5">Secure checkout</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose your plan</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-fg-muted">Get the complete trading journal, discipline tracking, and performance analytics.</p>
            {!billingRegion.regionToken && (
              <label className="mt-3 flex max-w-xs flex-col gap-1.5 text-xs text-fg-muted" htmlFor="billing-region">
                Billing region
                <select id="billing-region" value={manualRegion} onChange={(event) => setManualRegion(event.target.value as 'IN' | 'INTERNATIONAL')} className="rounded-lg border border-line bg-bg-1 px-3 py-2 text-sm text-fg">
                  <option value="IN">India · INR</option>
                  <option value="INTERNATIONAL">Outside India · international billing</option>
                </select>
              </label>
            )}
            <p className="mt-2 text-xs text-fg-dim">{!billingRegion.ready ? 'Detecting billing region…' : manualInternationalUnavailable ? 'International location could not be verified. Only India billing is available for this session.' : `Billing region: ${billingRegion.country} · ${billingRegion.currency}${billingRegion.currency === 'USD' && !billingRegion.usdEnabled ? ' · International checkout is not available yet' : ''}`}</p>
            {billingRegion.ready && billingRegion.paymentMode === 'test_mode' && <p role="status" className="mt-3 rounded-lg border border-line bg-bg-3 px-3 py-2 text-sm text-fg-muted">Test payment mode is active. No real payment will be taken.</p>}

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-5">
              {billingAvailable ? (Object.keys(getPlanDetails(billingRegion.currency)) as BillingPlan[]).map((option) => {
                const selected = option === plan;
                const optionDetails = getPlanDetails(billingRegion.currency)[option];
                return (
                  <Link
                    key={option}
                    to={`/checkout?plan=${option}`}
                    aria-current={selected ? 'true' : undefined}
                    className={`rounded-2xl border p-4 transition ${selected ? 'border-accent bg-accent/5 ring-1 ring-focus/40' : 'border-line bg-bg-1 hover:border-line-strong'}`}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold">{optionDetails.name}{selected && <Check className="h-4 w-4 text-accent" />}</span>
                    <span className="mt-3 block text-2xl font-bold">{optionDetails.amount}<span className="ml-1 text-xs font-medium text-fg-muted">{optionDetails.cycle}</span></span>
                    <span className="mt-2 block text-xs leading-5 text-fg-muted">{option === 'monthly' && actualTrialDays === 0 ? `${optionDetails.amount} billed monthly; trial already used.` : optionDetails.summary}</span>
                  </Link>
                );
              }) : <p className="rounded-xl border border-line bg-bg-1 p-4 text-sm leading-6 text-fg-muted">{!billingRegion.ready ? 'Checking regional pricing…' : manualInternationalUnavailable || billingRegion.currency === 'USD' ? 'International recurring billing is not available yet.' : 'No billing plan is currently available for this region.'}</p>}
            </div>

            <ul className="mt-7 space-y-3 text-sm text-fg-muted lg:mt-5 lg:space-y-2">
              {['Unlimited journal entries', 'Discipline score and performance analytics', 'Weekly review prompts'].map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-fg-muted" />{item}</li>
              ))}
            </ul>
          </section>

          <aside className="min-w-0 rounded-3xl border border-line bg-bg-2 p-6 shadow-pop sm:p-8 lg:p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-6 flex items-start justify-between gap-4 border-b border-line pb-5 lg:mt-4 lg:pb-4">
              <div><p className="font-medium">ThePrecisionLab {details.name}</p><p className="mt-1 text-sm text-fg-muted">{!billingAvailable ? 'Billing unavailable for this region' : plan === 'monthly' ? (actualTrialDays === 0 ? 'Monthly recurring billing · trial already used' : '7-day free trial if eligible, then monthly billing') : 'Quarterly recurring billing'}</p></div>
              <strong className="text-lg">{!billingRegion.ready ? 'Checking…' : billingAvailable ? details.amount : 'Unavailable'}</strong>
            </div>
            <div className="flex justify-between py-5 text-sm lg:py-3"><span className="text-fg-muted">Due today</span><strong>{!billingRegion.ready ? 'Checking…' : !billingAvailable ? 'Unavailable' : plan === 'monthly' && actualTrialDays === null ? `${billingRegion.currency === 'USD' ? '$0' : '₹0'} if eligible · ${details.amount} otherwise` : plan === 'monthly' && hasMonthlyTrial ? billingRegion.currency === 'USD' ? '$0' : '₹0' : details.amount}</strong></div>
            {billingAvailable && plan === 'monthly' && (
              <div className="-mt-2 mb-5 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs leading-5 text-fg-muted">
                {actualTrialDays === 0 ? (
                  <><p className="font-semibold text-fg">Trial already used</p><p className="mt-1">{details.amount} is due today, then billed every month.</p></>
                ) : (
                  <><p className="font-semibold text-fg">7-day free trial · then {details.amount}/month</p><p className="mt-1">If eligible, you pay {billingRegion.currency === 'USD' ? '$0' : '₹0'} today. Your first {details.amount} payment is taken automatically after the 7-day trial. The trial is available once per account; if you already used it, {details.amount} is due today.</p></>
                )}
              </div>
            )}

            {notice && <div role="status" className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-fg-muted">{notice}</div>}
            {error && <div role="alert" className="mb-4 rounded-xl border border-line bg-bg-3 px-3 py-2.5 text-sm text-fg">{error}</div>}
            <Button onClick={() => void startCheckout()} disabled={loading || !billingRegion.ready || !billingAvailable} variant="primary" size="lg" className="w-full">
              {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Connecting…</> : <><CreditCard className="h-4 w-4" />{plan === 'monthly' && actualTrialDays === 0 ? 'Continue without free trial' : plan === 'monthly' ? 'Review trial & continue' : `Continue with ${billingRegion.currency === 'USD' ? 'Dodo Payments' : 'Razorpay'}`}</>}
            </Button>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-fg-dim"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Payments are securely processed by {billingRegion.currency === 'USD' ? 'Dodo Payments' : 'Razorpay'}. Your card details are not stored by ThePrecisionLab.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center text-xs text-fg-dim">
              <span className="break-all">Signed in as {user?.email || 'your account'}</span>
              <button
                type="button"
                onClick={() => void changeAccount()}
                disabled={switchingAccount || loading}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-accent underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {switchingAccount ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                {switchingAccount ? 'Signing out…' : 'Change account'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
