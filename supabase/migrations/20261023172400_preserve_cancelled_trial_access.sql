-- Cancelling a monthly trial stops renewal immediately in Razorpay because an
-- authenticated subscription has no active billing cycle yet. Preserve access
-- through the already-claimed trial's original charge_at timestamp.
create or replace function public.current_user_has_billing_entitlement()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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
