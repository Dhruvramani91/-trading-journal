import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: storageMocks.getUser },
    storage: { from: storageMocks.from },
  },
  isSupabaseConfigured: true,
}));

import {
  deleteTradePhoto,
  deleteTradePhotosForTrade,
  persistEditedTradePhotos,
  persistTradePhotos,
  type TradePhotos,
} from './tradePhotos';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TRADE_ID = '22222222-2222-4222-8222-222222222222';
const OLD_PHOTO = `${USER_ID}/${TRADE_ID}/htf-33333333-3333-4333-8333-333333333333.png`;
const OTHER_TRADE_ID = '44444444-4444-4444-8444-444444444444';
const NEW_DATA_URL = 'data:image/png;base64,aGVsbG8=';

describe('trade photo persistence and cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    storageMocks.from.mockReturnValue({
      upload: storageMocks.upload,
      remove: storageMocks.remove,
      createSignedUrl: storageMocks.createSignedUrl,
    });
    storageMocks.upload.mockResolvedValue({ error: null });
    storageMocks.remove.mockResolvedValue({ error: null });
  });

  it('uploads a replacement, saves its path, then deletes the old Storage object', async () => {
    const order: string[] = [];
    storageMocks.upload.mockImplementation(async () => {
      order.push('upload');
      return { error: null };
    });
    storageMocks.remove.mockImplementation(async () => {
      order.push('delete');
      return { error: null };
    });

    let savedPhotos: TradePhotos | undefined;
    const result = await persistEditedTradePhotos(
      TRADE_ID,
      { htf: OLD_PHOTO },
      { htf: NEW_DATA_URL },
      async (photos) => {
        order.push('save');
        savedPhotos = photos;
      },
    );

    expect(order).toEqual(['upload', 'save', 'delete']);
    expect(savedPhotos?.htf).toBe(result.htf);
    expect(result.htf).not.toBe(OLD_PHOTO);
    expect(storageMocks.remove).toHaveBeenCalledWith([OLD_PHOTO]);
  });

  it('uploads all three selected screenshots under the new trade ID', async () => {
    const paths = await persistTradePhotos(TRADE_ID, {
      htf: NEW_DATA_URL,
      itf: 'data:image/png;base64,aGVsbG8=',
      ltf: 'data:image/png;base64,aGVsbG8=',
    });

    expect(storageMocks.upload).toHaveBeenCalledTimes(3);
    expect(paths.htf).toMatch(new RegExp(`^${USER_ID}/${TRADE_ID}/htf-`));
    expect(paths.itf).toMatch(new RegExp(`^${USER_ID}/${TRADE_ID}/itf-`));
    expect(paths.ltf).toMatch(new RegExp(`^${USER_ID}/${TRADE_ID}/ltf-`));
  });

  it('saves a removed screenshot before deleting its Storage object', async () => {
    const order: string[] = [];
    storageMocks.remove.mockImplementation(async () => {
      order.push('delete');
      return { error: null };
    });

    const result = await persistEditedTradePhotos(
      TRADE_ID,
      { htf: OLD_PHOTO },
      {},
      async (photos) => {
        order.push('save');
        expect(photos).toEqual({});
      },
    );

    expect(result).toEqual({});
    expect(order).toEqual(['save', 'delete']);
    expect(storageMocks.upload).not.toHaveBeenCalled();
  });

  it('does not upload or delete an unchanged Storage screenshot', async () => {
    const savePhotos = vi.fn().mockResolvedValue(undefined);

    const result = await persistEditedTradePhotos(
      TRADE_ID,
      { htf: OLD_PHOTO },
      { htf: OLD_PHOTO },
      savePhotos,
    );

    expect(result).toEqual({ htf: OLD_PHOTO });
    expect(savePhotos).toHaveBeenCalledOnce();
    expect(storageMocks.upload).not.toHaveBeenCalled();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });

  it('does not try to delete a legacy Base64 screenshot when replacing it', async () => {
    const savePhotos = vi.fn().mockResolvedValue(undefined);

    await persistEditedTradePhotos(
      TRADE_ID,
      { htf: NEW_DATA_URL },
      { htf: 'data:image/jpeg;base64,bmV3' },
      savePhotos,
    );

    expect(storageMocks.upload).toHaveBeenCalledOnce();
    expect(savePhotos).toHaveBeenCalledOnce();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });

  it('retains the old screenshot when replacement upload fails', async () => {
    storageMocks.upload.mockResolvedValue({
      error: { message: 'upload rejected' },
    });
    const savePhotos = vi.fn();

    await expect(
      persistEditedTradePhotos(
        TRADE_ID,
        { htf: OLD_PHOTO },
        { htf: NEW_DATA_URL },
        savePhotos,
      ),
    ).rejects.toThrow('Trade photo upload failed: upload rejected');

    expect(savePhotos).not.toHaveBeenCalled();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });

  it('ignores empty, Base64, external URL, and non-owned paths', async () => {
    await deleteTradePhoto(undefined);
    await deleteTradePhoto(NEW_DATA_URL);
    await deleteTradePhoto('https://example.com/trade.png');
    await deleteTradePhoto(
      `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/${TRADE_ID}/htf-33333333-3333-4333-8333-333333333333.png`,
    );

    expect(storageMocks.from).not.toHaveBeenCalled();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });

  it('reports Storage deletion failures', async () => {
    storageMocks.remove.mockResolvedValue({
      error: { message: 'permission denied' },
    });

    await expect(deleteTradePhoto(OLD_PHOTO)).rejects.toThrow(
      'Trade photo deletion failed: permission denied',
    );
  });

  it('deletes only authenticated-user paths for the requested trade', async () => {
    const otherTradePath = `${USER_ID}/${OTHER_TRADE_ID}/itf-33333333-3333-4333-8333-333333333333.png`;
    const otherUserPath = `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/${TRADE_ID}/ltf-33333333-3333-4333-8333-333333333333.png`;

    await deleteTradePhotosForTrade(TRADE_ID, {
      htf: OLD_PHOTO,
      itf: otherTradePath,
      ltf: otherUserPath,
    });

    expect(storageMocks.remove).toHaveBeenCalledWith([OLD_PHOTO]);
  });

  it('does not look up auth or delete legacy and external photo values', async () => {
    await deleteTradePhotosForTrade(TRADE_ID, {
      htf: NEW_DATA_URL,
      itf: 'https://example.com/trade.png',
      ltf: 'http://example.com/other.png',
    });

    expect(storageMocks.getUser).not.toHaveBeenCalled();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });

  it('treats an already-missing Storage object as successfully cleaned up', async () => {
    storageMocks.remove.mockResolvedValue({
      error: { statusCode: '404', message: 'Object not found' },
    });

    await expect(
      deleteTradePhotosForTrade(TRADE_ID, { htf: OLD_PHOTO }),
    ).resolves.toBeUndefined();
  });
});
