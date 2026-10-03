-- Add the planned R:R column used by the trade repository.
-- Nullable so existing trades remain valid and continue to map to undefined.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS planned_rr numeric;

COMMENT ON COLUMN public.trades.planned_rr IS
  'Planned risk-to-reward multiple recorded at trade entry.';

-- Refresh PostgREST so the column is recognized by inserts and updates.
NOTIFY pgrst, 'reload schema';
