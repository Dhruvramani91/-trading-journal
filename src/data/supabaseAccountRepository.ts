import type { Account, CreateAccountInput, UpdateAccountInput } from '@/domain/models/account';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type SupabaseAccountRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  account_size: number;
  rule_mode: string;
  profit_target: number | null;
  max_drawdown: number | null;
  consistency_limit: number | null;
  created_at: string;
  updated_at: string;
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

function toAccount(row: SupabaseAccountRow): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    accountType: row.account_type as Account['accountType'],
    accountSize: Number(row.account_size),
    ruleMode: row.rule_mode as Account['ruleMode'],
    profitTarget: row.profit_target == null ? null : Number(row.profit_target),
    maxDrawdown: row.max_drawdown == null ? null : Number(row.max_drawdown),
    consistencyLimit: row.consistency_limit == null ? null : Number(row.consistency_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: CreateAccountInput | UpdateAccountInput): Record<string, unknown> {
  const row: Record<string, unknown> = {
    name: input.name ?? undefined,
    profit_target: input.profitTarget ?? null,
    max_drawdown: input.maxDrawdown ?? null,
    consistency_limit: input.consistencyLimit ?? null,
  };
  const createInput = input as CreateAccountInput;
  if (createInput.accountType !== undefined) row.account_type = createInput.accountType;
  if (createInput.accountSize !== undefined) row.account_size = createInput.accountSize;
  if (createInput.ruleMode !== undefined) row.rule_mode = createInput.ruleMode;
  return row;
}

export const accountRepository = {
  async list(): Promise<Account[]> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase account list: ${error.message}`);
    }

    return (data ?? []).map((row) => toAccount(row as SupabaseAccountRow));
  },

  async get(id: string): Promise<Account | null> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase account get: ${error.message}`);
    }

    return data ? toAccount(data as SupabaseAccountRow) : null;
  },

  async create(input: CreateAccountInput): Promise<Account> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('accounts')
      .insert({
        user_id: userId,
        ...toRow(input),
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Supabase account create: ${error.message}`);
    }

    return toAccount(data as SupabaseAccountRow);
  },

  async update(id: string, patch: UpdateAccountInput): Promise<Account> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('accounts')
      .update(toRow(patch))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Supabase account update: ${error.message}`);
    }

    return toAccount(data as SupabaseAccountRow);
  },

  async remove(id: string): Promise<void> {
    const userId = await getUserId();

    const { error } = await supabase!
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Supabase account remove: ${error.message}`);
    }
  },
};
