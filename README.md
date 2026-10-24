# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Billing

India subscriptions use Razorpay; international subscriptions use Dodo Payments. Both use authenticated Supabase Edge Functions, and verified webhooks update `public.billing_subscriptions`. Keep provider credentials in server-side secrets.

### Regional prices

| Region | Plan | Price | Provider | Trial |
| --- | --- | ---: | --- | --- |
| India | Monthly | INR 400/month | Razorpay | 7 days for eligible users |
| India | Quarterly | INR 1,000/3 months | Razorpay | None |
| International | Monthly | USD 4.50/month | Dodo Payments | None |
| International | Quarterly | USD 10/3 months | Dodo Payments | None |

Razorpay INR plan IDs are configured by `RAZORPAY_PLAN_MONTHLY_ID` and `RAZORPAY_PLAN_QUARTERLY_ID`. Dodo product IDs and expected prices/cadence are validated by `create-dodo-checkout` before a checkout session is created.

### Region verification and feature flags

The Vercel `/api/billing-region` function signs a short-lived country assertion using Vercel's country header. Supabase verifies the assertion; the browser cannot enable USD by manually choosing a region. Configure the same `BILLING_REGION_TOKEN_SECRET` (at least 32 characters) in Vercel and Supabase Edge Function secrets.

For a test deployment, set `BILLING_USD_ENABLED=true` in the test Supabase project's Edge Function secrets and `BILLING_USD_PUBLIC_ENABLED=true` in Vercel's Preview environment. Keep the Production flag off until the live Dodo integration is ready. A local Vite server does not provide Vercel's `/api/billing-region` endpoint, so use a Vercel Preview URL to test region detection.

### Webhooks and function secrets

Configure Test Mode webhooks to:

- Razorpay: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`. Subscribe to the subscription lifecycle events listed in the Razorpay dashboard integration.
- Dodo: `https://<project-ref>.supabase.co/functions/v1/dodo-webhook`. Subscribe to `subscription.active`, `subscription.renewed`, `subscription.updated`, `subscription.cancelled`, `subscription.expired`, `subscription.on_hold`, `subscription.failed`, `subscription.past_due`, `subscription.paused`, `subscription.unpaused`, and `subscription.update_payment_method`.

Store webhook signing secrets as `RAZORPAY_WEBHOOK_SECRET` and `DODO_PAYMENTS_WEBHOOK_KEY`. Other provider secrets include `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `DODO_PAYMENTS_API_KEY`. Never commit secret values or use production credentials in Preview.

### Supabase migrations and deployment

Review migration history before applying schema changes:

```powershell
npx supabase migration list
```

After confirming the target is a test project and the migration list is expected, apply the migration and deploy the relevant Edge Functions:

```powershell
npx supabase db push --project-ref <test-project-ref>
npx supabase functions deploy create-dodo-checkout --project-ref <test-project-ref> --use-api
npx supabase functions deploy cancel-dodo-subscription --project-ref <test-project-ref> --use-api
npx supabase functions deploy dodo-webhook --project-ref <test-project-ref> --use-api --no-verify-jwt
```

The billing migrations add subscription state and restrict paid data access through database RLS. The React route guard only controls the user experience; database RLS remains the access enforcement boundary. Test checkout, cancellation, and webhook delivery in provider Test Mode before configuring Live Mode.
