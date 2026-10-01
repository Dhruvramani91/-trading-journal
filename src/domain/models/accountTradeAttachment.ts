/**
 * Account Trade Attachment
 *
 * Connects an existing journal trade to a specific account.
 *
 * IMPORTANT:
 * A journal Trade and an AccountTradeAttachment are different things.
 *
 * The original trade remains unchanged.
 * The attachment stores account-specific values.
 */

export interface AccountTradeAttachment {
  /** Supabase attachment UUID */
  id: string;

  /** Account this trade is attached to */
  accountId: string;

  /** Original journal trade */
  tradeId: string;

  /** Supabase auth user UUID */
  userId: string;

  /**
   * Account-specific P&L.
   *
   * This can differ from the journal trade's P&L when
   * the same trade is used with different account sizing.
   */
  accountPnl: number | null;

  /**
   * Account-specific R.
   *
   * Kept separate from the journal trade's R.
   */
  accountR: number | null;

  /**
   * Optional quantity / position size used
   * for this particular account.
   */
  quantity: number | null;

  /** When this trade was attached to the account */
  attachedAt: string;
}

/**
 * Data required to attach a journal trade
 * to an account.
 */
export interface CreateAccountTradeAttachmentInput {
  accountId: string;
  tradeId: string;

  /**
   * Optional account-specific values.
   * These can be calculated or supplied later.
   */
  accountPnl?: number | null;
  accountR?: number | null;
  quantity?: number | null;
}

/**
 * Data that can be changed on an existing attachment.
 */
export interface UpdateAccountTradeAttachmentInput {
  accountPnl?: number | null;
  accountR?: number | null;
  quantity?: number | null;
}