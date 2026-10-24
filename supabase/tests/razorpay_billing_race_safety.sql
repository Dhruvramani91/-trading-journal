-- Run with `npx supabase test db` after applying local migrations.
-- Uses isolated synthetic Auth users and rolls the transaction back.
begin;

insert into auth.users (id, aud, role, email, encrypted_password)
values ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'billing-race-one@example.invalid', '')
on conflict (id) do nothing;
insert into auth.users (id, aud, role, email, encrypted_password)
values ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'billing-race-two@example.invalid', '')
on conflict (id) do nothing;

insert into public.billing_subscriptions (
  user_id, razorpay_subscription_id, plan_key, currency, razorpay_plan_id,
  trial_days, status, current_end
) values (
  'd1000000-0000-4000-8000-000000000001', 'sub_billing_race_one', 'monthly', 'INR', 'plan_TestPlan000001',
  7, 'created', 4000000000
);

insert into public.billing_subscriptions (
  user_id, razorpay_subscription_id, plan_key, currency, razorpay_plan_id,
  trial_days, trial_claimed_at, status, charge_at
) values (
  'd1000000-0000-4000-8000-000000000002', 'sub_billing_cancelled_trial', 'monthly', 'INR', 'plan_TestPlan000001',
  7, now(), 'cancelled', floor(extract(epoch from now()))::bigint + 86_400
);

do $$
declare
  v_result text;
  v_status text;
  v_events integer;
begin
  v_result := public.apply_razorpay_subscription_event(
    'evt_auth_100', 'sub_billing_race_one', 'subscription.authenticated', 100,
    'authenticated', null, null, 4000000000, false, 'plan_TestPlan000001'
  );
  if v_result <> 'applied' then raise exception 'expected authorization event to apply, got %', v_result; end if;

  -- Same-second lower-priority state must not overwrite authorization.
  v_result := public.apply_razorpay_subscription_event(
    'evt_pending_100', 'sub_billing_race_one', 'subscription.pending', 100,
    'pending', null, null, null, null, 'plan_TestPlan000001'
  );
  if v_result <> 'stale' then raise exception 'expected equal-time pending event to be stale, got %', v_result; end if;

  -- Equal timestamp higher-priority activation is deterministic and allowed.
  v_result := public.apply_razorpay_subscription_event(
    'evt_active_100', 'sub_billing_race_one', 'subscription.activated', 100,
    'active', null, 4000000000, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'applied' then raise exception 'expected equal-time activation to apply, got %', v_result; end if;

  v_result := public.apply_razorpay_subscription_event(
    'evt_active_100', 'sub_billing_race_one', 'subscription.activated', 100,
    'active', null, 4000000000, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'duplicate' then raise exception 'expected duplicate delivery to be ignored, got %', v_result; end if;

  -- Event ledger records a validly delivered event even when its state is stale.
  v_result := public.apply_razorpay_subscription_event(
    'evt_old_charge_99', 'sub_billing_race_one', 'subscription.charged', 99,
    'active', null, null, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'stale' then raise exception 'expected old charge event to be stale, got %', v_result; end if;
  select count(*) into v_events from public.razorpay_webhook_events where event_id = 'evt_old_charge_99';
  if v_events <> 1 then raise exception 'stale event was not recorded before discard'; end if;

  v_result := public.apply_razorpay_subscription_event(
    'evt_paused_101', 'sub_billing_race_one', 'subscription.paused', 101,
    'paused', null, null, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'applied' then raise exception 'expected pause event to apply, got %', v_result; end if;
  v_result := public.apply_razorpay_subscription_event(
    'evt_invalid_active_102', 'sub_billing_race_one', 'subscription.updated', 102,
    'active', null, 4000000000, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'stale' then raise exception 'expected invalid paused-to-active update to be rejected, got %', v_result; end if;
  v_result := public.apply_razorpay_subscription_event(
    'evt_resumed_102', 'sub_billing_race_one', 'subscription.resumed', 102,
    'active', null, 4000000000, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'applied' then raise exception 'expected legitimate resume to apply, got %', v_result; end if;

  v_result := public.apply_razorpay_subscription_cancellation(
    'sub_billing_race_one', 'd1000000-0000-4000-8000-000000000001', 'cancelled',
    null, null, null, false, 200
  );
  if v_result <> 'applied' then raise exception 'expected cancellation to apply, got %', v_result; end if;

  -- A webhook created before the cancellation action cannot reopen the row,
  -- even if its timestamp is newer than the last webhook timestamp.
  v_result := public.apply_razorpay_subscription_event(
    'evt_delayed_resume_150', 'sub_billing_race_one', 'subscription.resumed', 150,
    'active', null, 4000000000, null, false, 'plan_TestPlan000001'
  );
  if v_result <> 'stale' then raise exception 'delayed resume reopened cancellation: %', v_result; end if;

  select status into v_status from public.billing_subscriptions where razorpay_subscription_id = 'sub_billing_race_one';
  if v_status <> 'cancelled' then raise exception 'subscription ended in unexpected status %', v_status; end if;

  perform set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
  if public.current_user_has_billing_entitlement() then raise exception 'cancelled subscription still grants entitlement'; end if;

  perform set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
  if not public.current_user_has_billing_entitlement() then raise exception 'cancelled monthly trial lost access before its original end'; end if;
  update public.billing_subscriptions
    set charge_at = floor(extract(epoch from now()))::bigint - 1
    where razorpay_subscription_id = 'sub_billing_cancelled_trial';
  if public.current_user_has_billing_entitlement() then raise exception 'cancelled monthly trial retained access after its original end'; end if;
end;
$$;

rollback;
