import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockList = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockDeleteTradePhotosForTrade = vi.hoisted(() => vi.fn());

vi.mock('@/data/supabaseTradeRepository', () => ({
  tradeRepository: { list: mockList, get: mockGet, remove: mockRemove },
}));

vi.mock('@/lib/tradePhotos', () => ({
  deleteTradePhotosForTrade: mockDeleteTradePhotosForTrade,
}));

import {
  bootTradesStore,
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
    mockList.mockResolvedValue([]);
    mockGet.mockResolvedValue(null);
    mockRemove.mockResolvedValue(undefined);
    mockDeleteTradePhotosForTrade.mockResolvedValue(undefined);
  });

  it('tags loaded trades to the authenticated user and clears them on sign-out', async () => {
    mockList.mockResolvedValue([trade('user-1-trade')]);

    await reloadTradesForCurrentUser('user-1');

    expect(useTradesStore.getState()).toMatchObject({
      trades: [trade('user-1-trade')],
      authenticatedUserId: 'user-1',
      ownerId: 'user-1',
      loaded: true,
    });

    clearTradesForCurrentUser();

    expect(useTradesStore.getState()).toMatchObject({
      trades: [],
      authenticatedUserId: null,
      ownerId: null,
      loaded: false,
      loading: false,
    });
  });

  it('reuses already loaded data for the same authenticated user', async () => {
    mockList.mockResolvedValue([trade('user-1-trade')]);

    await reloadTradesForCurrentUser('user-1');
    await reloadTradesForCurrentUser('user-1');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(useTradesStore.getState().trades).toEqual([trade('user-1-trade')]);
  });

  it('boots the authenticated user once and reuses that load across navigation', async () => {
    mockList.mockResolvedValue([trade('user-1-trade')]);

    await reloadTradesForCurrentUser('user-1');
    bootTradesStore();
    bootTradesStore();

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(useTradesStore.getState()).toMatchObject({
      authenticatedUserId: 'user-1',
      ownerId: 'user-1',
      trades: [trade('user-1-trade')],
      loaded: true,
    });
  });

  it('joins the in-flight load for the same authenticated user', async () => {
    let resolveTrades!: (trades: ReturnType<typeof trade>[]) => void;
    mockList.mockReturnValue(new Promise((resolve) => {
      resolveTrades = resolve;
    }));

    const first = reloadTradesForCurrentUser('user-1');
    const second = reloadTradesForCurrentUser('user-1');
    expect(useTradesStore.getState()).toMatchObject({
      authenticatedUserId: 'user-1',
      loadingOwnerId: 'user-1',
      loading: true,
      trades: [],
    });

    resolveTrades([trade('user-1-trade')]);
    await Promise.all([first, second]);

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(useTradesStore.getState().trades).toEqual([trade('user-1-trade')]);
  });

  it('does not expose or accept loaded data under a mismatched user id', async () => {
    mockList.mockResolvedValue([trade('user-1-trade')]);
    await reloadTradesForCurrentUser('user-1');

    await useTradesStore.getState().load('user-2');

    expect(useTradesStore.getState()).toMatchObject({
      authenticatedUserId: 'user-1',
      ownerId: null,
      trades: [],
      loaded: false,
    });
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('isolates A → B → A sessions and reloads each user independently', async () => {
    mockList
      .mockResolvedValueOnce([trade('user-a-trade')])
      .mockResolvedValueOnce([trade('user-b-trade')])
      .mockResolvedValueOnce([trade('user-a-trade-restored')]);

    await reloadTradesForCurrentUser('user-a');
    expect(useTradesStore.getState().trades).toEqual([trade('user-a-trade')]);

    await reloadTradesForCurrentUser('user-b');
    expect(useTradesStore.getState()).toMatchObject({
      authenticatedUserId: 'user-b',
      ownerId: 'user-b',
      trades: [trade('user-b-trade')],
      loaded: true,
      error: null,
    });

    await reloadTradesForCurrentUser('user-a');
    expect(useTradesStore.getState()).toMatchObject({
      authenticatedUserId: 'user-a',
      ownerId: 'user-a',
      trades: [trade('user-a-trade-restored')],
      loaded: true,
    });
    expect(mockList).toHaveBeenCalledTimes(3);
  });

  it('clears a previous user error and loading state when a new user is activated', async () => {
    mockList.mockRejectedValueOnce(new Error('user A load failed'));
    await reloadTradesForCurrentUser('user-a');
    expect(useTradesStore.getState().error).toBe('user A load failed');

    mockList.mockResolvedValueOnce([trade('user-b-trade')]);
    await reloadTradesForCurrentUser('user-b');

    expect(useTradesStore.getState()).toMatchObject({
      authenticatedUserId: 'user-b',
      ownerId: 'user-b',
      trades: [trade('user-b-trade')],
      loading: false,
      error: null,
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

  it('deletes Storage photos only after the trade row deletion succeeds', async () => {
    const order: string[] = [];
    const photos = { htf: 'user-1/trade-1/htf-file.jpg' };
    mockGet.mockResolvedValue({ ...trade('trade-1'), photos });
    mockRemove.mockImplementation(async () => {
      order.push('database-delete');
    });
    mockDeleteTradePhotosForTrade.mockImplementation(async () => {
      order.push('storage-delete');
    });

    await useTradesStore.getState().remove('trade-1');

    expect(order).toEqual(['database-delete', 'storage-delete']);
    expect(mockDeleteTradePhotosForTrade).toHaveBeenCalledWith('trade-1', photos);
  });

  it('preserves Storage photos when the database delete fails', async () => {
    mockGet.mockResolvedValue({
      ...trade('trade-1'),
      photos: { htf: 'user-1/trade-1/htf-file.jpg' },
    });
    mockRemove.mockRejectedValue(new Error('delete failed'));

    await expect(useTradesStore.getState().remove('trade-1')).rejects.toThrow('delete failed');

    expect(mockDeleteTradePhotosForTrade).not.toHaveBeenCalled();
  });

  it('deletes trades without photos without calling Storage cleanup', async () => {
    mockGet.mockResolvedValue(trade('trade-1'));

    await useTradesStore.getState().remove('trade-1');

    expect(mockRemove).toHaveBeenCalledWith('trade-1');
    expect(mockDeleteTradePhotosForTrade).not.toHaveBeenCalled();
  });

  it('keeps trade deletion successful if Storage cleanup fails', async () => {
    mockGet.mockResolvedValue({
      ...trade('trade-1'),
      photos: { htf: 'user-1/trade-1/htf-file.jpg' },
    });
    mockDeleteTradePhotosForTrade.mockRejectedValue(new Error('storage unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(useTradesStore.getState().remove('trade-1')).resolves.toBeUndefined();

    expect(mockRemove).toHaveBeenCalledWith('trade-1');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
