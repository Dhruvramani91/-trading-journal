import type {
  AccountTradeAttachment,
  CreateAccountTradeAttachmentInput,
  UpdateAccountTradeAttachmentInput,
} from '@/domain/models/accountTradeAttachment';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type SupabaseAttachmentRow = {
  id: string;
  account_id: string;
  trade_id: string;
  user_id: string;
  account_pnl: number | null;
  account_r: number | null;
  quantity: number | null;
  attached_at: string;
};

function assertConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    );
  }
}

async function getUserId(): Promise<string> {
  assertConfigured();

  const { data, error } = await supabase!.auth.getUser();

  if (error) {
    throw new Error(`Supabase auth: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No authenticated user.');
  }

  return data.user.id;
}

function toAttachment(
  row: SupabaseAttachmentRow
): AccountTradeAttachment {
  return {
    id: row.id,
    accountId: row.account_id,
    tradeId: row.trade_id,
    userId: row.user_id,
    accountPnl:
      row.account_pnl == null
        ? null
        : Number(row.account_pnl),
    accountR:
      row.account_r == null
        ? null
        : Number(row.account_r),
    quantity:
      row.quantity == null
        ? null
        : Number(row.quantity),
    attachedAt: row.attached_at,
  };
}

export const accountTradeAttachmentRepository = {
  async listForAccount(
    accountId: string
  ): Promise<AccountTradeAttachment[]> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('account_trade_attachments')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .order('attached_at', {
        ascending: false,
      });

    if (error) {
      throw new Error(
        `Supabase account attachments list: ${error.message}`
      );
    }

    return (data ?? []).map((row) =>
      toAttachment(row as SupabaseAttachmentRow)
    );
  },

  async get(
    id: string
  ): Promise<AccountTradeAttachment | null> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('account_trade_attachments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Supabase account attachment get: ${error.message}`
      );
    }

    return data
      ? toAttachment(data as SupabaseAttachmentRow)
      : null;
  },

  async getForTrade(
    accountId: string,
    tradeId: string
  ): Promise<AccountTradeAttachment | null> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('account_trade_attachments')
      .select('*')
      .eq('account_id', accountId)
      .eq('trade_id', tradeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Supabase account attachment lookup: ${error.message}`
      );
    }

    return data
      ? toAttachment(data as SupabaseAttachmentRow)
      : null;
  },

  async create(
    input: CreateAccountTradeAttachmentInput
  ): Promise<AccountTradeAttachment> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('account_trade_attachments')
      .insert({
        account_id: input.accountId,
        trade_id: input.tradeId,
        user_id: userId,

        account_pnl: input.accountPnl ?? null,
        account_r: input.accountR ?? null,
        quantity: input.quantity ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(
        `Supabase account attachment create: ${error.message}`
      );
    }

    return toAttachment(
      data as SupabaseAttachmentRow
    );
  },

  async update(
    id: string,
    patch: UpdateAccountTradeAttachmentInput
  ): Promise<AccountTradeAttachment> {
    const userId = await getUserId();

    const existing = await this.get(id);

    if (!existing) {
      throw new Error(
        `Account trade attachment ${id} not found`
      );
    }

    const { data, error } = await supabase!
      .from('account_trade_attachments')
      .update({
        account_pnl:
          patch.accountPnl !== undefined
            ? patch.accountPnl
            : existing.accountPnl,

        account_r:
          patch.accountR !== undefined
            ? patch.accountR
            : existing.accountR,

        quantity:
          patch.quantity !== undefined
            ? patch.quantity
            : existing.quantity,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw new Error(
        `Supabase account attachment update: ${error.message}`
      );
    }

    return toAttachment(
      data as SupabaseAttachmentRow
    );
  },

  async remove(id: string): Promise<void> {
    const userId = await getUserId();

    const { error } = await supabase!
      .from('account_trade_attachments')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(
        `Supabase account attachment remove: ${error.message}`
      );
    }
  },

  async removeForTrade(
    accountId: string,
    tradeId: string
  ): Promise<void> {
    const userId = await getUserId();

    const { error } = await supabase!
      .from('account_trade_attachments')
      .delete()
      .eq('account_id', accountId)
      .eq('trade_id', tradeId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(
        `Supabase account attachment remove: ${error.message}`
      );
    }
  },
};