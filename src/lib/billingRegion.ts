import { useEffect, useState } from 'react';

export type BillingCurrency = 'INR' | 'USD';
export type BillingRegion = {
  country: string;
  currency: BillingCurrency;
  regionToken: string | null;
  usdEnabled: boolean;
};

const indiaFallback: BillingRegion = {
  country: 'IN',
  currency: 'INR',
  regionToken: null,
  usdEnabled: false,
};

export function useBillingRegion() {
  const [region, setRegion] = useState<BillingRegion>(indiaFallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/billing-region', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Could not detect the billing region.');
        return response.json() as Promise<Partial<BillingRegion>>;
      })
      .then((result) => {
        if (!active) return;
        const validCurrency = result.currency === 'USD' ? 'USD' : 'INR';
        setRegion({
          country: typeof result.country === 'string' && /^[A-Z]{2}$/.test(result.country) ? result.country : 'IN',
          currency: validCurrency,
          regionToken: typeof result.regionToken === 'string' ? result.regionToken : null,
          usdEnabled: validCurrency === 'USD' && result.usdEnabled === true && typeof result.regionToken === 'string',
        });
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setRegion(indiaFallback);
          setReady(true);
        }
      });

    return () => { active = false; };
  }, []);

  return { ...region, ready };
}

export function formatBillingPrice(currency: BillingCurrency, amount: 'monthly' | 'quarterly') {
  if (currency === 'USD') return amount === 'monthly' ? '$4.50' : '$10';
  return amount === 'monthly' ? '₹400' : '₹1,000';
}
