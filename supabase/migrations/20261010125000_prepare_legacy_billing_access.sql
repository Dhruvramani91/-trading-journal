-- Snapshot existing Auth accounts before the later paid-data RLS migration.
-- This ensures existing users retain their workspace access during rollout.
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
