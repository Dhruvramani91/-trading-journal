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
  create: (input: Parameters<typeof tradeRepository.create>[0]) => Promise<Trade>;
  update: (id: string, patch: Parameters<typeof tradeRepository.update>[1]) => Promise<Trade>;
  remove: (id: string) => Promise<void>;
}

/**
 * In-memory mirror of the repository. The repository remains the source of truth;
 * this store exists so multiple components (table, dashboard, calendar) can
 * subscribe to the same list without re-fetching.
 */
export const useTradesStore = create<TradesState>((set, get) => ({
  trades: [],
  loaded: false,
  loading: false,
  error: null,

  async load() {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const trades = await tradeRepository.list();
      set({ trades, loaded: true, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  async refresh() {
    const trades = await tradeRepository.list();
    set({ trades, loaded: true });
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

/** Boot the store once and re-sync on repo changes. Idempotent. */
let booted = false;
export function bootTradesStore(): void {
  if (booted) return;
  booted = true;
  void useTradesStore.getState().load();
  if (typeof tradeRepository.subscribe === 'function') {
    tradeRepository.subscribe(() => {
      void useTradesStore.getState().refresh();
    });
  }
}
