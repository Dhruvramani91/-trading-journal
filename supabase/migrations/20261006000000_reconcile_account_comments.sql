COMMENT ON COLUMN public.accounts.phase IS 'Account phase: futures=evaluation|funded, cfd=phase1|phase2|funded. Single phase field (no futures_phase/cfd_phase). Result (active|passed|failed) is stored separately in result.';

COMMENT ON COLUMN public.accounts.result IS 'Account result/outcome: active|passed|failed. Kept separate from phase (evaluation|phase1|phase2|phase2|funded).';
