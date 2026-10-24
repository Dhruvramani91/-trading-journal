-- Gate paid workspace data at the database boundary while retaining the
-- existing owner-only policies. Billing/profile/auth/checkout tables remain
-- available to authenticated users according to their existing policies.
alter table public.billing_subscriptions
  add column if not exists last_event_type text;

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
          and subscription.charge_at is not null
          and subscription.charge_at > floor(extract(epoch from statement_timestamp()))::bigint)
        or (subscription.status = 'cancelled'
          and subscription.cancel_at_cycle_end
          and subscription.current_end is not null
          and subscription.current_end > floor(extract(epoch from statement_timestamp()))::bigint)
      )
  );
$$;

revoke all on function public.current_user_has_billing_entitlement() from public, anon;
grant execute on function public.current_user_has_billing_entitlement() to authenticated;

drop policy if exists trades_paid_entitlement_guard on public.trades;
create policy trades_paid_entitlement_guard
  on public.trades as restrictive for all to authenticated
  using (user_id = (select auth.uid()) and (select public.current_user_has_billing_entitlement()))
  with check (user_id = (select auth.uid()) and (select public.current_user_has_billing_entitlement()));

drop policy if exists accounts_paid_entitlement_guard on public.accounts;
create policy accounts_paid_entitlement_guard
  on public.accounts as restrictive for all to authenticated
  using (user_id = (select auth.uid()) and (select public.current_user_has_billing_entitlement()))
  with check (user_id = (select auth.uid()) and (select public.current_user_has_billing_entitlement()));

drop policy if exists attachments_paid_entitlement_guard on public.account_trade_attachments;
create policy attachments_paid_entitlement_guard
  on public.account_trade_attachments as restrictive for all to authenticated
  using (user_id = (select auth.uid()) and (select public.current_user_has_billing_entitlement()))
  with check (user_id = (select auth.uid()) and (select public.current_user_has_billing_entitlement()));

-- Constrain only the trade-photos bucket; this leaves avatars and any unrelated
-- private storage policies unchanged.
drop policy if exists trade_photos_paid_entitlement_guard on storage.objects;
create policy trade_photos_paid_entitlement_guard
  on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'trade-photos' or (select public.current_user_has_billing_entitlement()))
  with check (bucket_id <> 'trade-photos' or (select public.current_user_has_billing_entitlement()));

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
  v_incoming_priority integer;
  v_previous_priority integer;
begin
  if p_event_type not in (
    'subscription.authenticated', 'subscription.activated', 'subscription.charged',
    'subscription.halted', 'subscription.paused', 'subscription.resumed',
    'subscription.updated', 'subscription.cancelled', 'subscription.completed',
    'subscription.pending'
  ) then
    return 'ignored';
  end if;

  if p_status not in ('created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'cancelled', 'completed', 'expired')
    or (p_event_type = 'subscription.authenticated' and p_status <> 'authenticated')
    or (p_event_type in ('subscription.activated', 'subscription.charged', 'subscription.resumed') and p_status <> 'active')
    or (p_event_type = 'subscription.halted' and p_status <> 'halted')
    or (p_event_type = 'subscription.paused' and p_status <> 'paused')
    or (p_event_type = 'subscription.cancelled' and p_status <> 'cancelled')
    or (p_event_type = 'subscription.completed' and p_status <> 'completed')
    or (p_event_type = 'subscription.pending' and p_status <> 'pending') then
    raise exception 'subscription event state mismatch';
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

  -- Record authenticated deliveries, including stale events, before discarding
  -- them. The insert and row update share this transaction.
  insert into public.razorpay_webhook_events(event_id, subscription_id, event_type, event_created_at)
    values (p_event_id, p_subscription_id, p_event_type, p_event_created_at)
    on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate';
  end if;

  -- A terminal provider state cannot be reopened by delayed activation/resume
  -- deliveries. Resume remains valid from paused/halted states.
  if v_subscription.status in ('cancelled', 'completed', 'expired')
    and p_status not in ('cancelled', 'completed', 'expired') then
    return 'stale';
  end if;
  if v_subscription.status = 'paused' and p_status = 'active'
    and p_event_type not in ('subscription.resumed', 'subscription.charged') then
    return 'stale';
  end if;

  v_incoming_priority := case p_event_type
    when 'subscription.cancelled' then 100
    when 'subscription.completed' then 100
    when 'subscription.resumed' then 90
    when 'subscription.charged' then 80
    when 'subscription.halted' then 70
    when 'subscription.paused' then 60
    when 'subscription.activated' then 50
    when 'subscription.updated' then case p_status
      when 'cancelled' then 100 when 'completed' then 100 when 'expired' then 100
      when 'active' then 50 when 'paused' then 60 when 'halted' then 70
      when 'authenticated' then 30 when 'pending' then 20 else 10 end
    when 'subscription.authenticated' then 30
    when 'subscription.pending' then 20
    else 10
  end;
  v_previous_priority := case coalesce(v_subscription.last_event_type, '')
    when 'subscription.cancelled' then 100
    when 'subscription.completed' then 100
    when 'subscription.resumed' then 90
    when 'subscription.charged' then 80
    when 'subscription.halted' then 70
    when 'subscription.paused' then 60
    when 'subscription.activated' then 50
    when 'subscription.updated' then case v_subscription.status
      when 'cancelled' then 100 when 'completed' then 100 when 'expired' then 100
      when 'active' then 50 when 'paused' then 60 when 'halted' then 70
      when 'authenticated' then 30 when 'pending' then 20 else 10 end
    when 'subscription.authenticated' then 30
    when 'subscription.pending' then 20
    else case v_subscription.status
      when 'cancelled' then 100 when 'completed' then 100 when 'expired' then 100
      when 'active' then 50 when 'paused' then 60 when 'halted' then 70
      when 'authenticated' then 30 when 'pending' then 20 else 10 end
  end;

  if p_event_created_at < coalesce(v_subscription.last_event_created_at, 0)
    or (p_event_created_at = v_subscription.last_event_created_at
      and (v_incoming_priority < v_previous_priority
        or (v_incoming_priority = v_previous_priority and p_status <> v_subscription.status))) then
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
    current_end = case
      when cancel_at_cycle_end and p_status not in ('cancelled', 'completed', 'expired')
        then least(current_end, coalesce(p_current_end, current_end))
      else coalesce(p_current_end, current_end)
    end,
    charge_at = coalesce(p_charge_at, charge_at),
    cancel_at_cycle_end = case
      when p_status in ('cancelled', 'completed', 'expired') then coalesce(p_cancel_at_cycle_end, cancel_at_cycle_end)
      when cancel_at_cycle_end then true
      else coalesce(p_cancel_at_cycle_end, cancel_at_cycle_end)
    end,
    last_event_created_at = p_event_created_at,
    last_event_type = p_event_type,
    updated_at = now()
  where id = v_subscription.id;
  return 'applied';
end;
$$;

create or replace function public.apply_razorpay_subscription_cancellation(
  p_subscription_id text,
  p_user_id uuid,
  p_status text,
  p_current_start bigint,
  p_current_end bigint,
  p_charge_at bigint,
  p_cancel_at_cycle_end boolean,
  p_action_at bigint
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.billing_subscriptions%rowtype;
begin
  if p_status not in ('active', 'authenticated', 'cancelled')
    or (p_status in ('active', 'authenticated') and p_cancel_at_cycle_end is distinct from true)
    or (p_status = 'cancelled' and p_cancel_at_cycle_end is distinct from false) then
    raise exception 'invalid provider cancellation state';
  end if;

  select * into v_subscription
    from public.billing_subscriptions
    where razorpay_subscription_id = p_subscription_id and user_id = p_user_id
    for update;
  if not found then
    raise exception 'subscription not found';
  end if;
  if v_subscription.status in ('cancelled', 'completed', 'expired') then
    return 'already_terminal';
  end if;

  update public.billing_subscriptions set
    status = p_status,
    current_start = coalesce(p_current_start, current_start),
    current_end = coalesce(p_current_end, current_end),
    charge_at = coalesce(p_charge_at, charge_at),
    cancel_at_cycle_end = p_cancel_at_cycle_end,
    last_event_created_at = greatest(coalesce(last_event_created_at, 0), p_action_at),
    last_event_type = case when p_status = 'cancelled' then 'subscription.cancelled' else last_event_type end,
    updated_at = now()
  where id = v_subscription.id;
  return 'applied';
end;
$$;

revoke all on function public.apply_razorpay_subscription_event(text, text, text, bigint, text, bigint, bigint, bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.apply_razorpay_subscription_event(text, text, text, bigint, text, bigint, bigint, bigint, boolean, text) to service_role;
revoke all on function public.apply_razorpay_subscription_cancellation(text, uuid, text, bigint, bigint, bigint, boolean, bigint) from public, anon, authenticated;
grant execute on function public.apply_razorpay_subscription_cancellation(text, uuid, text, bigint, bigint, bigint, boolean, bigint) to service_role;

notify pgrst, 'reload schema';
