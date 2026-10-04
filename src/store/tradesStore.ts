import { create } from 'zustand';
import type { Trade } from '@/domain/models/trade';
import { tradeRepository } from '@/data/supabaseTradeRepository';
import { deleteTradePhotosForTrade } from '@/lib/tradePhotos';

interface TradesState {
  trades: Trade[];
  ownerId: string | null;
  loadingOwnerId: string | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;

  load: (ownerId?: string) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;

  create: (
    input: Parameters<typeof tradeRepository.create>[0]
  ) => Promise<Trade>;

  update: (
    id: string,
    patch: Parameters<typeof tradeRepository.update>[1]
  ) => Promise<Trade>;

  remove: (id: string, existingTrade?: Pick<Trade, 'photos'>) => Promise<void>;
}

let requestVersion = 0;
let inFlightLoad: Promise<void> | null = null;

export const useTradesStore = create<TradesState>((set, get) => ({
  trades: [],
  ownerId: null,
  loadingOwnerId: null,
  loaded: false,
  loading: false,
  error: null,

  load(ownerId) {
    if (get().loading && inFlightLoad) return inFlightLoad;

    const version = ++requestVersion;

    set({
      loading: true,
      loadingOwnerId: ownerId ?? null,
      error: null,
    });

    const request = (async () => {
      try {
        const trades = await tradeRepository.list();

        // Ignore results from an older user/session.
        if (version !== requestVersion) return;

        set({
          trades,
          ownerId: ownerId ?? null,
          loadingOwnerId: null,
          loaded: true,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (version !== requestVersion) return;

        set({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load trades.',
          loadingOwnerId: null,
          loading: false,
        });
      }
    })();

    inFlightLoad = request;
    void request.finally(() => {
      if (inFlightLoad === request) inFlightLoad = null;
    });
    return request;
  },

  async refresh() {
    const version = ++requestVersion;

    try {
      const trades = await tradeRepository.list();

      // Ignore stale requests.
      if (version !== requestVersion) return;

      set({
        trades,
        ownerId: get().ownerId,
        loadingOwnerId: null,
        loaded: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      if (version !== requestVersion) return;

      set({
        error:
          err instanceof Error
            ? err.message
            : 'Failed to refresh trades.',
        loadingOwnerId: null,
        loading: false,
      });
    }
  },

  clear() {
    // Invalidate every request currently in flight.
    requestVersion++;

    set({
      trades: [],
      ownerId: null,
      loadingOwnerId: null,
      loaded: false,
      loading: false,
      error: null,
    });
  },

  async create(input) {
    const created = await tradeRepository.create(input);
    await get().refresh();
    return created;
  },

  async update(id, patch) {
    const updated = await tradeRepository.update(id, patch);
    await get().refresh();
    return updated;
  },

  async remove(id, existingTrade) {
    const tradeForCleanup = existingTrade ?? await tradeRepository.get(id);
    await tradeRepository.remove(id);

    if (tradeForCleanup?.photos) {
      try {
        await deleteTradePhotosForTrade(id, tradeForCleanup.photos);
      } catch (error) {
        console.error(
          `Trade ${id} was deleted, but its screenshots could not be cleaned up:`,
          error,
        );
      }
    }

    await get().refresh();
  },
}));

let booted = false;

export function bootTradesStore(): void {
  if (booted) return;
  booted = true;

  const state = useTradesStore.getState();
  if (state.loaded || state.loading) return;

  void state.load();
}

export async function reloadTradesForCurrentUser(userId?: string): Promise<void> {
  const store = useTradesStore.getState();

  store.clear();
  await store.load(userId);
}

export function clearTradesForCurrentUser(): void {
  useTradesStore.getState().clear();
}
