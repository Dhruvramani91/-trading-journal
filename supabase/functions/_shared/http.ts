export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200, cors = true) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cors ? corsHeaders : {}) },
  });
}

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function razorpaySubscriptionSignaturePayload(paymentId: string, subscriptionId: string) {
  return `${paymentId}|${subscriptionId}`;
}

export async function verifyRazorpaySubscriptionSignature(
  secret: string,
  paymentId: string,
  subscriptionId: string,
  signature: string,
) {
  const expected = await hmacSha256Hex(secret, razorpaySubscriptionSignaturePayload(paymentId, subscriptionId));
  return safeEqualHex(expected, signature);
}

export function safeEqualHex(left: string, right: string) {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right) || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function verifiedBillingCountry(token: unknown, secret: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || !secret || secret.length < 32) return null;
  const match = /^([A-Z]{2})\.(\d{10})\.([0-9a-f]{64})$/i.exec(token);
  if (!match) return null;
  const [, countryRaw, expiryRaw, signature] = match;
  const country = countryRaw.toUpperCase();
  const expiry = Number(expiryRaw);
  if (!Number.isSafeInteger(expiry) || expiry <= nowSeconds || expiry > nowSeconds + 10 * 60 + 30) return null;
  const expected = await hmacSha256Hex(secret, `${country}.${expiry}`);
  return safeEqualHex(expected, signature) ? country : null;
}
