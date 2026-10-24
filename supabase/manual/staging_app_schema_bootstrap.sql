-- MANUAL, STAGING ONLY: bootstrap the current app tables before applying
-- 20261010130000_billing_access_and_race_safety.sql to a fresh test project.
-- This creates schema and owner-scoped policies only; it copies no user data.
-- Do not run against the production project.

begin;

do $$
begin
  if to_regclass('public.accounts') is not null
     or to_regclass('public.trades') is not null
     or to_regclass('public.account_trade_attachments') is not null then
    raise exception 'Refusing bootstrap: one or more app tables already exist';
  end if;
end;
$$;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null,
  account_size numeric not null,
  rule_mode text not null default 'standard' check (rule_mode in ('standard', 'custom')),
  profit_target numeric,
  max_drawdown numeric,
  consistency_limit numeric,
  phase text check (phase is null or phase in ('evaluation', 'funded', 'phase1', 'phase2')),
  result text check (result is null or result in ('active', 'passed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_type_check check (account_type in ('futures', 'cfd')),
  constraint accounts_size_check check (account_size > 0),
  constraint accounts_id_user_id_key unique (id, user_id)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  template_data jsonb not null default '{}'::jsonb,
  instrument text not null,
  direction text not null check (direction in ('long', 'short')),
  result text not null check (result in ('win', 'loss', 'be')),
  opened_at timestamptz not null,
  closed_at timestamptz,
  duration_min integer not null default 0,
  entry numeric,
  exit numeric,
  r numeric not null,
  pnl numeric,
  planned_rr numeric,
  number integer,
  notes text,
  photos jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_id_user_id_key unique (id, user_id),
  constraint trades_duration_check check (duration_min >= 0)
);

create table public.account_trade_attachments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  trade_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  quantity numeric,
  account_r numeric,
  account_pnl numeric,
  attached_at timestamptz not null default now(),
  constraint account_trade_unique unique (account_id, trade_id),
  constraint account_trade_account_fkey
    foreign key (account_id) references public.accounts(id) on delete cascade,
  constraint account_trade_trade_fkey
    foreign key (trade_id) references public.trades(id) on delete cascade,
  constraint account_trade_account_user_fkey
    foreign key (account_id, user_id) references public.accounts(id, user_id) on delete cascade,
  constraint account_trade_trade_user_fkey
    foreign key (trade_id, user_id) references public.trades(id, user_id) on delete cascade
);

create index accounts_user_id_idx on public.accounts using btree (user_id);
create index accounts_user_type_idx on public.accounts using btree (user_id, account_type);
create index trades_template_id_idx on public.trades using btree (template_id);
create index trades_user_id_idx on public.trades using btree (user_id);
create index trades_user_opened_at_idx on public.trades using btree (user_id, opened_at desc);
create index account_trade_account_idx on public.account_trade_attachments using btree (account_id);
create index account_trade_trade_idx on public.account_trade_attachments using btree (trade_id);
create index account_trade_user_idx on public.account_trade_attachments using btree (user_id);

alter table public.accounts enable row level security;
alter table public.trades enable row level security;
alter table public.account_trade_attachments enable row level security;

-- These permissive owner policies preserve normal CRUD for each user's rows.
create policy accounts_owner_access on public.accounts
  as permissive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy trades_owner_access on public.trades
  as permissive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy account_trade_attachments_owner_access on public.account_trade_attachments
  as permissive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Preserve the owner-only restrictive layer used by the existing project.
create policy accounts_owner_guard on public.accounts
  as restrictive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy trades_owner_guard on public.trades
  as restrictive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy account_trade_attachments_owner_guard on public.account_trade_attachments
  as restrictive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke truncate on table
  public.accounts,
  public.trades,
  public.account_trade_attachments
from anon, authenticated;
grant select, insert, update, delete on table
  public.accounts,
  public.trades,
  public.account_trade_attachments
to authenticated;

comment on column public.accounts.phase is
  'Account phase: futures=evaluation|funded, cfd=phase1|phase2|funded. Single phase field (no futures_phase/cfd_phase). Result (active|passed|failed) is stored separately in result.';
comment on column public.accounts.result is
  'Account result/outcome: active|passed|failed. Kept separate from phase (evaluation|funded|phase1|phase2).';
comment on column public.trades.planned_rr is
  'Planned risk-to-reward multiple recorded at trade entry.';

notify pgrst, 'reload schema';
commit;
