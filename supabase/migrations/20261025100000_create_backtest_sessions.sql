create table if not exists public.backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  instruments text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  template_id text not null,
  template_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint backtest_sessions_date_order check (start_date <= end_date),
  constraint backtest_sessions_instruments_nonempty check (cardinality(instruments) > 0)
);

create index if not exists backtest_sessions_user_created_idx
  on public.backtest_sessions (user_id, created_at desc);

alter table public.backtest_sessions enable row level security;

create policy "Users can view their backtest sessions"
  on public.backtest_sessions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their backtest sessions"
  on public.backtest_sessions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their backtest sessions"
  on public.backtest_sessions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their backtest sessions"
  on public.backtest_sessions for delete to authenticated
  using (auth.uid() = user_id);
