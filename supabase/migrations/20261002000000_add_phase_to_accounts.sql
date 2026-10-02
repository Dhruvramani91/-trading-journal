-- Migration: add missing phase column to public.accounts
-- Safe / idempotent: does not delete data, does not recreate table,
-- existing rows keep working with phase = NULL initially.

-- 1. Add nullable text column (nullable so old accounts keep working)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS phase text;

-- 2. Backfill only rows that still have NULL phase with a sensible default
--    based on account_type, so old accounts resolve to a valid phase.
--    Futures -> evaluation, CFD -> phase1. Only touches NULL rows.
UPDATE public.accounts
SET phase = CASE
  WHEN account_type = 'cfd' THEN 'phase1'
  ELSE 'evaluation'
END
WHERE phase IS NULL;

-- 3. Validate allowed values. A CHECK constraint that permits exactly:
--    evaluation, funded, phase1, phase2, funded (+ NULL for extra safety
--    on any legacy row that was not backfilled).
--    Drop first if re-running, then re-add.
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_phase_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_phase_check
  CHECK (phase IS NULL OR phase IN ('evaluation', 'funded', 'phase1', 'phase2'));

-- 4. Document the column
COMMENT ON COLUMN public.accounts.phase IS 'Account phase: futures=evaluation|funded, cfd=phase1|phase2|funded. Single phase field (no futures_phase/cfd_phase). Result (active|passed|failed) is stored separately in result.';

-- 5. Refresh PostgREST schema cache so `phase` is recognised immediately.
--    (Supabase runs this automatically on DDL via NOTIFY, but explicit notify is harmless.)
NOTIFY pgrst, 'reload schema';
