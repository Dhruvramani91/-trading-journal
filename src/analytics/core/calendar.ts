import type { Trade } from '@/domain/models/trade';
import type { DayPerformance } from './types';
import { dayKey } from './date';

/**
 * Aggregate trades into per-day performance buckets.
 * Trades without a valid open time are skipped.
 * Output is sorted by date asc.
 */
export function byDay(trades: readonly Trade[]): DayPerformance[] {
  const map = new Map<string, DayPerformance>();
  for (const t of trades) {
    const date = dayKey(t.openedAt);
    let day = map.get(date);
    if (!day) {
      day = { date, totalR: 0, count: 0, wins: 0, losses: 0, bes: 0 };
      map.set(date, day);
    }
    day.totalR += t.r;
    day.count++;
    if (t.result === 'win') day.wins++;
    else if (t.result === 'loss') day.losses++;
    else day.bes++;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
