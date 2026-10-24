export function subscriptionEntitled(
  planKey: 'monthly' | 'quarterly',
  status: string,
  chargeAt: number | null,
  currentEnd: number | null,
  cancelAtCycleEnd: boolean,
  nowSeconds: number,
  trialDays = 0,
  trialClaimed = false,
  currentStart: number | null = null,
) {
  if (status === 'active') return currentEnd !== null && currentEnd > nowSeconds;
  if (planKey === 'monthly' && status === 'authenticated' && trialDays === 7 && trialClaimed) {
    return chargeAt !== null && chargeAt > nowSeconds;
  }
  if (status === 'cancelled' && cancelAtCycleEnd) return currentEnd !== null && currentEnd > nowSeconds;
  if (status === 'cancelled' && planKey === 'monthly' && trialDays === 7 && trialClaimed && currentStart === null && currentEnd === null) {
    return chargeAt !== null && chargeAt > nowSeconds;
  }
  return false;
}
