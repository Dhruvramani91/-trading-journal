alter table public.backtest_trades
  add column if not exists photos jsonb;

notify pgrst, 'reload schema';
