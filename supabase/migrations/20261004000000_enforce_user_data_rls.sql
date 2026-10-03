-- Restrict browser-accessible user data to its owning Supabase Auth user.
-- The matching restrictive policies remain an AND gate even if another
-- permissive policy is added later. The permissive policies below ensure
-- authenticated owners retain normal CRUD access.

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_trade_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY trades_owner_access
  ON public.trades
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY trades_owner_guard
  ON public.trades
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY accounts_owner_access
  ON public.accounts
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY accounts_owner_guard
  ON public.accounts
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY account_trade_attachments_owner_access
  ON public.account_trade_attachments
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY account_trade_attachments_owner_guard
  ON public.account_trade_attachments
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
