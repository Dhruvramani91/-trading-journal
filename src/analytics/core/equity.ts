import type { Trade } from '@/domain/models/trade';
import type { EquityPoint } from './types';
import { byChronologicalOrder } from './date';

/**
 * Build an equity curve from a trade set.
 * Output is in chronological order (open time asc, id as tiebreaker).
 * Each point contains the realized R and the cumulative R up to and including it.
 */
export function equityCurve(trades: readonly Trade[]): EquityPoint[] {
  const ordered = [...trades].sort(byChronologicalOrder);
  let cum = 0;
  return ordered.map((t, i) => {
    cum += t.r;
    return {
      id: t.id,
      openedAt: t.openedAt,
      r: t.r,
      cumR: cum,
      index: i,
    };
  });
}
