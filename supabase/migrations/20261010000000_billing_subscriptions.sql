create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_subscription_id text not null unique,
  plan_key text not null check (plan_key in ('monthly', 'quarterly')),
  status text not null default 'created',
  current_start bigint,
  current_end bigint,
  charge_at bigint,
  cancel_at_cycle_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions(user_id);

alter table public.billing_subscriptions enable row level security;

create policy "Users can read their own billing subscriptions"
  on public.billing_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.billing_subscriptions from anon, authenticated;
grant select on public.billing_subscriptions to authenticated;
