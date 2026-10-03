import { describe, it, expect } from 'vitest';
import { SEED_TRADES } from '@/data/seed';
import { byCategory, allBreakdowns } from './breakdowns';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import type { Trade } from '@/domain/models/trade';

describe('byCategory', () => {
  it('groups seed by dailyCandle with the right counts and totals', () => {
    // Seed by dailyCandle:
    //  Reversal [C2]: seed-01 (+1), seed-03 (0), seed-05 (+2)  →  3 trades, +3R
    //  Continuation [C3]: seed-02 (-1), seed-04 (+2)           →  2 trades, +1R
    const out = byCategory(SEED_TRADES, 'dailyCandle');
    expect(out.fieldKey).toBe('dailyCandle');
    expect(out.fieldLabel).toBe('Daily Candle');

    const reversal = out.buckets.find((b) => b.key === 'Reversal [C2]');
    const continuation = out.buckets.find((b) => b.key === 'Continuation [C3]');

    expect(reversal).toBeDefined();
    expect(reversal!.count).toBe(3);
    expect(reversal!.totalR).toBe(3);
    expect(reversal!.wins).toBe(2);
    expect(reversal!.bes).toBe(1);
    expect(reversal!.winRate).toBeCloseTo(2 / 3);

    expect(continuation).toBeDefined();
    expect(continuation!.count).toBe(2);
    expect(continuation!.totalR).toBe(1);
    expect(continuation!.wins).toBe(1);
    expect(continuation!.losses).toBe(1);
    expect(continuation!.winRate).toBeCloseTo(0.5);
  });

  it('sorts buckets by totalR desc (Reversal above Continuation)', () => {
    const out = byCategory(SEED_TRADES, 'dailyCandle');
    expect(out.buckets[0]!.key).toBe('Reversal [C2]');
    expect(out.buckets[1]!.key).toBe('Continuation [C3]');
  });

  it('handles boolean fields as YES/NO buckets', () => {
    // quarterOpen / driver are all false in seed → one bucket "NO" with all 5 trades.
    const out = byCategory(SEED_TRADES, 'quarterOpen');
    expect(out.buckets).toHaveLength(1);
    expect(out.buckets[0]!.key).toBe('NO');
    expect(out.buckets[0]!.count).toBe(5);
  });

  it('returns empty buckets for empty input', () => {
    const out = byCategory([], 'dailyCandle');
    expect(out.buckets).toEqual([]);
    expect(out.fieldLabel).toBe('Daily Candle');
  });
});

// Fixture where R-ranking and P&L-ranking disagree, so the metric-aware sort
// is observable. Journal Trade P&L only — never account attachment values.
function makeBucketTrade(o: {
  id: string;
  openedAt: string;
  r: number;
  pnl?: number;
  candle: string;
}): Trade {
  return {
    id: o.id,
    templateId: ACTIVE_TEMPLATE_ID,
    openedAt: o.openedAt,
    instrument: 'ES',
    direction: 'long',
    result: 'win',
    pnl: o.pnl,
    r: o.r,
    durationMin: 30,
    templateData: { dailyCandle: o.candle },
    createdAt: o.openedAt,
    updatedAt: o.openedAt,
  };
}

const SORT_TRADES: Trade[] = [
  makeBucketTrade({ id: 's1', openedAt: '2026-01-01T10:00:00Z', r: 5, pnl: 100, candle: 'Reversal [C2]' }),
  makeBucketTrade({ id: 's2', openedAt: '2026-01-02T10:00:00Z', r: 1, pnl: 900, candle: 'Continuation [C3]' }),
];

describe('byCategory metric-aware sorting', () => {
  it('sorts by totalR desc by default (existing R behaviour unchanged)', () => {
    const out = byCategory(SORT_TRADES, 'dailyCandle');
    expect(out.buckets.map((b) => b.key)).toEqual([
      'Reversal [C2]',
      'Continuation [C3]',
    ]);
    expect(out.buckets[0]!.totalR).toBe(5);
    expect(out.buckets[1]!.totalR).toBe(1);
  });

  it('sorts by totalPnl desc when the Dashboard requests P&L', () => {
    const out = byCategory(SORT_TRADES, 'dailyCandle', ACTIVE_TEMPLATE_ID, 'pnl');
    expect(out.buckets.map((b) => b.key)).toEqual([
      'Continuation [C3]',
      'Reversal [C2]',
    ]);
    expect(out.buckets[0]!.totalPnl).toBe(900);
    expect(out.buckets[1]!.totalPnl).toBe(100);
  });

  it('never counts a missing P&L as $0 in totalPnl', () => {
    const trades = [
      makeBucketTrade({ id: 'm1', openedAt: '2026-01-01T10:00:00Z', r: 2, candle: 'Reversal [C2]' }),
      makeBucketTrade({ id: 'm2', openedAt: '2026-01-02T10:00:00Z', r: 1, pnl: 250, candle: 'Reversal [C2]' }),
    ];
    const out = byCategory(trades, 'dailyCandle');
    const bucket = out.buckets[0]!;
    // The missing P&L is skipped; only the recorded 250 contributes.
    expect(bucket.totalPnl).toBe(250);
    expect(bucket.count).toBe(2);
  });
});

describe('allBreakdowns', () => {
  it('produces one breakdown per template field marked inStats: true', () => {
    const all = allBreakdowns(SEED_TRADES);
    const keys = all.map((b) => b.fieldKey);
    // From the default template: every field has inStats: true, except none excluded.
    // Day, Daily Candle, Daily Profile, H4 Candle, H4 Profile, M90/H1/M30,
    // Entry, Alignment, Module, Confluence, Quarter Open, Driver, Mistake
    expect(keys).toEqual(
      expect.arrayContaining([
        'dayOfWeek',
        'dailyCandle',
        'dailyProfile',
        'h4Candle',
        'h4Profile',
        'itf',
        'entry',
        'alignment',
        'module',
        'confluence',
        'quarterOpen',
        'driver',
        'mistake',
      ]),
    );
  });
});
