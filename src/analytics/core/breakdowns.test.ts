import { describe, it, expect } from 'vitest';
import { SEED_TRADES } from '@/data/seed';
import { byCategory, allBreakdowns } from './breakdowns';

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
        'mtf',
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
