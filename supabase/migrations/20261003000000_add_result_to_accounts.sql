-- Migration: add missing result column to public.accounts
-- Safe / idempotent: does not delete data, does not recreate table.
-- Frontend sends `result` (active|passed|failed) but the original table
-- only had account_type/account_size/rule_mode/profit_target/max_drawdown
-- (+ phase from the previous migration).

-- 1. Add nullable text column (nullable so old rows keep working)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS result text;

-- 2. Backfill only NULL rows to a sensible default (Active)
UPDATE public.accounts
SET result = 'active'
WHERE result IS NULL;

-- 3. Validate allowed values: active, passed, failed (+ NULL for extra safety)
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_result_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_result_check
  CHECK (result IS NULL OR result IN ('active', 'passed', 'failed'));

-- 4. Document the column (kept separate from phase)
COMMENT ON COLUMN public.accounts.result IS 'Account result/outcome: active|passed|failed. Kept separate from phase (evaluation|funded|phase1|phase2).';

-- 5. Refresh PostgREST schema cache so `result` is recognised immediately.
NOTIFY pgrst, 'reload schema';
