import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/layout/Brand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { consumeBillingPlanIntent, isBillingPlan, type BillingPlan } from '@/lib/billing';
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
    monthly: { name: 'Monthly', amount: monthly, cycle: 'per month', summary: currency === 'INR' ? `7-day free trial, then ${monthly} every month.` : `${monthly} billed every month.` },
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

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const billingRegion = useBillingRegion();
  const requestedPlan = searchParams.get('plan');
  const plan: BillingPlan = isBillingPlan(requestedPlan) ? requestedPlan : 'monthly';
  const details = useMemo(() => getPlanDetails(billingRegion.currency)[plan], [plan, billingRegion.currency]);
  const [manualRegion, setManualRegion] = useState<'IN' | 'INTERNATIONAL'>('IN');
  const manualInternationalUnavailable = !billingRegion.regionToken && manualRegion === 'INTERNATIONAL';
  const billingAvailable = billingRegion.ready && !manualInternationalUnavailable && (billingRegion.currency === 'INR' || billingRegion.usdEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [actualTrialDays, setActualTrialDays] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const hasMonthlyTrial = plan === 'monthly' && actualTrialDays === 7;

  useEffect(() => {
    consumeBillingPlanIntent();
  }, [plan]);

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
        const { data, error: createError } = await client.functions.invoke<{ checkoutUrl: string; amount: number; currency: 'USD' }>('create-dodo-checkout', {
          body: { plan, regionToken: billingRegion.regionToken },
        });
        if (createError) throw new Error(createError.message || 'Could not start international checkout.');
        const expectedAmount = plan === 'monthly' ? 450 : 1_000;
        if (typeof data?.checkoutUrl !== 'string' || data.currency !== 'USD' || data.amount !== expectedAmount) {
          throw new Error('Dodo Payments returned an incomplete checkout session. Refresh the page and try again.');
        }
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
        theme: { color: '#6558e8' },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response) => {
          const { data: verified, error: verifyError } = await client.functions.invoke<VerifySubscriptionResponse>('verify-razorpay-subscription', {
            body: response,
          });
          if (verifyError || !verified?.verified) {
            setError('Razorpay authorized the subscription, but we could not verify it yet. Your subscription will update after confirmation.');
          } else {
            setSuccess(true);
          }
          setLoading(false);
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
    <main className="min-h-screen bg-bg-0 px-4 py-10 text-fg sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-fg-muted transition hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Back to ThePrecisionLab
        </Link>

        <div className="grid items-start gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-line bg-bg-2 p-6 shadow-pop sm:p-8">
            <BrandLogo size="md" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-fg-dim">Secure checkout</p>
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
            {billingRegion.ready && billingRegion.paymentMode === 'test_mode' && <p role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">Test payment mode is active. No real payment will be taken.</p>}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {billingAvailable ? (Object.keys(getPlanDetails(billingRegion.currency)) as BillingPlan[]).map((option) => {
                const selected = option === plan;
                const optionDetails = getPlanDetails(billingRegion.currency)[option];
                return (
                  <Link
                    key={option}
                    to={`/checkout?plan=${option}`}
                    aria-current={selected ? 'true' : undefined}
                    className={`rounded-2xl border p-4 transition ${selected ? 'border-accent bg-accent/5 ring-1 ring-accent/40' : 'border-line bg-bg-1 hover:border-line-strong'}`}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold">{optionDetails.name}{selected && <Check className="h-4 w-4 text-accent" />}</span>
                    <span className="mt-3 block text-2xl font-bold">{optionDetails.amount}<span className="ml-1 text-xs font-medium text-fg-muted">{optionDetails.cycle}</span></span>
                    <span className="mt-2 block text-xs leading-5 text-fg-muted">{billingRegion.currency === 'INR' && option === 'monthly' && actualTrialDays === null ? 'Trial eligibility confirmed before checkout.' : billingRegion.currency === 'INR' && option === 'monthly' && actualTrialDays === 0 ? `${optionDetails.amount} billed monthly; trial already used.` : optionDetails.summary}</span>
                  </Link>
                );
              }) : <p className="rounded-xl border border-line bg-bg-1 p-4 text-sm leading-6 text-fg-muted">{!billingRegion.ready ? 'Checking regional pricing…' : manualInternationalUnavailable || billingRegion.currency === 'USD' ? 'International recurring billing is not available yet.' : 'No billing plan is currently available for this region.'}</p>}
            </div>

            <ul className="mt-7 space-y-3 text-sm text-fg-muted">
              {['Unlimited journal entries', 'Discipline score and performance analytics', 'Weekly review prompts'].map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-win" />{item}</li>
              ))}
            </ul>
          </section>

          <aside className="rounded-3xl border border-line bg-bg-2 p-6 shadow-pop sm:p-8">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-6 flex items-start justify-between gap-4 border-b border-line pb-5">
              <div><p className="font-medium">ThePrecisionLab {details.name}</p><p className="mt-1 text-sm text-fg-muted">{!billingAvailable ? 'Billing unavailable for this region' : plan === 'monthly' ? (billingRegion.currency === 'USD' ? 'Monthly recurring billing' : actualTrialDays === null ? 'Trial eligibility is checked before checkout' : hasMonthlyTrial ? '7 days free, then monthly billing' : 'Monthly recurring billing · trial already used') : 'Quarterly recurring billing'}</p></div>
              <strong className="text-lg">{!billingRegion.ready ? 'Checking…' : billingAvailable ? details.amount : 'Unavailable'}</strong>
            </div>
            <div className="flex justify-between py-5 text-sm"><span className="text-fg-muted">Due today</span><strong>{!billingRegion.ready ? 'Checking…' : !billingAvailable ? 'Unavailable' : billingRegion.currency === 'INR' && plan === 'monthly' && actualTrialDays === null ? 'Confirmed before checkout' : billingRegion.currency === 'INR' && plan === 'monthly' && hasMonthlyTrial ? '₹0' : details.amount}</strong></div>
            {billingAvailable && billingRegion.currency === 'INR' && plan === 'monthly' && <p className="-mt-2 mb-5 text-xs leading-5 text-fg-dim">{actualTrialDays === null ? 'Your trial eligibility and first charge date are confirmed before Razorpay opens.' : hasMonthlyTrial ? `Your 7-day trial begins after subscription authorization. Your first ${details.amount} charge is scheduled after the trial.` : `Your trial has already been used. The ${details.amount} monthly charge will begin when you authorize.`}</p>}

            {notice && <div role="status" className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-fg-muted">{notice}</div>}
            {error && <div role="alert" className="mb-4 rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm text-loss">{error}</div>}
            {success ? (
              <div role="status" className="rounded-xl border border-win/30 bg-win/10 p-4 text-sm text-win">
                <p className="font-semibold">Authorization received</p>
                <p className="mt-1 text-xs leading-5">Your Razorpay status is being confirmed. Paid access is available only after subscription activation or during the monthly trial. You can review your status in your profile.</p>
                <Button asChild variant="primary" className="mt-4 w-full"><Link to="/profile">View subscription status</Link></Button>
              </div>
            ) : (
              <Button onClick={() => void startCheckout()} disabled={loading || !billingRegion.ready || !billingAvailable} variant="primary" size="lg" className="w-full">
                {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Connecting…</> : <><CreditCard className="h-4 w-4" />{billingRegion.currency === 'USD' ? 'Continue with Dodo Payments' : plan === 'monthly' && actualTrialDays === 0 ? 'Continue without free trial' : 'Continue with Razorpay'}</>}
              </Button>
            )}
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-fg-dim"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Payments are securely processed by {billingRegion.currency === 'USD' ? 'Dodo Payments' : 'Razorpay'}. Your card details are not stored by ThePrecisionLab.</p>
            <p className="mt-5 text-center text-xs text-fg-dim">Signed in as {user?.email || 'your account'}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
