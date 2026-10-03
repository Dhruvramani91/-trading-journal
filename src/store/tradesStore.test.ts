import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockList = vi.hoisted(() => vi.fn());

vi.mock('@/data/supabaseTradeRepository', () => ({
  tradeRepository: { list: mockList },
}));

import {
  clearTradesForCurrentUser,
  reloadTradesForCurrentUser,
  useTradesStore,
} from './tradesStore';

const trade = (id: string) => ({
  id,
  templateId: 'default',
  openedAt: '2026-01-01T00:00:00.000Z',
  instrument: 'ES',
  direction: 'long' as const,
  result: 'win' as const,
  r: 1,
  durationMin: 1,
  templateData: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('tradesStore user scoping', () => {
  beforeEach(() => {
    clearTradesForCurrentUser();
    vi.clearAllMocks();
  });

  it('tags loaded trades to the authenticated user and clears them on sign-out', async () => {
    mockList.mockResolvedValue([trade('user-1-trade')]);

    await reloadTradesForCurrentUser('user-1');

    expect(useTradesStore.getState()).toMatchObject({
      trades: [trade('user-1-trade')],
      ownerId: 'user-1',
      loaded: true,
    });

    clearTradesForCurrentUser();

    expect(useTradesStore.getState()).toMatchObject({
      trades: [],
      ownerId: null,
      loaded: false,
      loading: false,
    });
  });

  it('invalidates a previous user’s in-flight trades when the authenticated user changes', async () => {
    let resolvePrevious!: (trades: ReturnType<typeof trade>[]) => void;
    const previousRequest = new Promise<ReturnType<typeof trade>[]>((resolve) => {
      resolvePrevious = resolve;
    });
    mockList.mockReturnValueOnce(previousRequest).mockResolvedValueOnce([trade('user-2-trade')]);

    const previousLoad = reloadTradesForCurrentUser('user-1');
    await reloadTradesForCurrentUser('user-2');
    resolvePrevious([trade('user-1-trade')]);
    await previousLoad;

    expect(useTradesStore.getState()).toMatchObject({
      trades: [trade('user-2-trade')],
      ownerId: 'user-2',
      loaded: true,
      loading: false,
    });
  });
});
