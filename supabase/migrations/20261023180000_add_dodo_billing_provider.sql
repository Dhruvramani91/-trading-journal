-- Extend the existing billing ledger so international subscriptions can use
-- Dodo Payments without changing existing Razorpay records.
alter table public.billing_subscriptions
  add column if not exists payment_provider text not null default 'razorpay'
    check (payment_provider in ('razorpay', 'dodo')),
  alter column razorpay_subscription_id drop not null,
  add column if not exists dodo_subscription_id text,
  add column if not exists dodo_checkout_session_id text,
  add column if not exists dodo_checkout_url text,
  add column if not exists dodo_product_id text;

create unique index if not exists billing_subscriptions_dodo_subscription_id_key
  on public.billing_subscriptions(dodo_subscription_id)
  where dodo_subscription_id is not null;

create unique index if not exists billing_subscriptions_dodo_checkout_session_id_key
  on public.billing_subscriptions(dodo_checkout_session_id)
  where dodo_checkout_session_id is not null;

create table if not exists public.dodo_webhook_events (
  event_id text primary key,
  subscription_id text not null,
  event_type text not null,
  event_created_at bigint not null,
  processed_at timestamptz not null default now()
);

alter table public.dodo_webhook_events enable row level security;
revoke all on public.dodo_webhook_events from anon, authenticated;
grant all on public.dodo_webhook_events to service_role;

create or replace function public.apply_dodo_subscription_event(
  p_event_id text,
  p_subscription_id text,
  p_event_type text,
  p_event_created_at bigint,
  p_status text,
  p_current_start bigint,
  p_current_end bigint,
  p_charge_at bigint,
  p_cancel_at_cycle_end boolean,
  p_billing_subscription_id uuid,
  p_product_id text
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
    'subscription.active', 'subscription.renewed', 'subscription.updated',
    'subscription.cancelled', 'subscription.expired', 'subscription.on_hold',
    'subscription.failed', 'subscription.past_due', 'subscription.paused',
    'subscription.unpaused', 'subscription.update_payment_method'
  ) then
    return 'ignored';
  end if;

  select * into v_subscription
    from public.billing_subscriptions
    where payment_provider = 'dodo'
      and (dodo_subscription_id = p_subscription_id or id = p_billing_subscription_id)
    for update;
  if not found then
    raise exception 'Dodo subscription not found';
  end if;
  if v_subscription.dodo_product_id is not null and v_subscription.dodo_product_id <> p_product_id then
    raise exception 'Dodo product mismatch';
  end if;
  if v_subscription.status in ('cancelled', 'completed', 'expired') then
    return 'terminal';
  end if;

  insert into public.dodo_webhook_events(event_id, subscription_id, event_type, event_created_at)
    values (p_event_id, p_subscription_id, p_event_type, p_event_created_at)
    on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  if p_event_created_at < coalesce(v_subscription.last_event_created_at, 0) then
    return 'stale';
  end if;

  update public.billing_subscriptions set
    dodo_subscription_id = coalesce(dodo_subscription_id, p_subscription_id),
    status = p_status,
    current_start = coalesce(p_current_start, current_start),
    current_end = coalesce(p_current_end, current_end),
    charge_at = coalesce(p_charge_at, current_end, charge_at),
    cancel_at_cycle_end = coalesce(p_cancel_at_cycle_end, cancel_at_cycle_end),
    last_event_created_at = p_event_created_at,
    updated_at = now()
  where id = v_subscription.id;
  return 'applied';
end;
$$;

revoke all on function public.apply_dodo_subscription_event(text, text, text, bigint, text, bigint, bigint, bigint, boolean, uuid, text)
  from public, anon, authenticated;
grant execute on function public.apply_dodo_subscription_event(text, text, text, bigint, text, bigint, bigint, bigint, boolean, uuid, text)
  to service_role;
