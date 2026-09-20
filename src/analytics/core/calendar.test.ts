import { describe, it, expect } from 'vitest';
import { byDay } from './calendar';
import { dayKey } from './date';
import type { Trade } from '@/domain/models/trade';
import { SEED_TRADES } from '@/data/seed';

function makeTrade(overrides: Partial<Trade> & { openedAt: string; r: number; result: Trade['result'] }): Trade {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    templateId: 'default-ict-2026',
    number: 1,
    openedAt: overrides.openedAt,
    closedAt: overrides.closedAt,
    instrument: overrides.instrument ?? 'ES',
    direction: overrides.direction ?? 'long',
    result: overrides.result,
    r: overrides.r,
    durationMin: 30,
    templateData: {},
    createdAt: overrides.openedAt,
    updatedAt: overrides.openedAt,
  };
}

describe('dayKey', () => {
  it('formats ISO as YYYY-MM-DD', () => {
    // Use a date that won't be timezone-shifted.
    expect(dayKey('2026-05-15T12:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('byDay', () => {
  it('groups seed by day, summing R', () => {
    // Seed trades span Feb 2, Mar 3, Mar 5, Mar 9, Mar 16 — five different days.
    const days = byDay(SEED_TRADES);
    expect(days).toHaveLength(5);
    const totals = days.map((d) => d.totalR);
    expect(totals.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('returns one entry per day with the right counts', () => {
    const trades: Trade[] = [
      makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: 1, result: 'win' }),
      makeTrade({ openedAt: '2026-01-01T15:00:00Z', r: -1, result: 'loss' }),
      makeTrade({ openedAt: '2026-01-02T10:00:00Z', r: 2, result: 'win' }),
    ];
    const days = byDay(trades);
    expect(days).toHaveLength(2);
    expect(days[0]!.date).toBe('2026-01-01');
    expect(days[0]!.totalR).toBe(0);
    expect(days[0]!.count).toBe(2);
    expect(days[0]!.wins).toBe(1);
    expect(days[0]!.losses).toBe(1);
    expect(days[1]!.date).toBe('2026-01-02');
    expect(days[1]!.totalR).toBe(2);
  });
});
