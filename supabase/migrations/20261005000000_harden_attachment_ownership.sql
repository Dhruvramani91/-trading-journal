-- Prevent browser roles from truncating user data while preserving row CRUD.
REVOKE TRUNCATE ON TABLE
  public.trades,
  public.accounts,
  public.account_trade_attachments
FROM anon, authenticated;

-- Composite foreign keys below require unique keys on each parent pair.
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_id_user_id_key UNIQUE (id, user_id);

ALTER TABLE public.trades
  ADD CONSTRAINT trades_id_user_id_key UNIQUE (id, user_id);

-- The live audit found no existing ownership mismatches among 15 attachment
-- rows. NOT VALID installs enforcement for new writes immediately; validation
-- then confirms existing rows satisfy the ownership relationships.
ALTER TABLE public.account_trade_attachments
  ADD CONSTRAINT account_trade_attachments_account_user_fkey
  FOREIGN KEY (account_id, user_id)
  REFERENCES public.accounts (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.account_trade_attachments
  ADD CONSTRAINT account_trade_attachments_trade_user_fkey
  FOREIGN KEY (trade_id, user_id)
  REFERENCES public.trades (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.account_trade_attachments
  VALIDATE CONSTRAINT account_trade_attachments_account_user_fkey;

ALTER TABLE public.account_trade_attachments
  VALIDATE CONSTRAINT account_trade_attachments_trade_user_fkey;
