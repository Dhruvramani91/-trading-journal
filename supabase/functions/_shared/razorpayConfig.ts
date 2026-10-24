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
  const keyId = readEnv('RAZORPAY_KEY_ID')?.trim();
  const keySecret = readEnv('RAZORPAY_KEY_SECRET')?.trim();
  if (!keyId || !keySecret) return null;
  return { environment, keyId, keySecret };
}

export function razorpayEnvironmentName() {
  return 'RAZORPAY';
}

export function readRazorpayWebhookSecret(readEnv: EnvReader) {
  return readEnv('RAZORPAY_WEBHOOK_SECRET')?.trim() || null;
}
