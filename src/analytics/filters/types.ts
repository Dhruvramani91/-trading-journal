/**
 * Filter types — pure, serializable, template-agnostic.
 * The filter state is designed to be URL-syncable in a future phase.
 */
import type { TradeDirection, TradeResult, TemplateField } from '@/domain/models/trade';

/** A single filter value for a field. Empty string = "all". */
export type FilterValue = string;

/** Core filter fields (always present regardless of template). */
export interface CoreFilters {
  /** Local date range — inclusive, ISO 'YYYY-MM-DD'. Empty = unbounded. */
  from: string;
  to: string;
  /** Exact instrument match (case-insensitive). Empty = all. */
  instrument: string;
  /** Direction filter. */
  direction: 'all' | TradeDirection;
  /** Result filter. */
  result: 'all' | TradeResult;
}

/** Template-driven categorical filters.
 * Keys are template field keys; values are the selected option or '' for all.
 * Only fields with `type === 'enum'` or `type === 'boolean'` are included. */
export interface CategoricalFilters {
  [fieldKey: string]: FilterValue;
}

/** Complete filter state. */
export interface TradeFilters {
  core: CoreFilters;
  categorical: CategoricalFilters;
}

/** Initial (empty) filter state. */
export const DEFAULT_FILTERS: TradeFilters = {
  core: { from: '', to: '', instrument: '', direction: 'all', result: 'all' },
  categorical: {},
};

/** Whether any filter is active (non-default). */
export function hasActiveFilters(f: TradeFilters): boolean {
  const c = f.core;
  if (c.from || c.to || c.instrument || c.direction !== 'all' || c.result !== 'all') return true;
  return Object.values(f.categorical).some((v) => v !== '');
}

/** Build default categorical filters from template (only enum/boolean fields marked inStats/inTable). */
export function buildDefaultCategorical(templateFields: readonly TemplateField[]): CategoricalFilters {
  const out: CategoricalFilters = {};
  for (const f of templateFields) {
    if ((f.type === 'enum' || f.type === 'boolean') && (f.inTable || f.inStats)) {
      out[f.key] = '';
    }
  }
  return out;
}

/** Check if a single trade matches the filter. */
export function tradeMatchesFilters(trade: {
  openedAt: string;
  instrument: string;
  direction: TradeDirection;
  result: TradeResult;
  templateData: Record<string, unknown>;
}, filters: TradeFilters): boolean {
  const { core, categorical } = filters;

  // Date range (local date of openedAt)
  if (core.from) {
    const tradeDate = trade.openedAt.slice(0, 10);
    if (tradeDate < core.from) return false;
  }
  if (core.to) {
    const tradeDate = trade.openedAt.slice(0, 10);
    if (tradeDate > core.to) return false;
  }

  // Instrument (case-insensitive)
  if (core.instrument && trade.instrument.toLowerCase() !== core.instrument.toLowerCase()) return false;

  // Direction
  if (core.direction !== 'all' && trade.direction !== core.direction) return false;

  // Result
  if (core.result !== 'all' && trade.result !== core.result) return false;

  // Categorical fields
  for (const [key, value] of Object.entries(categorical)) {
    if (!value) continue; // '' means all
    const tradeValue = trade.templateData[key];
    const tradeKey =
      tradeValue === null || tradeValue === undefined || tradeValue === ''
        ? '—'
        : typeof tradeValue === 'boolean'
          ? tradeValue
            ? 'YES'
            : 'NO'
          : String(tradeValue);
    if (tradeKey !== value) return false;
  }

  return true;
}

/** Pure function: filter a trade array by the filter state. */
export function applyFilters<T extends { openedAt: string; instrument: string; direction: TradeDirection; result: TradeResult; templateData: Record<string, unknown> }>(
  trades: readonly T[],
  filters: TradeFilters,
): T[] {
  if (!hasActiveFilters(filters)) return [...trades];
  return trades.filter((t) => tradeMatchesFilters(t, filters));
}