import type { Trade, TradeResult } from '@/domain/models/trade';

/**
 * Top-level summary of a (possibly filtered) trade set.
 * Every field is computed from `trades` — never hard-coded.
 */
export interface TradeSummary {
  /** Number of trades in the set. */
  count: number;
  /** Wins / losses / break-evens. */
  wins: number;
  losses: number;
  bes: number;
  /** 0..1 — null if no trades. */
  winRate: number | null;
  /** Sum of realized R. */
  totalR: number;
  /** Mean of realized R per trade. */
  avgR: number;
  /** Mean of planned R:R (per-trade, skipping trades without one). */
  avgRR: number | null;
  /** Mean of realized R per trade — same as avgR; the spec asks for "Expectancy". */
  expectancy: number;
  /** Highest single-trade R. */
  bestR: number;
  /** Lowest single-trade R. */
  worstR: number;
  /** Longest run of consecutive wins in the set (by open time, asc). */
  longestWinStreak: number;
  /** Longest run of consecutive losses. */
  longestLossStreak: number;
  /**
   * Maximum drawdown of the equity curve, measured in R.
   * 0 if no drawdown (always growing or single trade).
   */
  maxDrawdownR: number;
}

/** One bucket in a category breakdown. */
export interface CategoryBucket {
  /** Raw field value, stringified (works for enum, boolean, number). */
  key: string;
  /** Human label for the bucket — same as `key` for enums; YES/NO for booleans. */
  label: string;
  count: number;
  wins: number;
  losses: number;
  bes: number;
  /** 0..1, null if count is 0. */
  winRate: number | null;
  /** Mean realized R per trade. */
  avgR: number;
  /** Mean planned R:R (skipping trades without one). */
  avgRR: number | null;
  /** Sum of realized R. */
  totalR: number;
}

/** A single point on the equity curve, in chronological order. */
export interface EquityPoint {
  /** Trade id this point represents. */
  id: string;
  /** Open time, ISO. */
  openedAt: string;
  /** Realized R for this trade. */
  r: number;
  /** Cumulative R up to and including this trade. */
  cumR: number;
  /** Index, 0-based. */
  index: number;
}

/** Result grouped by a single field. */
export interface CategoryBreakdown {
  fieldKey: string;
  /** Field label, sourced from the template definition. */
  fieldLabel: string;
  /** All buckets, sorted by totalR desc. */
  buckets: CategoryBucket[];
}

/** Day-level aggregation used by the monthly performance calendar. */
export interface DayPerformance {
  /** ISO date 'YYYY-MM-DD' (local-date derived from the trade's open time). */
  date: string;
  /** Sum of realized R for trades opened on this day. */
  totalR: number;
  /** Trade count that day. */
  count: number;
  /** Win count that day. */
  wins: number;
  /** Loss count that day. */
  losses: number;
  /** Break-even count that day. */
  bes: number;
}

/** Convenience: the trade→result code path used by both summary & breakdowns. */
export function resultCode(t: Pick<Trade, 'result'>): TradeResult {
  return t.result;
}
