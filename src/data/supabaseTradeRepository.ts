import type { Trade } from '@/domain/models/trade';
import type { TradeRepository } from './repository';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type SupabaseTradeRow = {
  id: string;
  user_id: string;
  template_id: string;
  number: number | null;
  opened_at: string;
  closed_at: string | null;
  instrument: string;
  direction: string;
  result: string;

  entry: number | null;
  exit: number | null;
  pnl: number | null;

  r: number;
  planned_rr: number | null;
  duration_min: number;

  template_data: Record<
    string,
    string | number | boolean | null | undefined
  >;

  notes: string | null;

  photos: {
    htf?: string;
    itf?: string;
    ltf?: string;
  } | null;

  created_at: string;
  updated_at: string;
};

const TRADE_LIST_PAGE_SIZE = 500;

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

function toTrade(row: SupabaseTradeRow): Trade {
  return {
    id: row.id,

    templateId: row.template_id,

    number: row.number ?? undefined,

    openedAt: row.opened_at,

    closedAt: row.closed_at ?? undefined,

    instrument: row.instrument,

    direction: row.direction as Trade['direction'],

    result: row.result as Trade['result'],

    entry: row.entry == null ? undefined : Number(row.entry),

    exit: row.exit == null ? undefined : Number(row.exit),

    pnl: row.pnl == null ? undefined : Number(row.pnl),

    r: Number(row.r),

    plannedRR:
      row.planned_rr == null ? undefined : Number(row.planned_rr),

    durationMin: Number(row.duration_min ?? 0),

    templateData: row.template_data ?? {},

    notes: row.notes ?? undefined,

    photos: row.photos ?? undefined,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

function toRow(
  input: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>
) {
  return {
    template_id: input.templateId,

    number: input.number ?? null,

    opened_at: input.openedAt,

    closed_at: input.closedAt ?? null,

    instrument: input.instrument,

    direction: input.direction,

    result: input.result,

    entry: input.entry ?? null,

    exit: input.exit ?? null,

    pnl: input.pnl ?? null,

    r: input.r,

    planned_rr: input.plannedRR ?? null,

    duration_min: input.durationMin ?? 0,

    template_data: input.templateData ?? {},

    notes: input.notes ?? null,

    photos: input.photos ?? null,
  };
}

function toPatchRow(patch: Partial<Trade>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if ('templateId' in patch) row.template_id = patch.templateId;
  if ('number' in patch) row.number = patch.number ?? null;
  if ('openedAt' in patch) row.opened_at = patch.openedAt;
  if ('closedAt' in patch) row.closed_at = patch.closedAt ?? null;
  if ('instrument' in patch) row.instrument = patch.instrument;
  if ('direction' in patch) row.direction = patch.direction;
  if ('result' in patch) row.result = patch.result;
  if ('entry' in patch) row.entry = patch.entry ?? null;
  if ('exit' in patch) row.exit = patch.exit ?? null;
  if ('pnl' in patch) row.pnl = patch.pnl ?? null;
  if ('r' in patch) row.r = patch.r;
  if ('plannedRR' in patch) row.planned_rr = patch.plannedRR ?? null;
  if ('durationMin' in patch) row.duration_min = patch.durationMin ?? 0;
  if ('templateData' in patch) row.template_data = patch.templateData ?? {};
  if ('notes' in patch) row.notes = patch.notes ?? null;
  if ('photos' in patch) row.photos = patch.photos ?? null;

  row.updated_at = new Date().toISOString();
  return row;
}

export const tradeRepository: TradeRepository = {
  async list(): Promise<Trade[]> {
    const userId = await getUserId();
    const rows: SupabaseTradeRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase!
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + TRADE_LIST_PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Supabase list: ${error.message}`);
      }

      const page = (data ?? []) as SupabaseTradeRow[];
      if (page.length === 0) break;

      rows.push(...page);
      // Advance by the number actually returned, so a server-side row cap
      // smaller than the requested range cannot cause rows to be skipped.
      offset += page.length;
    }

    return rows.map(toTrade);
  },

  async get(id: string): Promise<Trade | null> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase get: ${error.message}`);
    }

    return data
      ? toTrade(data as SupabaseTradeRow)
      : null;
  },

  async create(
    input: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Trade> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('trades')
      .insert({
        user_id: userId,
        ...toRow(input),
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Supabase create: ${error.message}`);
    }

    return toTrade(data as SupabaseTradeRow);
  },

  async update(
    id: string,
    patch: Partial<Trade>
  ): Promise<Trade> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('trades')
      .update(toPatchRow(patch))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase update: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Trade ${id} not found`);
    }

    return toTrade(data as SupabaseTradeRow);
  },

  async remove(id: string): Promise<void> {
    const userId = await getUserId();

    const { error } = await supabase!
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Supabase remove: ${error.message}`);
    }
  },

  /**
   * @deprecated Deliberately neutralized.
   *
   * The previous implementation deleted EVERY one of the user's trades and then
   * re-inserted them. The Supabase JS client cannot run a multi-statement
   * transaction, so any failure during the re-insert would have silently left
   * the user's journal wiped out.
   *
   * Nothing in the app calls `replaceAll`, so the destructive path has been
   * removed rather than kept as dangerous dead functionality. Calling it now
   * fails fast, before any database request is made.
   *
   * RLS / user-ownership protections on the `trades` table are untouched.
   */
  async replaceAll(_trades: Trade[]): Promise<void> {
    throw new Error(
      'replaceAll() is not supported: it cannot run atomically and would risk wiping the journal.'
    );
  },
};
