import type { BacktestSession, BacktestTrade, BacktestTradeInput, CreateBacktestSessionInput } from '@/domain/models/backtestSession';
import { supabase } from '@/lib/supabase';
import { deleteTradePhotosForTrade, persistEditedTradePhotos, persistTradePhotos, type TradePhotos } from '@/lib/tradePhotos';

const LOCAL_KEY = 'backtest.sessions.v1';
const LOCAL_TRADES_KEY = 'backtest.trades.v1';

function localSessions(): BacktestSession[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as BacktestSession[]; }
  catch { return []; }
}

function fromRow(row: Record<string, unknown>): BacktestSession {
  return {
    id: String(row.id),
    name: String(row.name),
    instruments: Array.isArray(row.instruments) ? row.instruments.map(String) : [],
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    templateId: String(row.template_id),
    templateSnapshot: row.template_snapshot as BacktestSession['templateSnapshot'],
    createdAt: String(row.created_at),
  };
}

export async function listBacktestSessions(): Promise<BacktestSession[]> {
  if (!supabase) return localSessions().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { data, error } = await supabase.from('backtest_sessions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load backtest sessions: ${error.message}`);
  return (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
}

export async function createBacktestSession(input: CreateBacktestSessionInput): Promise<BacktestSession> {
  const session: BacktestSession = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    instruments: [...input.instruments],
    startDate: input.startDate,
    endDate: input.endDate,
    templateId: input.template.id,
    templateSnapshot: structuredClone(input.template),
    createdAt: new Date().toISOString(),
  };

  if (!supabase) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([session, ...localSessions()]));
    return session;
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sign in to create a backtest session.');
  const { data, error } = await supabase.from('backtest_sessions').insert({
    user_id: user.id,
    name: session.name,
    instruments: session.instruments,
    start_date: session.startDate,
    end_date: session.endDate,
    template_id: session.templateId,
    template_snapshot: session.templateSnapshot,
  }).select('*').single();
  if (error) throw new Error(`Could not create backtest session: ${error.message}`);
  return fromRow(data as Record<string, unknown>);
}

export async function updateBacktestSession(sessionId: string, input: CreateBacktestSessionInput): Promise<BacktestSession> {
  if (!supabase) {
    const sessions = localSessions();
    const existing = sessions.find((session) => session.id === sessionId);
    if (!existing) throw new Error('Backtest session not found.');
    const updated: BacktestSession = {
      ...existing,
      name: input.name.trim(),
      instruments: [...input.instruments],
      startDate: input.startDate,
      endDate: input.endDate,
      templateId: input.template.id,
      templateSnapshot: structuredClone(input.template),
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions.map((session) => session.id === sessionId ? updated : session)));
    return updated;
  }

  const { data, error } = await supabase.from('backtest_sessions').update({
    name: input.name.trim(),
    instruments: [...input.instruments],
    start_date: input.startDate,
    end_date: input.endDate,
    template_id: input.template.id,
    template_snapshot: input.template,
  }).eq('id', sessionId).select('*').single();
  if (error) throw new Error(`Could not update backtest session: ${error.message}`);
  return fromRow(data as Record<string, unknown>);
}

function localTrades(): BacktestTrade[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_TRADES_KEY) ?? '[]') as BacktestTrade[]; }
  catch { return []; }
}

function fromTradeRow(row: Record<string, unknown>): BacktestTrade {
  return {
    id: String(row.id), sessionId: String(row.session_id), openedAt: String(row.opened_at),
    instrument: String(row.instrument), direction: row.direction as BacktestTrade['direction'],
    result: row.result as BacktestTrade['result'], grade: row.grade as BacktestTrade['grade'],
    realizedR: row.realized_r == null ? undefined : Number(row.realized_r),
    pnl: row.pnl == null ? undefined : Number(row.pnl),
    templateData: (row.template_data ?? {}) as BacktestTrade['templateData'],
    photos: (row.photos ?? undefined) as TradePhotos | undefined,
    mistake: typeof row.mistake === 'string' ? row.mistake : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    createdAt: String(row.created_at),
  };
}

export async function listBacktestTrades(sessionId: string): Promise<BacktestTrade[]> {
  if (!supabase) return localTrades().filter((trade) => trade.sessionId === sessionId).sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const { data, error } = await supabase.from('backtest_trades').select('*').eq('session_id', sessionId).order('opened_at', { ascending: false });
  if (error) throw new Error(`Could not load backtest trades: ${error.message}`);
  return (data ?? []).map((row) => fromTradeRow(row as Record<string, unknown>));
}

function tradeToRow(sessionId: string, input: BacktestTradeInput) {
  return {
    session_id: sessionId, opened_at: input.openedAt, instrument: input.instrument,
    direction: input.direction, result: input.result, grade: input.grade ?? null,
    realized_r: input.realizedR ?? null, pnl: input.pnl ?? null,
    template_data: input.templateData, mistake: input.mistake ?? null, notes: input.notes ?? null,
  };
}

export async function saveBacktestTrade(sessionId: string, input: BacktestTradeInput, tradeId?: string): Promise<BacktestTrade> {
  if (!supabase) {
    const previous = localTrades();
    const existing = tradeId ? previous.find((trade) => trade.id === tradeId) : undefined;
    const saved: BacktestTrade = { ...input, id: existing?.id ?? crypto.randomUUID(), sessionId, createdAt: existing?.createdAt ?? new Date().toISOString() };
    localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify([saved, ...previous.filter((trade) => trade.id !== saved.id)]));
    return saved;
  }
  const row = tradeToRow(sessionId, input);
  let id = tradeId;
  let previousPhotos: TradePhotos | undefined;
  if (tradeId) {
    const { data: existing, error: loadError } = await supabase.from('backtest_trades').select('photos').eq('id', tradeId).eq('session_id', sessionId).single();
    if (loadError) throw new Error(`Could not load backtest trade: ${loadError.message}`);
    previousPhotos = existing.photos as TradePhotos | undefined;
    const { error } = await supabase.from('backtest_trades').update(row).eq('id', tradeId).eq('session_id', sessionId);
    if (error) throw new Error(`Could not save backtest trade: ${error.message}`);
  } else {
    id = crypto.randomUUID();
    const { error } = await supabase.from('backtest_trades').insert({ id, ...row });
    if (error) throw new Error(`Could not save backtest trade: ${error.message}`);
  }

  const persistPhotos = async (photos: TradePhotos) => {
    const { error } = await supabase!.from('backtest_trades').update({ photos }).eq('id', id!).eq('session_id', sessionId);
    if (error) throw new Error(`Could not save backtest images: ${error.message}`);
  };
  const photos = tradeId
    ? await persistEditedTradePhotos(id!, previousPhotos, input.photos, persistPhotos)
    : await persistTradePhotos(id!, input.photos).then(async (saved) => { await persistPhotos(saved); return saved; });
  return { ...input, id: id!, sessionId, createdAt: new Date().toISOString(), photos };
}

export async function deleteBacktestTrade(sessionId: string, tradeId: string): Promise<void> {
  if (!supabase) {
    localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(localTrades().filter((trade) => trade.id !== tradeId)));
    return;
  }
  const { data: row, error: readError } = await supabase.from('backtest_trades').select('photos').eq('id', tradeId).eq('session_id', sessionId).maybeSingle();
  if (readError) throw new Error(`Could not load backtest images: ${readError.message}`);
  const { error } = await supabase.from('backtest_trades').delete().eq('id', tradeId).eq('session_id', sessionId);
  if (error) throw new Error(`Could not delete backtest trade: ${error.message}`);
  await deleteTradePhotosForTrade(tradeId, row?.photos as TradePhotos | undefined);
}

export async function deleteBacktestSession(sessionId: string): Promise<void> {
  if (!supabase) {
    const sessions = localSessions().filter((session) => session.id !== sessionId);
    const trades = localTrades().filter((trade) => trade.sessionId !== sessionId);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions));
    localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(trades));
    return;
  }

  const { data: rows, error: loadError } = await supabase.from('backtest_trades').select('id,photos').eq('session_id', sessionId);
  if (loadError) throw new Error(`Could not load session images: ${loadError.message}`);
  await Promise.all((rows ?? []).map((row) => deleteTradePhotosForTrade(String(row.id), row.photos as TradePhotos | undefined)));

  const { error } = await supabase.from('backtest_sessions').delete().eq('id', sessionId);
  if (error) throw new Error(`Could not delete backtest session: ${error.message}`);
}
