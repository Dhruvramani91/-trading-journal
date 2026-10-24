alter table public.billing_subscriptions
  add column if not exists currency text not null default 'INR'
    check (currency in ('INR', 'USD')),
  add column if not exists razorpay_plan_id text,
  add column if not exists trial_claimed_at timestamptz,
  add column if not exists trial_days integer not null default 0 check (trial_days in (0, 7)),
  add column if not exists last_event_created_at bigint;

-- A single in-flight or entitled subscription per user prevents concurrent
-- checkout requests from creating multiple chargeable subscriptions.
create unique index if not exists billing_subscriptions_one_open_per_user_idx
  on public.billing_subscriptions(user_id)
  where status in ('created', 'authenticated', 'active', 'pending', 'paused');

-- A monthly trial is consumed once at subscription creation. This favors
-- preventing repeat trials even if the user abandons the authorization flow.
create unique index if not exists billing_subscriptions_one_trial_per_user_idx
  on public.billing_subscriptions(user_id)
  where trial_claimed_at is not null;

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  subscription_id text not null,
  event_type text not null,
  event_created_at bigint not null,
  processed_at timestamptz not null default now()
);

alter table public.razorpay_webhook_events enable row level security;
revoke all on public.razorpay_webhook_events from anon, authenticated;
grant all on public.razorpay_webhook_events to service_role;

create or replace function public.apply_razorpay_subscription_event(
  p_event_id text,
  p_subscription_id text,
  p_event_type text,
  p_event_created_at bigint,
  p_status text,
  p_current_start bigint,
  p_current_end bigint,
  p_charge_at bigint,
  p_cancel_at_cycle_end boolean,
  p_plan_id text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.billing_subscriptions%rowtype;
  v_inserted integer;
begin
  if p_event_type not in (
    'subscription.authenticated', 'subscription.activated', 'subscription.charged',
    'subscription.halted', 'subscription.paused', 'subscription.resumed',
    'subscription.updated', 'subscription.cancelled', 'subscription.completed',
    'subscription.pending'
  ) then
    return 'ignored';
  end if;

  select * into v_subscription
    from public.billing_subscriptions
    where razorpay_subscription_id = p_subscription_id
    for update;
  if not found then
    raise exception 'subscription not found';
  end if;
  if v_subscription.razorpay_plan_id is null or v_subscription.razorpay_plan_id <> p_plan_id then
    raise exception 'subscription plan mismatch';
  end if;

  insert into public.razorpay_webhook_events(event_id, subscription_id, event_type, event_created_at)
    values (p_event_id, p_subscription_id, p_event_type, p_event_created_at)
    on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate';
  end if;

  if p_event_created_at < coalesce(v_subscription.last_event_created_at, 0)
    or (p_event_created_at = v_subscription.last_event_created_at and
      (case p_status
        when 'completed' then 5
        when 'cancelled' then 5
        when 'expired' then 5
        when 'active' then 4
        when 'paused' then 3
        when 'authenticated' then 2
        when 'pending' then 1
        when 'halted' then 1
        else 0
      end) <
      (case v_subscription.status
        when 'completed' then 5
        when 'cancelled' then 5
        when 'expired' then 5
        when 'active' then 4
        when 'paused' then 3
        when 'authenticated' then 2
        when 'pending' then 1
        when 'halted' then 1
        else 0
      end)) then
    return 'stale';
  end if;

  update public.billing_subscriptions set
    status = p_status,
    trial_claimed_at = case
      when p_event_type = 'subscription.authenticated' and plan_key = 'monthly' and trial_days = 7
        then coalesce(trial_claimed_at, now())
      else trial_claimed_at
    end,
    current_start = coalesce(p_current_start, current_start),
    current_end = coalesce(p_current_end, current_end),
    charge_at = coalesce(p_charge_at, charge_at),
    cancel_at_cycle_end = coalesce(p_cancel_at_cycle_end, cancel_at_cycle_end),
    last_event_created_at = p_event_created_at,
    updated_at = now()
  where id = v_subscription.id;
  return 'applied';
end;
$$;

revoke all on function public.apply_razorpay_subscription_event(text, text, text, bigint, text, bigint, bigint, bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.apply_razorpay_subscription_event(text, text, text, bigint, text, bigint, bigint, bigint, boolean, text) to service_role;
