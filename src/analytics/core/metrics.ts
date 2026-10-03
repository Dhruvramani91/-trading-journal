import type { Trade } from '@/domain/models/trade';
import { byCategory } from './breakdowns';
import { byChronologicalOrder } from './date';

/**
 * The dashboard's two performance metrics.
 *
 * `r` is the canonical R-based metric (unchanged behaviour).
 * `pnl` reads the monetary P&L stored directly on the Journal Trade
 * (`Trade.pnl`) — never an account-specific attachment value.
 */
export type DashboardMetric = 'r' | 'pnl';

/** Which end of the metric range we are selecting. */
export type ExtremeKind = 'best' | 'worst';

/**
 * The finite value of `metric` for a single trade, or `null` when the metric
 * is unavailable (e.g. legacy trades that never had a P&L recorded).
 *
 * Callers MUST treat `null` as "no data" and never coerce it to zero.
 */
export function metricValue(
  trade: Trade,
  metric: DashboardMetric,
): number | null {
  if (metric === 'r') {
    return Number.isFinite(trade.r) ? trade.r : null;
  }

  const pnl = trade.pnl;
  return typeof pnl === 'number' && Number.isFinite(pnl) ? pnl : null;
}

/** Trades that actually carry a value for `metric`. */
export function metricTrades(
  trades: readonly Trade[],
  metric: DashboardMetric,
): Trade[] {
  return trades.filter((t) => metricValue(t, metric) != null);
}

/** Aggregated metric statistics over a trade set. */
export interface MetricSummary {
  /** Sum of the metric across trades that have a value. */
  total: number;
  /** Mean of the metric across trades that have a value (0 when none). */
  average: number;
  /** Number of trades contributing a value (i.e. non-null). */
  count: number;
}

/**
 * Sum/average of `metric`. Missing values are skipped entirely — they are
 * never counted as zero, so an unrecorded P&L cannot skew the average.
 */
export function metricSummary(
  trades: readonly Trade[],
  metric: DashboardMetric,
): MetricSummary {
  let total = 0;
  let count = 0;

  for (const t of trades) {
    const v = metricValue(t, metric);
    if (v == null) continue;
    total += v;
    count++;
  }

  return {
    total,
    average: count > 0 ? total / count : 0,
    count,
  };
}

/** A single point on a metric's cumulative curve. */
export interface MetricPoint {
  /** Trade id this point represents. */
  id: string;
  /** Open time, ISO. */
  openedAt: string;
  /** The per-trade metric value. */
  value: number;
  /** Cumulative metric value up to and including this trade. */
  cumulative: number;
  /** 0-based index within the curve (only counting contributing trades). */
  index: number;
}
/**
 * Chronological cumulative curve for `metric`.
 *
 * - For `r` this is byte-for-byte the same series as the existing
 *   `equityCurve()` (R is always present on a trade).
 * - For `pnl` trades without a valid P&L are skipped, so the curve only
 *   includes real monetary values.
 */
export function cumulativeCurve(
  trades: readonly Trade[],
  metric: DashboardMetric,
): MetricPoint[] {
  const ordered = [...trades].sort(byChronologicalOrder);
  const points: MetricPoint[] = [];
  let cumulative = 0;

  for (const t of ordered) {
    const v = metricValue(t, metric);
    if (v == null) continue;

    cumulative += v;
    points.push({
      id: t.id,
      openedAt: t.openedAt,
      value: v,
      cumulative,
      index: points.length,
    });
  }

  return points;
}

/**
 * Pick the single trade that best (or worst) represents `metric`.
 *
 * This mirrors the dashboard's original R selection exactly (the previous
 * page picked Best/Worst at the TRADE level, then displayed that single
 * trade's own setup label):
 * - 0 eligible trades -> null.
 * - Exactly 1 eligible trade -> a winner fills Best, a loser fills Worst;
 *   a break-even trade fills neither.
 * - 2+ eligible trades -> Best = highest value, Worst = lowest value,
 *   regardless of sign (two winners still split into "better"/"weaker",
 *   two losers into "less bad"/"worse").
 *
 * For `pnl`, only trades with a recorded value are eligible.
 */
export function pickExtremeTrade(
  trades: readonly Trade[],
  metric: DashboardMetric,
  kind: ExtremeKind,
): Trade | null {
  const eligible = metricTrades(trades, metric);
  if (eligible.length === 0) return null;

  if (eligible.length === 1) {
    const only = eligible[0]!;
    const v = metricValue(only, metric)!;
    if (kind === 'best') return v > 0 ? only : null;
    return v < 0 ? only : null;
  }

  return eligible.reduce((acc, t) => {
    const v = metricValue(t, metric)!;
    const accV = metricValue(acc, metric)!;
    if (kind === 'best') return v > accV ? t : acc;
    return v < accV ? t : acc;
  }, eligible[0]!);
}

/** Metric-aware Best/Worst setup highlight, ready for the dashboard cards. */
export interface SetupHighlight {
  /** Setup bucket label of the highlighted trade's own bucket. */
  label: string;
  /** Trades in the highlighted bucket (a single-trade highlight -> 1). */
  count: number;
  /** The metric value of the highlighted trade. */
  average: number;
  /** The metric value of the highlighted trade. */
  total: number;
  /** Win rate (0..1) of the highlighted bucket, or null. */
  winRate: number | null;
}

/**
 * Best/Worst setup, using the metric selected by the user.
 *
 * The behaviour matches the original dashboard: the extreme is picked at
 * the TRADE level and then displayed with that single trade's own setup
 * label (via the existing `byCategory()` grouping on `[trade]`). Only the
 * metric used to pick the trade — and the number shown — changes with the
 * toggle.
 */
export function extremeSetup(
  trades: readonly Trade[],
  metric: DashboardMetric,
  kind: ExtremeKind,
  fieldKey = 'dailyCandle',
): SetupHighlight | null {
  const trade = pickExtremeTrade(trades, metric, kind);
  if (!trade) return null;

  const value = metricValue(trade, metric);
  if (value == null) return null;

  // Reuse the existing setup grouping to obtain the highlighted trade's label
  // and stats in the same bucket shape the dashboard cards already render.
  const breakdown = byCategory([trade], fieldKey);
  const bucket = breakdown.buckets.find((b) => b.count > 0) ?? null;

  return {
    label: bucket?.label ?? '—',
    count: bucket?.count ?? 1,
    average: value,
    total: value,
    winRate: bucket?.winRate ?? null,
  };
}