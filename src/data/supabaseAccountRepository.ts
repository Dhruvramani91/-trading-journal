import type { Account, AccountRuleMode, CreateAccountInput, UpdateAccountInput, AccountResult } from '@/domain/models/account';
import { isValidAccountPhase, resolveAccountRules } from '@/domain/accounts/accountCalculations';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type SupabaseAccountRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  phase: string | null;
  result: string;
  account_size: number;
  rule_mode: string;
  profit_target: number | null;
  max_drawdown: number | null;
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

function resolvePhase(row: SupabaseAccountRow): Account['phase'] {
  const raw = row.phase;
  const accountType = row.account_type as Account['accountType'];
  // Old accounts created before the phase feature have phase = NULL.
  // Fall back to a valid default per account type so they keep loading.
  if (raw == null) {
    return accountType === 'cfd' ? 'phase1' : 'evaluation';
  }
  // Defensive: coerce any unexpected DB value to a valid phase for its type.
  if (accountType === 'futures') {
    return raw === 'funded' ? 'funded' : 'evaluation';
  }
  if (raw === 'phase1' || raw === 'phase2' || raw === 'funded') {
    return raw;
  }
  return 'phase1';
}

function toAccount(row: SupabaseAccountRow): Account {
  const accountType = row.account_type as Account['accountType'];
  const phase = resolvePhase(row);
  const accountSize = Number(row.account_size);
  const ruleMode = row.rule_mode as AccountRuleMode;

  const storedProfitTarget =
    row.profit_target == null ? null : Number(row.profit_target);
  const storedMaxDrawdown =
    row.max_drawdown == null ? null : Number(row.max_drawdown);

  // Standard accounts fall back to the configured domain defaults when the
  // stored rule columns are NULL (e.g. legacy rows created before the defaults
  // were persisted). Custom accounts keep exactly what was stored — existing
  // custom rules are never overwritten by this read-time resolution.
  const rules = resolveAccountRules(
    accountType,
    accountSize,
    phase,
    ruleMode,
    storedProfitTarget,
    storedMaxDrawdown
  );

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    accountType,
    phase,
    result: row.result as AccountResult,
    accountSize,
    ruleMode,
    profitTarget: rules.profitTarget,
    maxDrawdown: rules.maxDrawdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: CreateAccountInput | UpdateAccountInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (input.name !== undefined) row.name = input.name;

  // Only write rule columns when the caller explicitly supplied them, so a
  // partial update (e.g. renaming an account) never nulls out saved rules.
  if ('profitTarget' in input) row.profit_target = input.profitTarget ?? null;
  if ('maxDrawdown' in input) row.max_drawdown = input.maxDrawdown ?? null;

  const createInput = input as CreateAccountInput;
  if (createInput.accountType !== undefined) row.account_type = createInput.accountType;
  if (createInput.phase !== undefined) row.phase = createInput.phase;
  if (createInput.result !== undefined) row.result = createInput.result;
  if (createInput.accountSize !== undefined) row.account_size = createInput.accountSize;
  if (createInput.ruleMode !== undefined) row.rule_mode = createInput.ruleMode;
  return row;
}

async function listForUserId(userId: string): Promise<Account[]> {
  const { data, error } = await supabase!
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Supabase account list: ${error.message}`);
  }

  return (data ?? []).map((row) => toAccount(row as SupabaseAccountRow));
}

export const accountRepository = {
  async list(): Promise<Account[]> {
    const userId = await getUserId();
    return listForUserId(userId);
  },

  // The supplied ID is an additional query filter from the authenticated app
  // state. Supabase RLS remains the authorization boundary for this read.
  async listForUser(userId: string): Promise<Account[]> {
    assertConfigured();
    if (!userId) throw new Error('No authenticated user.');
    return listForUserId(userId);
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

    // Domain validation: futures=evaluation|funded, cfd=phase1|phase2|funded.
    if (!isValidAccountPhase(input.accountType, input.phase)) {
      throw new Error(`Invalid phase "${input.phase}" for account type "${input.accountType}".`);
    }

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

    // Validate phase combinations when both type and phase are being changed.
    // Full cross-check against the stored type happens in the form layer,
    // which always sends accountType + phase together on edit.
    if (patch.accountType !== undefined && patch.phase !== undefined) {
      if (!isValidAccountPhase(patch.accountType, patch.phase)) {
        throw new Error(`Invalid phase "${patch.phase}" for account type "${patch.accountType}".`);
      }
    }

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
