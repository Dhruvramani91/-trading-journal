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
  r: number;
  planned_rr: number | null;
  duration_min: number;
  template_data: Record<string, string | number | boolean | null | undefined>;
  notes: string | null;
  photos: { htf?: string; itf?: string; ltf?: string } | null;
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

  if (error) throw new Error(`Supabase auth: ${error.message}`);

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
    r: input.r,
    planned_rr: input.plannedRR ?? null,
    duration_min: input.durationMin ?? 0,
    template_data: input.templateData ?? {},
    notes: input.notes ?? null,
    photos: input.photos ?? null,
  };
}

export const tradeRepository: TradeRepository = {
  async list(): Promise<Trade[]> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });

    if (error) throw new Error(`Supabase list: ${error.message}`);

    return (data ?? []).map((row) =>
      toTrade(row as SupabaseTradeRow)
    );
  },

  async get(id: string): Promise<Trade | null> {
    const userId = await getUserId();

    const { data, error } = await supabase!
      .from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Supabase get: ${error.message}`);

    return data ? toTrade(data as SupabaseTradeRow) : null;
  },

  async create(
    input: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Trade> {
    const userId = await getUserId();

    // PostgreSQL generates the UUID, created_at and updated_at.
    const { data, error } = await supabase!
      .from('trades')
      .insert({
        user_id: userId,
        ...toRow(input),
      })
      .select('*')
      .single();

    if (error) throw new Error(`Supabase create: ${error.message}`);

    return toTrade(data as SupabaseTradeRow);
  },

  async update(
    id: string,
    patch: Partial<Trade>
  ): Promise<Trade> {
    const userId = await getUserId();

    const existing = await this.get(id);

    if (!existing) {
      throw new Error(`Trade ${id} not found`);
    }

    const merged = {
      ...existing,
      ...patch,
    };

    const { data, error } = await supabase!
      .from('trades')
      .update({
        template_id: merged.templateId,
        number: merged.number ?? null,
        opened_at: merged.openedAt,
        closed_at: merged.closedAt ?? null,
        instrument: merged.instrument,
        direction: merged.direction,
        result: merged.result,
        r: merged.r,
        planned_rr: merged.plannedRR ?? null,
        duration_min: merged.durationMin ?? 0,
        template_data: merged.templateData ?? {},
        notes: merged.notes ?? null,
        photos: merged.photos ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw new Error(`Supabase update: ${error.message}`);

    return toTrade(data as SupabaseTradeRow);
  },

  async remove(id: string): Promise<void> {
    const userId = await getUserId();

    const { error } = await supabase!
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Supabase remove: ${error.message}`);
  },

  async replaceAll(trades: Trade[]): Promise<void> {
    const userId = await getUserId();

    const { error: deleteError } = await supabase!
      .from('trades')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(
        `Supabase replaceAll delete: ${deleteError.message}`
      );
    }

    if (trades.length === 0) return;

    const rows = trades.map((trade) => ({
      id: trade.id,
      user_id: userId,
      template_id: trade.templateId,
      number: trade.number ?? null,
      opened_at: trade.openedAt,
      closed_at: trade.closedAt ?? null,
      instrument: trade.instrument,
      direction: trade.direction,
      result: trade.result,
      r: trade.r,
      planned_rr: trade.plannedRR ?? null,
      duration_min: trade.durationMin ?? 0,
      template_data: trade.templateData ?? {},
      notes: trade.notes ?? null,
      photos: trade.photos ?? null,
      created_at: trade.createdAt,
      updated_at: trade.updatedAt,
    }));

    const { error } = await supabase!
      .from('trades')
      .insert(rows);

    if (error) {
      throw new Error(
        `Supabase replaceAll insert: ${error.message}`
      );
    }
  },
};