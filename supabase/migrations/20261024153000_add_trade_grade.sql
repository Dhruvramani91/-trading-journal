alter table public.trades
  add column if not exists grade text
    check (grade in ('A+', 'A', 'B', 'C'));

comment on column public.trades.grade is
  'Optional trader-assigned execution grade: A+, A, B, or C.';
