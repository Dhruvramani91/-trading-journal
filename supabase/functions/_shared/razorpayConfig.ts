export type RazorpayEnvironment = 'test_mode' | 'live_mode';

type EnvReader = (name: string) => string | undefined;

export type RazorpayCredentials = {
  environment: RazorpayEnvironment;
  keyId: string;
  keySecret: string;
};

function selectedEnvironment(readEnv: EnvReader): RazorpayEnvironment {
  return readEnv('RAZORPAY_ENVIRONMENT')?.trim() === 'test_mode' ? 'test_mode' : 'live_mode';
}

export function readRazorpayCredentials(readEnv: EnvReader): RazorpayCredentials | null {
  const environment = selectedEnvironment(readEnv);
  const prefix = environment === 'test_mode' ? 'RAZORPAY_TEST_' : 'RAZORPAY_';
  const keyId = readEnv(`${prefix}KEY_ID`)?.trim();
  const keySecret = readEnv(`${prefix}KEY_SECRET`)?.trim();
  if (!keyId || !keySecret) return null;
  return { environment, keyId, keySecret };
}

export function razorpayEnvironmentName(readEnv: EnvReader) {
  return selectedEnvironment(readEnv) === 'test_mode' ? 'RAZORPAY_TEST' : 'RAZORPAY';
}

export function readRazorpayWebhookSecret(readEnv: EnvReader) {
  const prefix = selectedEnvironment(readEnv) === 'test_mode' ? 'RAZORPAY_TEST_' : 'RAZORPAY_';
  return readEnv(`${prefix}WEBHOOK_SECRET`)?.trim() || null;
}

export function testBillingUserAllowed(email: string | undefined, readEnv: EnvReader) {
  if (readEnv('RAZORPAY_ENVIRONMENT')?.trim() !== 'test_mode'
    && readEnv('DODO_PAYMENTS_ENVIRONMENT')?.trim() !== 'test_mode') return true;
  const allowed = (readEnv('BILLING_TEST_ALLOWED_EMAILS') || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  return typeof email === 'string' && allowed.includes(email.trim().toLowerCase());
}
