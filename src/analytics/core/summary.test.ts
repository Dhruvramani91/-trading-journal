import { describe, it, expect } from 'vitest';
import { SEED_TRADES } from '@/data/seed';
import { summary } from './summary';
import { equityCurve } from './equity';
import type { Trade } from '@/domain/models/trade';

function makeTrade(overrides: Partial<Trade> & { openedAt: string; r: number; result: Trade['result'] }): Trade {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    templateId: 'default-ict-2026',
    number: overrides.number,
    openedAt: overrides.openedAt,
    closedAt: overrides.closedAt,
    instrument: overrides.instrument ?? 'ES',
    direction: overrides.direction ?? 'long',
    result: overrides.result,
    r: overrides.r,
    plannedRR: overrides.plannedRR,
    durationMin: overrides.durationMin ?? 30,
    templateData: overrides.templateData ?? {},
    notes: overrides.notes,
    createdAt: overrides.openedAt,
    updatedAt: overrides.openedAt,
  };
}

describe('summary', () => {
  it('returns zeroes for an empty set', () => {
    const s = summary([]);
    expect(s).toEqual({
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
    });
  });

  it('matches the seed data: 3 wins, 1 loss, 1 BE, +4R total, 60% WR', () => {
    // SEED_TRADES:
    //  +1, -1, 0, +2, +2  →  totalR = +4, wins = 3, count = 5, winRate = 0.6
    const s = summary(SEED_TRADES);
    expect(s.count).toBe(5);
    expect(s.wins).toBe(3);
    expect(s.losses).toBe(1);
    expect(s.bes).toBe(1);
    expect(s.totalR).toBe(4);
    expect(s.avgR).toBeCloseTo(0.8);
    expect(s.winRate).toBeCloseTo(0.6);
    expect(s.bestR).toBe(2);
    expect(s.worstR).toBe(-1);
    expect(s.expectancy).toBeCloseTo(0.8);
  });

  it('tracks longest win/loss streaks correctly (chronological)', () => {
    // Chronological order of seed by openedAt: seed-01 (W), seed-02 (L), seed-03 (BE), seed-04 (W), seed-05 (W)
    const s = summary(SEED_TRADES);
    expect(s.longestWinStreak).toBe(2); // seed-04 then seed-05
    expect(s.longestLossStreak).toBe(1);
  });

  it('computes max drawdown of the seed equity curve', () => {
    // Chronological cumR: 1, 0, 0, 2, 4
    // Drawdown = (peak so far) - current.
    //   idx 0: peak 1, cur 1  → dd 0
    //   idx 1: peak 1, cur 0  → dd 1
    //   idx 2: peak 1, cur 0  → dd 1
    //   idx 3: peak 2, cur 2  → dd 0
    //   idx 4: peak 4, cur 4  → dd 0
    const s = summary(SEED_TRADES);
    expect(s.maxDrawdownR).toBe(1);
  });

  it('averages plannedRR over trades that have one', () => {
    // Seed: plannedRR 3, 2, 2, 3, 2 → sum 12 / 5 = 2.4
    const s = summary(SEED_TRADES);
    expect(s.avgRR).toBeCloseTo(2.4);
  });

  it('handles a hand-built fixture with deep streaks and big drawdown', () => {
    const trades: Trade[] = [
      makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: 2, result: 'win' }),
      makeTrade({ openedAt: '2026-01-02T10:00:00Z', r: 1, result: 'win' }),
      makeTrade({ openedAt: '2026-01-03T10:00:00Z', r: 1, result: 'win' }),
      makeTrade({ openedAt: '2026-01-04T10:00:00Z', r: -1, result: 'loss' }),
      makeTrade({ openedAt: '2026-01-05T10:00:00Z', r: -2, result: 'loss' }),
      makeTrade({ openedAt: '2026-01-06T10:00:00Z', r: -1, result: 'loss' }),
      makeTrade({ openedAt: '2026-01-07T10:00:00Z', r: 3, result: 'win' }),
    ];
    const s = summary(trades);
    expect(s.count).toBe(7);
    expect(s.wins).toBe(4);
    expect(s.losses).toBe(3);
    expect(s.totalR).toBe(3);
    expect(s.longestWinStreak).toBe(3);
    expect(s.longestLossStreak).toBe(3);
    // CumR: 2, 3, 4, 3, 1, 0, 3 → peak 4 at index 2; max DD from there is 4-0=4.
    expect(s.maxDrawdownR).toBe(4);
  });
});

describe('equityCurve', () => {
  it('returns chronological, cumulative points', () => {
    const points = equityCurve(SEED_TRADES);
    expect(points[0]!.cumR).toBe(1);
    expect(points[1]!.cumR).toBe(0);
    expect(points[2]!.cumR).toBe(0);
    expect(points[3]!.cumR).toBe(2);
    expect(points[4]!.cumR).toBe(4);
    expect(points.length).toBe(SEED_TRADES.length);
  });

  it('returns [] for an empty set', () => {
    expect(equityCurve([])).toEqual([]);
  });
});
