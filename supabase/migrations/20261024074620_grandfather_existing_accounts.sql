-- Preserve workspace access for accounts that existed before billing rollout.
-- This snapshots existing Auth users once; new accounts must have a billing
-- entitlement to access paid workspace data.
create table if not exists public.billing_legacy_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  grandfathered_at timestamptz not null default now()
);

alter table public.billing_legacy_access enable row level security;
revoke all on public.billing_legacy_access from public, anon, authenticated;
grant all on public.billing_legacy_access to service_role;

insert into public.billing_legacy_access (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.current_user_has_billing_entitlement()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.billing_legacy_access as legacy
    where legacy.user_id = auth.uid()
  ) or exists (
    select 1
    from public.billing_subscriptions as subscription
    where subscription.user_id = auth.uid()
      and (
        (subscription.status = 'active'
          and subscription.current_end is not null
          and subscription.current_end > floor(extract(epoch from statement_timestamp()))::bigint)
        or (subscription.plan_key = 'monthly'
          and subscription.status = 'authenticated'
          and subscription.trial_days = 7
          and subscription.trial_claimed_at is not null
          and subscription.charge_at is not null
          and subscription.charge_at > floor(extract(epoch from statement_timestamp()))::bigint)
        or (subscription.status = 'cancelled'
          and subscription.cancel_at_cycle_end
          and subscription.current_end is not null
          and subscription.current_end > floor(extract(epoch from statement_timestamp()))::bigint)
        or (subscription.status = 'cancelled'
          and subscription.plan_key = 'monthly'
          and subscription.trial_days = 7
          and subscription.trial_claimed_at is not null
          and subscription.current_start is null
          and subscription.current_end is null
          and subscription.charge_at is not null
          and subscription.charge_at > floor(extract(epoch from statement_timestamp()))::bigint)
      )
  );
$$;

revoke all on function public.current_user_has_billing_entitlement() from public, anon;
grant execute on function public.current_user_has_billing_entitlement() to authenticated;

notify pgrst, 'reload schema';
