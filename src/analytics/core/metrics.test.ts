import { describe, it, expect } from 'vitest';
import type { Trade } from '@/domain/models/trade';
import { SEED_TRADES } from '@/data/seed';
import { equityCurve } from './equity';
import {
  cumulativeCurve,
  metricSummary,
  metricValue,
  pickExtremeTrade,
  extremeSetup,
} from './metrics';

function makeTrade(
  overrides: Partial<Trade> & {
    openedAt: string;
    r: number;
    result: Trade['result'];
  },
): Trade {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    templateId: 'default-ict-2026',
    number: overrides.number,
    openedAt: overrides.openedAt,
    closedAt: overrides.closedAt,
    instrument: overrides.instrument ?? 'ES',
    direction: overrides.direction ?? 'long',
    result: overrides.result,
    pnl: overrides.pnl,
    r: overrides.r,
    durationMin: overrides.durationMin ?? 30,
    templateData: overrides.templateData ?? {},
    notes: overrides.notes,
    createdAt: overrides.openedAt,
    updatedAt: overrides.openedAt,
  };
}

/* 1. Cumulative R */
describe('cumulativeCurve — Cumulative R', () => {
  it('produces the same series as the existing R equity curve', () => {
    // seed R: +1, -1, 0, +2, +2 → cumulative 1, 0, 0, 2, 4
    const points = cumulativeCurve(SEED_TRADES, 'r');
    expect(points.map((p) => p.cumulative)).toEqual([1, 0, 0, 2, 4]);

    // R must remain identical to the original engine.
    const legacy = equityCurve(SEED_TRADES).map((p) => p.cumR);
    expect(points.map((p) => p.cumulative)).toEqual(legacy);
  });

  it('is chronological and cumulative', () => {
    const trades = [
      makeTrade({ openedAt: '2026-01-03T10:00:00Z', r: 2, result: 'win' }),
      makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: 1, result: 'win' }),
      makeTrade({ openedAt: '2026-01-02T10:00:00Z', r: -1, result: 'loss' }),
    ];
    const points = cumulativeCurve(trades, 'r');
    expect(points.map((p) => p.value)).toEqual([1, -1, 2]);
    expect(points.map((p) => p.cumulative)).toEqual([1, 0, 2]);
  });

  it('returns [] for an empty set', () => {
    expect(cumulativeCurve([], 'r')).toEqual([]);
  });
});

/* 2. Cumulative P&L */
describe('cumulativeCurve — Cumulative P&L', () => {
  it('produces a cumulative P&L series from Journal Trade.pnl', () => {
    // seed P&L: +200, -200, 0, +400, +400 → cumulative 200, 0, 0, 400, 800
    const points = cumulativeCurve(SEED_TRADES, 'pnl');
    expect(points.map((p) => p.cumulative)).toEqual([200, 0, 0, 400, 800]);
    expect(points).toHaveLength(5);
  });

  it('matches the spec example (+200, -100, +500 → 200, 100, 600)', () => {
    const trades = [
      makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: 1, pnl: 200, result: 'win' }),
      makeTrade({ openedAt: '2026-01-02T10:00:00Z', r: -1, pnl: -100, result: 'loss' }),
      makeTrade({ openedAt: '2026-01-03T10:00:00Z', r: 2, pnl: 500, result: 'win' }),
    ];
    const points = cumulativeCurve(trades, 'pnl');
    expect(points.map((p) => p.value)).toEqual([200, -100, 500]);
    expect(points.map((p) => p.cumulative)).toEqual([200, 100, 600]);
  });
});

/* 3 & 4. P&L total + average */
describe('metricSummary', () => {
  it('totals Journal P&L across the set', () => {
    expect(metricSummary(SEED_TRADES, 'pnl').total).toBe(800);
  });

  it('averages Journal P&L over trades that recorded one', () => {
    const { total, average, count } = metricSummary(SEED_TRADES, 'pnl');
    expect(total).toBe(800);
    expect(count).toBe(5);
    expect(average).toBe(160);
  });

  it('keeps the existing R totals/averages unchanged', () => {
    const { total, average, count } = metricSummary(SEED_TRADES, 'r');
    expect(total).toBe(4);
    expect(average).toBeCloseTo(0.8);
    expect(count).toBe(5);
  });
});

/* 5–8. Best / Worst setup by metric */
describe('extremeSetup (Best / Worst) is metric-aware', () => {
  // Best setup differs between metrics on purpose.
  const trades: Trade[] = [
    makeTrade({
      id: 'a', openedAt: '2026-01-01T10:00:00Z', r: 3, pnl: 750, result: 'win',
      templateData: { dailyCandle: 'Continuation [C3]' },
    }),
    makeTrade({
      id: 'b', openedAt: '2026-01-02T10:00:00Z', r: -1, pnl: -250, result: 'loss',
      templateData: { dailyCandle: 'Reversal [C2]' },
    }),
    makeTrade({
      id: 'c', openedAt: '2026-01-03T10:00:00Z', r: 1, pnl: 200, result: 'win',
      templateData: { dailyCandle: 'Reversal [C2]' },
    }),
  ];

  it('picks Best setup by R', () => {
    const best = extremeSetup(trades, 'r', 'best');
    expect(best?.label).toBe('Continuation [C3]');
    expect(best?.average).toBe(3);
    expect(best?.total).toBe(3);
  });

  it('picks Worst setup by R', () => {
    const worst = extremeSetup(trades, 'r', 'worst');
    expect(worst?.label).toBe('Reversal [C2]');
    expect(worst?.average).toBe(-1);
  });

  it('picks Best setup by P&L', () => {
    const best = extremeSetup(trades, 'pnl', 'best');
    expect(best?.label).toBe('Continuation [C3]');
    expect(best?.average).toBe(750);
  });

  it('picks Worst setup by P&L', () => {
    const worst = extremeSetup(trades, 'pnl', 'worst');
    expect(worst?.label).toBe('Reversal [C2]');
    expect(worst?.average).toBe(-250);
  });

  it('preserves the single-trade best/worst rule for R', () => {
    const winner = [makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: 1, result: 'win' })];
    expect(pickExtremeTrade(winner, 'r', 'best')).toBe(winner[0]);
    expect(pickExtremeTrade(winner, 'r', 'worst')).toBeNull();

    const loser = [makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: -1, result: 'loss' })];
    expect(pickExtremeTrade(loser, 'r', 'worst')).toBe(loser[0]);
    expect(pickExtremeTrade(loser, 'r', 'best')).toBeNull();
  });
});

/* 9. Missing / null P&L handling */
describe('missing P&L is treated as "no data", never as zero', () => {
  const partial: Trade[] = [
    makeTrade({ id: 'x', openedAt: '2026-01-01T10:00:00Z', r: 2, result: 'win' }), // no pnl
    makeTrade({ id: 'y', openedAt: '2026-01-02T10:00:00Z', r: 1, result: 'win' }), // null pnl (below)
    makeTrade({ id: 'z', openedAt: '2026-01-03T10:00:00Z', r: -1, pnl: 100, result: 'loss' }),
  ];
  (partial[1] as { pnl?: number | null }).pnl = null;

  it('never reports NaN/undefined for the average', () => {
    const { total, average, count } = metricSummary(partial, 'pnl');
    expect(count).toBe(1); // only the trade with a real value
    expect(total).toBe(100);
    expect(average).toBe(100);
    expect(Number.isNaN(average)).toBe(false);
  });

  it('skips missing values in the cumulative curve', () => {
    const points = cumulativeCurve(partial, 'pnl');
    expect(points).toHaveLength(1);
    expect(points[0]!.cumulative).toBe(100);
    expect(points[0]!.id).toBe('z');
  });

  it('excludes missing P&L trades from Best/Worst setup', () => {
    // With a single eligible P&L trade (+100) only Best can be filled.
    expect(pickExtremeTrade(partial, 'pnl', 'best')?.id).toBe('z');
    expect(pickExtremeTrade(partial, 'pnl', 'worst')).toBeNull();
  });

  it('still counts every trade for the R metric', () => {
    expect(metricSummary(partial, 'r').count).toBe(3);
    expect(cumulativeCurve(partial, 'r')).toHaveLength(3);
  });
});

/* 10. Negative P&L handling */
describe('negative P&L', () => {
  const losers: Trade[] = [
    makeTrade({ id: 'l1', openedAt: '2026-01-01T10:00:00Z', r: -1, pnl: -100, result: 'loss' }),
    makeTrade({ id: 'l2', openedAt: '2026-01-02T10:00:00Z', r: -2, pnl: -200, result: 'loss' }),
  ];

  it('accumulates negative values downward', () => {
    expect(cumulativeCurve(losers, 'pnl').map((p) => p.cumulative)).toEqual([-100, -300]);
    expect(metricSummary(losers, 'pnl').total).toBe(-300);
  });

  it('picks the worst setup by the most negative P&L', () => {
    expect(pickExtremeTrade(losers, 'pnl', 'worst')?.id).toBe('l2');
  });
});

/* 11. Journal Trade P&L only (never account-specific values) */
describe('Dashboard analytics use Journal Trade data only', () => {
  it('reads Trade.pnl and ignores any account-specific fields', () => {
    const journal = makeTrade({
      id: 'j1', openedAt: '2026-01-01T10:00:00Z', r: 2.16, pnl: 514, result: 'win',
    });

    // Simulate a trade carrying account-specific noise (`accountPnl`/`accountR`).
    // The analytics must still resolve to the Journal Trade's own numbers.
    const withAccountNoise = {
      ...journal,
      accountPnl: 250,
      accountR: 1,
    } as unknown as Trade;

    expect(metricValue(withAccountNoise, 'pnl')).toBe(514);
    expect(metricSummary([withAccountNoise], 'pnl').total).toBe(514);
    expect(cumulativeCurve([withAccountNoise], 'pnl')[0]!.cumulative).toBe(514);
  });

  it('is a pure function of Trade — same trade, same result regardless of context', () => {
    const journal = makeTrade({
      id: 'j2', openedAt: '2026-01-01T10:00:00Z', r: 1, pnl: 300, result: 'win',
    });
    // Two different "accounts" would have different payout values, but the
    // Dashboard always shows the Journal Trade's P&L.
    expect(metricValue(journal, 'pnl')).toBe(300);
  });
});

