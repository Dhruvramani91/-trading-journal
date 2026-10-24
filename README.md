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

The Vercel `/api/billing-region` function signs a short-lived country assertion using Vercel's country header. Supabase verifies the assertion; the browser cannot enable USD by manually choosing a region. Configure the same `BILLING_REGION_TOKEN_SECRET` (at least 32 characters) in Vercel and the matching Supabase project's Edge Function secrets.

Test and Live are separate Dodo environments. Each has its own API key, product IDs, and webhook signing key. This app selects the Dodo API host from `DODO_PAYMENTS_ENVIRONMENT`, so use `test_mode` only with test credentials/products and `live_mode` only with live credentials/products. The test and live API hosts are `https://test.dodopayments.com` and `https://live.dodopayments.com`, respectively. Never copy test product IDs or test credentials into Production. [Dodo's official TypeScript SDK documents the environment names and hosts](https://github.com/dodopayments/dodopayments-typescript).

For Preview testing, configure these secrets in the **test Supabase project** and Preview Vercel environment:

| Setting | Where | Preview value |
| --- | --- | --- |
| `DODO_PAYMENTS_ENVIRONMENT` | Supabase Edge Function secrets | `test_mode` |
| `DODO_PAYMENTS_API_KEY` | Supabase Edge Function secrets | Dodo Test Mode API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Supabase Edge Function secrets | Dodo Test Mode webhook signing key |
| `DODO_PRODUCT_MONTHLY_ID` | Supabase Edge Function secrets | Test product ID for USD 4.50/month |
| `DODO_PRODUCT_QUARTERLY_ID` | Supabase Edge Function secrets | Test product ID for USD 10/3 months |
| `APP_BASE_URL` | Supabase Edge Function secrets | The deployed Preview origin, e.g. `https://<preview-host>` |
| `BILLING_USD_ENABLED` | Supabase Edge Function secrets | `true` |
| `BILLING_REGION_TOKEN_SECRET` | Supabase Edge Function secrets and Vercel Preview | The same random secret in both services |
| `BILLING_USD_PUBLIC_ENABLED` | Vercel Preview | `true` |

For the real site, first create or activate the **Live Mode** USD 4.50 monthly and USD 10 quarterly products in Dodo and create a Live API key and Live webhook. Then configure the same settings in the **production Supabase project** and **Vercel Production**, using Live values and `DODO_PAYMENTS_ENVIRONMENT=live_mode`; set `APP_BASE_URL` to `https://www.theprecisionlab.in`. Apply the Dodo migration and deploy the Dodo Edge Functions to the production Supabase project. Keep `BILLING_USD_LIVE_ENABLED` unset or `false` while preparing Live credentials. Set both `BILLING_USD_LIVE_ENABLED=true` and `BILLING_USD_PUBLIC_ENABLED=true` in Vercel Production only after the production settings, migration, functions, and Live webhook are in place. Keep Preview on Test Mode and keep the two projects' credentials separate. Do not enable real checkout until the Live Dodo account and products are ready; Live checkout charges real customers.

When moving billing to an existing production Supabase project, retain that project's existing Auth users and application data. Do not copy the test database over it or run `supabase db reset`. First inspect the production project's migration history and compare its actual schema with the required migrations. Apply only reviewed, missing schema changes; if production was created outside this migration history, reconcile or baseline that history before using `supabase db push` so old migrations are not replayed against populated tables. Keep the existing production Razorpay Live credentials and plan IDs; configure Dodo Live credentials/products alongside them. Test-mode credentials and product IDs belong only to Preview.

A local Vite server does not provide Vercel's `/api/billing-region` endpoint, so use a Vercel Preview URL to test region detection.

### Webhooks and function secrets

Configure a separate webhook in each Dodo environment, both pointing at that environment's Supabase project:

- Razorpay: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`. Subscribe to the subscription lifecycle events listed in the Razorpay dashboard integration.
- Dodo: `https://<project-ref>.supabase.co/functions/v1/dodo-webhook`. Subscribe to `subscription.active`, `subscription.renewed`, `subscription.updated`, `subscription.cancelled`, `subscription.expired`, `subscription.on_hold`, `subscription.failed`, `subscription.past_due`, `subscription.paused`, `subscription.unpaused`, and `subscription.update_payment_method`.

Store webhook signing secrets as `RAZORPAY_WEBHOOK_SECRET` and `DODO_PAYMENTS_WEBHOOK_KEY`. Other provider secrets include `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `DODO_PAYMENTS_API_KEY`. Never commit secret values or use production credentials in Preview.

### Supabase migrations and deployment

Review migration history before applying schema changes:

```powershell
npx supabase migration list
```

After confirming the target project and reviewing its migration list, apply migrations and deploy the relevant Edge Functions. Use the test project for Preview and the production project for the live site:

```powershell
npx supabase db push --project-ref <target-project-ref>
npx supabase functions deploy create-dodo-checkout --project-ref <target-project-ref> --use-api
npx supabase functions deploy cancel-dodo-subscription --project-ref <target-project-ref> --use-api
npx supabase functions deploy dodo-webhook --project-ref <target-project-ref> --use-api --no-verify-jwt
```

The billing migrations add subscription state and restrict paid data access through database RLS. The React route guard only controls the user experience; database RLS remains the access enforcement boundary. Verify checkout, cancellation, and webhook delivery in Test Mode before enabling Production Live Mode.
