create table if not exists public.backtest_trades (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.backtest_sessions(id) on delete cascade,
  opened_at date not null,
  instrument text not null,
  direction text not null check (direction in ('long', 'short')),
  result text not null check (result in ('win', 'loss', 'be')),
  grade text check (grade is null or grade in ('A+', 'A', 'B', 'C')),
  realized_r numeric,
  pnl numeric,
  template_data jsonb not null default '{}'::jsonb,
  mistake text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backtest_trades_session_date_idx
  on public.backtest_trades (session_id, opened_at desc);

alter table public.backtest_trades enable row level security;

create policy "Users can view their backtest trades"
  on public.backtest_trades for select to authenticated
  using (exists (
    select 1 from public.backtest_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create policy "Users can create their backtest trades"
  on public.backtest_trades for insert to authenticated
  with check (exists (
    select 1 from public.backtest_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create policy "Users can update their backtest trades"
  on public.backtest_trades for update to authenticated
  using (exists (
    select 1 from public.backtest_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.backtest_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create policy "Users can delete their backtest trades"
  on public.backtest_trades for delete to authenticated
  using (exists (
    select 1 from public.backtest_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));
