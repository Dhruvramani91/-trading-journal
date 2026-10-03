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
