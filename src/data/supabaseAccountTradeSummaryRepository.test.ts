import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetUser,
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockRange,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockRange: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
  isSupabaseConfigured: true,
}));

import { accountTradeSummaryRepository } from './supabaseAccountTradeSummaryRepository';

describe('accountTradeSummaryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ order: mockOrder, range: mockRange });
    mockRange.mockResolvedValue({ data: [], error: null });
  });

  it('requests only the account-summary fields and maps them', async () => {
    mockRange.mockResolvedValueOnce({
      data: [{ id: 'trade-1', pnl: '1250.5', opened_at: '2026-01-02T12:00:00Z' }],
      error: null,
    });

    await expect(
      accountTradeSummaryRepository.listForAccountSummaries(),
    ).resolves.toEqual([
      { id: 'trade-1', pnl: 1250.5, openedAt: '2026-01-02T12:00:00Z' },
    ]);

    expect(mockFrom).toHaveBeenCalledWith('trades');
    expect(mockSelect).toHaveBeenCalledWith('id, pnl, opened_at');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockOrder).toHaveBeenCalledWith('opened_at', { ascending: false });
    expect(mockOrder).toHaveBeenCalledWith('id', { ascending: true });
    expect(mockRange).toHaveBeenNthCalledWith(1, 0, 499);
    expect(mockRange).toHaveBeenNthCalledWith(2, 1, 500);
  });

  it('uses an authenticated app user ID as a read filter without a duplicate Auth lookup', async () => {
    await accountTradeSummaryRepository.listForAccountSummaries('user-2');

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-2');
  });

  it('surfaces query errors', async () => {
    mockRange.mockResolvedValue({ data: null, error: { message: 'query failed' } });

    await expect(
      accountTradeSummaryRepository.listForAccountSummaries(),
    ).rejects.toThrow('Supabase account trade summaries list: query failed');
  });

  it('combines every page of account trade summaries', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `trade-${index}`,
      pnl: index,
      opened_at: '2026-01-02T12:00:00Z',
    }));
    mockRange
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'trade-500', pnl: 500, opened_at: '2026-01-03T12:00:00Z' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });

    const summaries = await accountTradeSummaryRepository.listForAccountSummaries('user-2');

    expect(summaries).toHaveLength(501);
    expect(summaries[500]).toEqual({
      id: 'trade-500',
      pnl: 500,
      openedAt: '2026-01-03T12:00:00Z',
    });
    expect(mockRange.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [501, 1000],
    ]);
  });
});
