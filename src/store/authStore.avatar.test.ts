import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
  reloadTradesForCurrentUser: vi.fn(),
  clearTradesForCurrentUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { updateUser: mocks.updateUser },
    storage: { from: mocks.from },
  },
}));

vi.mock('@/store/tradesStore', () => ({
  reloadTradesForCurrentUser: mocks.reloadTradesForCurrentUser,
  clearTradesForCurrentUser: mocks.clearTradesForCurrentUser,
}));

import { useAuthStore } from '@/store/authStore';

describe('avatar Storage behavior', () => {
  const currentUser = {
    id: 'user-123',
    email: 'trader@example.com',
    name: 'Trader',
    avatar: 'https://old.example/avatar.png',
    avatarPath: 'user-123/old.webp',
    traderLevel: 'beginner' as const,
  };
  const webpBlob = new Blob(['compressed-image'], { type: 'image/webp' });
  const bitmapClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: currentUser,
      loading: false,
      error: null,
      initialized: true,
    });

    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 128,
      height: 128,
      close: bitmapClose,
    })));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(webpBlob);
    });

    mocks.upload.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://storage.example/avatars/${path}` },
    }));
    mocks.from.mockReturnValue({
      upload: mocks.upload,
      getPublicUrl: mocks.getPublicUrl,
    });
    mocks.updateUser.mockImplementation(async ({ data }) => ({
      data: {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          user_metadata: data,
        },
      },
      error: null,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uploads an avatar to the signed-in user folder and publishes its URL', async () => {
    await useAuthStore.getState().updateProfile(
      'Trader Updated',
      new File(['source-image'], 'avatar.png', { type: 'image/png' }),
    );

    expect(mocks.from).toHaveBeenCalledWith('avatars');
    expect(mocks.upload).toHaveBeenCalledWith(
      'user-123/avatar.webp',
      webpBlob,
      expect.objectContaining({ contentType: 'image/webp', upsert: true }),
    );
    const savedProfile = useAuthStore.getState().user;
    expect(savedProfile?.avatarPath).toBe('user-123/avatar.webp');
    expect(savedProfile?.avatar).toMatch(/^https:\/\/storage\.example\/avatars\/user-123\/avatar\.webp\?v=/);
  });

  it('replaces the existing avatar at the same owner-scoped object path', async () => {
    await useAuthStore.getState().updateProfile(
      'Trader',
      new File(['replacement'], 'replacement.png', { type: 'image/png' }),
    );

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.upload).toHaveBeenCalledWith(
      'user-123/avatar.webp',
      webpBlob,
      expect.objectContaining({ upsert: true }),
    );
    expect(useAuthStore.getState().user?.avatarPath).toBe('user-123/avatar.webp');
  });

  it('does not use a stored path from another user when uploading', async () => {
    useAuthStore.setState({
      user: { ...currentUser, avatarPath: 'someone-else/avatar.webp' },
    });

    await useAuthStore.getState().updateProfile(
      'Trader',
      new File(['replacement'], 'replacement.png', { type: 'image/png' }),
    );

    expect(mocks.upload).toHaveBeenCalledWith(
      'user-123/avatar.webp',
      webpBlob,
      expect.objectContaining({ upsert: true }),
    );
    expect(mocks.upload).not.toHaveBeenCalledWith(
      'someone-else/avatar.webp',
      expect.anything(),
      expect.anything(),
    );
  });

  it('preserves legacy avatar URLs during profile updates without Storage writes', async () => {
    const legacy = 'data:image/png;base64,AA==';
    useAuthStore.setState({ user: { ...currentUser, avatar: legacy, avatarPath: undefined } });

    await useAuthStore.getState().updateProfile('Legacy Trader');

    expect(mocks.from).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.avatar).toBe(legacy);
  });

  it('loads legacy avatar metadata for profile display', async () => {
    const legacyUrl = 'https://legacy.example/profile.jpg';
    const sessionUser = {
      id: currentUser.id,
      email: currentUser.email,
      user_metadata: { name: 'Trader', avatar_url: legacyUrl, avatar_path: null },
    };
    const unsubscribe = vi.fn();
    const auth = (await import('@/lib/supabase')).supabase!.auth as unknown as {
      getSession: () => Promise<unknown>;
      onAuthStateChange: () => unknown;
    };
    Object.assign(auth, {
      getSession: vi.fn(async () => ({ data: { session: { user: sessionUser } }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
    });

    await useAuthStore.getState().init();

    expect(useAuthStore.getState().user?.avatar).toBe(legacyUrl);
    expect(useAuthStore.getState().user?.avatarPath).toBeUndefined();
  });
});
