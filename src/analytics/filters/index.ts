/** Public API for the filtering system. */
export { applyFilters, hasActiveFilters, buildDefaultCategorical, DEFAULT_FILTERS } from './types';
export type { TradeFilters, CoreFilters, CategoricalFilters, FilterValue } from './types';
export type { TradeResult, TradeDirection } from '@/domain/models/trade';