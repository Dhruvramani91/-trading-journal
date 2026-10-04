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

const TRADE_SUMMARY_PAGE_SIZE = 500;

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

    const rows: SupabaseTradeSummaryRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase!
        .from('trades')
        .select('id, pnl, opened_at')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + TRADE_SUMMARY_PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Supabase account trade summaries list: ${error.message}`);
      }

      const page = (data ?? []) as SupabaseTradeSummaryRow[];
      if (page.length === 0) break;

      rows.push(...page);
      offset += page.length;
    }

    return rows.map((row) => {
      return {
        id: row.id,
        pnl: row.pnl == null ? null : Number(row.pnl),
        openedAt: row.opened_at,
      };
    });
  },
};
