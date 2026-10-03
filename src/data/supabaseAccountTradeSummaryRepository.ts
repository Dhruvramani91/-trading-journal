import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AccountTradeSummary {
  id: string;
  pnl: number | null;
  openedAt: string;
}

type SupabaseTradeSummaryRow = {
  id: string;
  pnl: number | null;
  opened_at: string;
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

export const accountTradeSummaryRepository = {
  async listForAccountSummaries(
    authenticatedUserId?: string,
  ): Promise<AccountTradeSummary[]> {
    if (authenticatedUserId !== undefined) assertConfigured();
    const userId = authenticatedUserId ?? await getUserId();
    if (!userId) throw new Error('No authenticated user.');

    const { data, error } = await supabase!
      .from('trades')
      .select('id, pnl, opened_at')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase account trade summaries list: ${error.message}`);
    }

    return (data ?? []).map((row) => {
      const trade = row as SupabaseTradeSummaryRow;
      return {
        id: trade.id,
        pnl: trade.pnl == null ? null : Number(trade.pnl),
        openedAt: trade.opened_at,
      };
    });
  },
};
