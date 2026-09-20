import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageTradeRepository } from './localStorageRepository';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';

const baseInput = {
  templateId: ACTIVE_TEMPLATE_ID,
  number: 99,
  openedAt: '2026-04-01T13:00:00.000Z',
  closedAt: '2026-04-01T13:30:00.000Z',
  instrument: 'ES',
  direction: 'long' as const,
  result: 'win' as const,
  r: 2,
  plannedRR: 2,
  durationMin: 30,
  templateData: { mistake: 'No mistake' },
};

beforeEach(() => {
  localStorage.clear();
});

describe('LocalStorageTradeRepository', () => {
  it('seeds trades on first read', async () => {
    const repo = new LocalStorageTradeRepository();
    const trades = await repo.list();
    expect(trades.length).toBeGreaterThan(0);
  });

  it('round-trips create → list → get', async () => {
    const repo = new LocalStorageTradeRepository();
    const created = await repo.create(baseInput);
    expect(created.id).toMatch(/^t_/);
    expect(created.createdAt).toBeTruthy();

    const fetched = await repo.get(created.id);
    expect(fetched).toEqual(created);
  });

  it('updates and removes', async () => {
    const repo = new LocalStorageTradeRepository();
    const created = await repo.create(baseInput);
    // Force a measurable gap between createdAt and the next updatedAt.
    await new Promise((r) => setTimeout(r, 5));
    const updated = await repo.update(created.id, { r: 3 });
    expect(updated.r).toBe(3);
    expect(updated.updatedAt).not.toBe(created.updatedAt);

    await repo.remove(created.id);
    expect(await repo.get(created.id)).toBeNull();
  });
});
