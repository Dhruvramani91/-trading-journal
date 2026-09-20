import type { Trade } from '@/domain/models/trade';
import type { EquityPoint, TradeSummary } from './types';
import { byChronologicalOrder } from './date';
import { equityCurve } from './equity';

/**
 * Compute the summary metrics for a (possibly filtered) trade set.
 * Every metric is a pure function of `trades`. Empty input → zeroes.
 */
export function summary(trades: readonly Trade[]): TradeSummary {
  const count = trades.length;
  if (count === 0) {
    return {
      count: 0,
      wins: 0,
      losses: 0,
      bes: 0,
      winRate: null,
      totalR: 0,
      avgR: 0,
      avgRR: null,
      expectancy: 0,
      bestR: 0,
      worstR: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      maxDrawdownR: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let bes = 0;
  let totalR = 0;
  let bestR = -Infinity;
  let worstR = Infinity;
  let rrSum = 0;
  let rrCount = 0;

  for (const t of trades) {
    if (t.result === 'win') wins++;
    else if (t.result === 'loss') losses++;
    else bes++;

    totalR += t.r;
    if (t.r > bestR) bestR = t.r;
    if (t.r < worstR) worstR = t.r;

    if (t.plannedRR != null && Number.isFinite(t.plannedRR)) {
      rrSum += t.plannedRR;
      rrCount++;
    }
  }

  // Streaks — based on chronological order.
  const ordered = [...trades].sort(byChronologicalOrder);
  let curWin = 0;
  let curLoss = 0;
  let longestWin = 0;
  let longestLoss = 0;
  for (const t of ordered) {
    if (t.result === 'win') {
      curWin++;
      curLoss = 0;
      if (curWin > longestWin) longestWin = curWin;
    } else if (t.result === 'loss') {
      curLoss++;
      curWin = 0;
      if (curLoss > longestLoss) longestLoss = curLoss;
    } else {
      // BE breaks neither streak but is not itself counted.
      curWin = 0;
      curLoss = 0;
    }
  }

  return {
    count,
    wins,
    losses,
    bes,
    winRate: wins / count,
    totalR,
    avgR: totalR / count,
    avgRR: rrCount > 0 ? rrSum / rrCount : null,
    expectancy: totalR / count, // per-trade expected R
    bestR: bestR === -Infinity ? 0 : bestR,
    worstR: worstR === Infinity ? 0 : worstR,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    maxDrawdownR: maxDrawdown(equityCurve(ordered)),
  };
}

/** Maximum drawdown of an equity curve, in R. */
function maxDrawdown(points: readonly EquityPoint[]): number {
  if (points.length === 0) return 0;
  let peak = -Infinity;
  let dd = 0;
  for (const p of points) {
    if (p.cumR > peak) peak = p.cumR;
    const here = peak - p.cumR;
    if (here > dd) dd = here;
  }
  return dd;
}
