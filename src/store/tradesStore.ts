import { create } from 'zustand';
import type { Trade } from '@/domain/models/trade';
import { tradeRepository } from '@/data/supabaseTradeRepository';

interface TradesState {
  trades: Trade[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;

  create: (
    input: Parameters<typeof tradeRepository.create>[0]
  ) => Promise<Trade>;

  update: (
    id: string,
    patch: Parameters<typeof tradeRepository.update>[1]
  ) => Promise<Trade>;

  remove: (id: string) => Promise<void>;
}

let requestVersion = 0;

export const useTradesStore = create<TradesState>((set, get) => ({
  trades: [],
  loaded: false,
  loading: false,
  error: null,

  async load() {
    if (get().loading) return;

    const version = ++requestVersion;

    set({
      loading: true,
      error: null,
    });

    try {
      const trades = await tradeRepository.list();

      // Ignore results from an older user/session.
      if (version !== requestVersion) return;

      set({
        trades,
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
        loading: false,
      });
    }
  },

  async refresh() {
    const version = ++requestVersion;

    try {
      const trades = await tradeRepository.list();

      // Ignore stale requests.
      if (version !== requestVersion) return;

      set({
        trades,
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
      });
    }
  },

  clear() {
    // Invalidate every request currently in flight.
    requestVersion++;

    set({
      trades: [],
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

  async remove(id) {
    await tradeRepository.remove(id);
    await get().refresh();
  },
}));

let booted = false;

export function bootTradesStore(): void {
  if (booted) return;
  booted = true;

  void useTradesStore.getState().load();
}

export async function reloadTradesForCurrentUser(): Promise<void> {
  const store = useTradesStore.getState();

  store.clear();
  await store.load();
}

export function clearTradesForCurrentUser(): void {
  useTradesStore.getState().clear();
}