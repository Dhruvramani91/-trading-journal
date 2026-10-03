import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);

  return {
    query,
    getUser: vi.fn(),
    from: vi.fn(() => query),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    from: supabaseMocks.from,
  },
  isSupabaseConfigured: true,
}));

import { tradeRepository } from './supabaseTradeRepository';

const USER_ID = '11111111-1111-4111-8111-111111111111';

const tradeRow = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: USER_ID,
  template_id: 'default',
  number: null,
  opened_at: '2026-01-01T12:00:00.000Z',
  closed_at: null,
  instrument: 'ES',
  direction: 'long',
  result: 'win',
  entry: 100,
  exit: 101,
  pnl: 25,
  r: 1,
  planned_rr: null,
  duration_min: 15,
  template_data: {},
  notes: null,
  photos: null,
  created_at: '2026-01-01T12:00:00.000Z',
  updated_at: '2026-01-01T12:00:00.000Z',
};

describe('supabaseTradeRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    supabaseMocks.query.update.mockReturnValue(supabaseMocks.query);
    supabaseMocks.query.eq.mockReturnValue(supabaseMocks.query);
    supabaseMocks.query.select.mockReturnValue(supabaseMocks.query);
  });

  it('rejects replaceAll before touching the database', async () => {
    await expect(tradeRepository.replaceAll([])).rejects.toThrow(
      /cannot run atomically and would risk wiping the journal/i,
    );
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('updates only the authenticated user’s row without a separate ownership read', async () => {
    supabaseMocks.query.maybeSingle.mockResolvedValue({
      data: { ...tradeRow, pnl: 30 },
      error: null,
    });
    const getSpy = vi.spyOn(tradeRepository, 'get');

    const updated = await tradeRepository.update(tradeRow.id, { pnl: 30 });

    expect(updated.pnl).toBe(30);
    expect(supabaseMocks.getUser).toHaveBeenCalledOnce();
    expect(supabaseMocks.from).toHaveBeenCalledWith('trades');
    expect(supabaseMocks.query.update).toHaveBeenCalledWith(
      expect.objectContaining({ pnl: 30, updated_at: expect.any(String) }),
    );
    expect(supabaseMocks.query.eq).toHaveBeenNthCalledWith(1, 'id', tradeRow.id);
    expect(supabaseMocks.query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
    expect(getSpy).not.toHaveBeenCalled();

    getSpy.mockRestore();
  });

  it('refuses to update a trade not owned by the authenticated user', async () => {
    supabaseMocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      tradeRepository.update(tradeRow.id, { pnl: 30 }),
    ).rejects.toThrow(`Trade ${tradeRow.id} not found`);

    expect(supabaseMocks.getUser).toHaveBeenCalledOnce();
    expect(supabaseMocks.query.eq).toHaveBeenNthCalledWith(1, 'id', tradeRow.id);
    expect(supabaseMocks.query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
  });
});
