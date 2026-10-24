import { createHmac } from 'node:crypto';

export default function billingRegion(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Vary', 'x-vercel-ip-country');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const tokenSecret = process.env.BILLING_REGION_TOKEN_SECRET;
  const detectedCountry = request.headers['x-vercel-ip-country'];
  const normalizedCountry = typeof detectedCountry === 'string' ? detectedCountry.toUpperCase() : '';
  const country = /^[A-Z]{2}$/.test(normalizedCountry)
    ? normalizedCountry
    : null;

  // Without a platform country signal and shared signing secret, the system
  // intentionally falls back to INR. A browser cannot choose its own currency.
  if (!country || !tokenSecret || tokenSecret.length < 32) {
    return response.status(200).json({ country: 'IN', currency: 'INR', regionToken: null, usdEnabled: false });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
  const signedValue = `${country}.${expiresAt}`;
  const signature = createHmac('sha256', tokenSecret).update(signedValue).digest('hex');
  const usdLiveEnabled = process.env.VERCEL_ENV !== 'production'
    || process.env.BILLING_USD_LIVE_ENABLED === 'true';
  const usdEnabled = country !== 'IN'
    && process.env.BILLING_USD_PUBLIC_ENABLED === 'true'
    && usdLiveEnabled;

  return response.status(200).json({
    country,
    currency: country === 'IN' ? 'INR' : 'USD',
    regionToken: `${signedValue}.${signature}`,
    usdEnabled,
  });
}
