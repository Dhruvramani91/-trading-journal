/**
 * Filter store — holds the active filter state and provides actions.
 *
 * The filtered trade list is computed by consumers via
 * `useFilteredTrades()` which combines this store with `useTradesStore`.
 */
import { create } from 'zustand';
import type { TradeFilters } from '@/analytics/filters';
import { DEFAULT_FILTERS } from '@/analytics/filters';
import { useTradesStore } from './tradesStore';
import { applyFilters } from '@/analytics/filters';

interface FilterActions {
  setFilter: (key: string, value: string) => void;
  setCoreFilter: (key: keyof TradeFilters['core'], value: string) => void;
  resetFilters: () => void;
}

export interface FilterStoreState extends FilterActions {
  filters: TradeFilters;
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  filters: { ...DEFAULT_FILTERS },

  setFilter(key: string, value: string) {
    set((state) => {
      const { core, categorical } = state.filters;
      if (key in core) {
        return { filters: { ...state.filters, core: { ...core, [key]: value } } };
      }
      return { filters: { ...state.filters, categorical: { ...categorical, [key]: value } } };
    });
  },

  setCoreFilter(key: keyof TradeFilters['core'], value: string) {
    set((state) => ({
      filters: { ...state.filters, core: { ...state.filters.core, [key]: value } },
    }));
  },

  resetFilters() {
    set({ filters: { ...DEFAULT_FILTERS } });
  },
}));

/**
 * Selector that returns the trades filtered by the current filter state.
 * Recomputes only when trades or filters change.
 */
export function useFilteredTrades(): {
  filtered: ReturnType<typeof applyFilters>;
  filters: TradeFilters;
  activeCount: number;
} {
  const trades = useTradesStore((s) => s.trades);
  const filters = useFilterStore((s) => s.filters);

  const filtered = applyFilters(trades, filters);

  // Count active filters
  const { core, categorical } = filters;
  const coreActive =
    core.from !== '' || core.to !== '' || core.instrument !== '' ||
    core.direction !== 'all' || core.result !== 'all';
  const catActive = Object.values(categorical).filter((v) => v !== '').length;
  const activeCount = (coreActive ? 1 : 0) + catActive;

  return { filtered, filters, activeCount };
}

/** Reset all filters (convenience for filter bar "clear all" button). */
export function resetAllFilters(): void {
  useFilterStore.getState().resetFilters();
}