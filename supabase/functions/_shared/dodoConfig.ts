export type DodoEnvironment = 'test_mode' | 'live_mode';
export type DodoPlanKey = 'monthly' | 'quarterly';

export type DodoPlan = {
  id: string;
  amount: number;
  intervalCount: 1 | 3;
};

export type DodoConfig = {
  environment: DodoEnvironment;
  baseUrl: string;
  apiKey: string;
  products: Record<DodoPlanKey, DodoPlan>;
};

export type DodoApiConfig = Pick<DodoConfig, 'environment' | 'baseUrl' | 'apiKey'>;

type EnvReader = (name: string) => string | undefined;

export function readDodoApiConfig(readEnv: EnvReader): DodoApiConfig | null {
  const environment = readEnv('DODO_PAYMENTS_ENVIRONMENT')?.trim();
  const apiKey = readEnv('DODO_PAYMENTS_API_KEY')?.trim();
  if ((environment !== 'test_mode' && environment !== 'live_mode') || !apiKey) return null;

  return {
    environment,
    baseUrl: environment === 'live_mode' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com',
    apiKey,
  };
}

export function readDodoConfig(readEnv: EnvReader): DodoConfig | null {
  const api = readDodoApiConfig(readEnv);
  const monthlyId = readEnv('DODO_PRODUCT_MONTHLY_ID')?.trim();
  const quarterlyId = readEnv('DODO_PRODUCT_QUARTERLY_ID')?.trim();
  if (!api || !monthlyId || !quarterlyId) return null;

  return {
    ...api,
    products: {
      monthly: { id: monthlyId, amount: 450, intervalCount: 1 },
      quarterly: { id: quarterlyId, amount: 1_000, intervalCount: 3 },
    },
  };
}
