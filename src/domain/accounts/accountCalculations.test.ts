import { describe, expect, it } from 'vitest';

import {
  calculateAccountSummary,
  calculateEquityCurve,
  enrichAttachmentsWithTradePnl,
  isValidAccountPhase,
  resolveAttachmentPnl,
} from './accountCalculations';

import type { Account } from '@/domain/models/account';
import type { AccountTradeAttachment } from '@/domain/models/accountTradeAttachment';

function createAccount(
  overrides: Partial<Account> = {}
): Account {
  return {
    id: 'account-1',
    userId: 'user-1',
    name: 'Test Account',
    accountType: 'futures',
    phase: 'evaluation',
    result: 'active',
    accountSize: 25_000,
    ruleMode: 'standard',
    profitTarget: 1_500,
    maxDrawdown: 1_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createAttachment(
  pnl: number | null | undefined,
  overrides: Partial<AccountTradeAttachment> = {}
): AccountTradeAttachment {
  return {
    id: crypto.randomUUID(),
    accountId: 'account-1',
    tradeId: crypto.randomUUID(),
    userId: 'user-1',
    accountPnl: pnl ?? null,
    accountR: null,
    quantity: null,
    attachedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateAccountSummary', () => {
  it('calculates total P&L and current balance', () => {
    const account = createAccount();

    const attachments = [
      createAttachment(300),
      createAttachment(-100),
      createAttachment(200),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    expect(summary.performance.totalPnl).toBe(400);

    expect(
      summary.performance.currentBalance
    ).toBe(25_400);
  });

  it('calculates trade statistics', () => {
    const account = createAccount();

    const attachments = [
      createAttachment(300),
      createAttachment(200),
      createAttachment(-100),
      createAttachment(0),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    expect(
      summary.tradeStats.totalTrades
    ).toBe(4);

    expect(
      summary.tradeStats.winningTrades
    ).toBe(2);

    expect(
      summary.tradeStats.losingTrades
    ).toBe(1);

    expect(
      summary.tradeStats.breakevenTrades
    ).toBe(1);

    // Win rate uses decided trades (wins + losses): 2 / 3 * 100 = 66.67%
    expect(
      summary.tradeStats.winRate
    ).toBeCloseTo(66.6667, 2);
  });

  it('uses the shared trade statistics for performance and account totals', () => {
    const account = createAccount();
    const attachments = [
      createAttachment(400, { accountR: 2 }),
      createAttachment(-100, { accountR: -0.5 }),
      createAttachment(0, { accountR: 0 }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    expect(summary.tradeStats).toMatchObject({
      totalTrades: 3,
      winningTrades: 1,
      losingTrades: 1,
      breakevenTrades: 1,
      totalPnl: 300,
      totalR: 1.5,
      winRate: 50,
    });
    expect(summary.performance).toMatchObject({
      totalPnl: summary.tradeStats.totalPnl,
      currentBalance: 25_300,
      pnlPercentage: 1.2,
    });
  });

  it('calculates best and worst trade', () => {
    const account = createAccount();

    const attachments = [
      createAttachment(500),
      createAttachment(-250),
      createAttachment(100),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    expect(
      summary.tradeStats.bestTradePnl
    ).toBe(500);

    expect(
      summary.tradeStats.worstTradePnl
    ).toBe(-250);
  });

  it('calculates profit target progress', () => {
    const account = createAccount({
      profitTarget: 1_000,
    });

    const attachments = [
      createAttachment(250),
      createAttachment(250),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    expect(
      summary.performance.totalPnl
    ).toBe(500);

    expect(
      summary.performance.profitTargetProgress
    ).toBe(50);

    expect(
      summary.performance.remainingProfitTarget
    ).toBe(500);
  });

  it('does not allow profit target progress to be negative', () => {
    const account = createAccount({
      profitTarget: 1_000,
    });

    const attachments = [
      createAttachment(-500),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    expect(
      summary.performance.profitTargetProgress
    ).toBe(0);

    expect(
      summary.performance.remainingProfitTarget
    ).toBe(1_500);
  });

  it('calculates drawdown from negative account P&L', () => {
    const account = createAccount({
      maxDrawdown: 1_000,
    });

    const attachments = [
      createAttachment(-400),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    expect(
      summary.performance.currentDrawdown
    ).toBe(400);

    expect(
      summary.performance.remainingDrawdown
    ).toBe(600);
  });

  it('calculates consistency percentage from trading days', () => {
    const account = createAccount();

    const attachments = [
      { ...createAttachment(300), tradeOpenedAt: '2026-01-01T10:00:00.000Z' }, // Day 1: +300
      { ...createAttachment(200), tradeOpenedAt: '2026-01-01T14:00:00.000Z' }, // Day 1: +200 (total Day 1 = +500)
      { ...createAttachment(500), tradeOpenedAt: '2026-01-02T10:00:00.000Z' }, // Day 2: +500
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    /*
     * Day 1 P&L = 500 (300 + 200)
     * Day 2 P&L = 500
     * Positive days: both days (500 + 500 = 1000)
     * Best trading day = 500
     * Consistency = 500 / 1000 * 100 = 50%
     */
    expect(
      summary.tradeStats.consistencyPercentage
    ).toBe(50);

    expect(
      summary.tradeStats.bestTradingDayProfit
    ).toBe(500);

    expect(
      summary.tradeStats.totalPositiveProfit
    ).toBe(1000);
  });

  it('handles an account with no attached trades', () => {
    const account = createAccount();

    const summary = calculateAccountSummary(
      account,
      []
    );

    expect(
      summary.performance.totalPnl
    ).toBe(0);

    expect(
      summary.performance.currentBalance
    ).toBe(25_000);

    expect(
      summary.tradeStats.totalTrades
    ).toBe(0);

    expect(
      summary.tradeStats.winRate
    ).toBe(0);

    expect(
      summary.tradeStats.bestTradePnl
    ).toBeNull();

    expect(
      summary.tradeStats.worstTradePnl
    ).toBeNull();
  });

  it('calculates R statistics from account-specific R values', () => {
    const account = createAccount();

    const attachments = [
      createAttachment(300, { accountR: 2 }),
      createAttachment(-100, { accountR: -1 }),
      createAttachment(200, { accountR: 1.5 }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    expect(summary.tradeStats.totalR).toBe(2.5);
    expect(summary.tradeStats.averageR).toBeCloseTo(0.833, 2);
    expect(summary.tradeStats.bestR).toBe(2);
    expect(summary.tradeStats.worstR).toBe(-1);
  });

  it('ignores null accountR values when calculating R stats', () => {
    const account = createAccount();

    const attachments = [
      createAttachment(300, { accountR: 2 }),
      createAttachment(-100, { accountR: null }),
      createAttachment(200, { accountR: 1.5 }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    expect(summary.tradeStats.totalR).toBe(3.5);
    expect(summary.tradeStats.bestR).toBe(2);
    expect(summary.tradeStats.worstR).toBe(1.5);
  });

  it('calculates P&L percentage', () => {
    const account = createAccount({ accountSize: 25_000 });

    const attachments = [
      createAttachment(2_500),
      createAttachment(-500),
    ];

    const summary = calculateAccountSummary(account, attachments);

    expect(summary.performance.totalPnl).toBe(2_000);
    expect(summary.performance.pnlPercentage).toBe(8);
  });

  it('validates futures phases (evaluation|funded only)', () => {
    expect(isValidAccountPhase('futures', 'evaluation')).toBe(true);
    expect(isValidAccountPhase('futures', 'funded')).toBe(true);
    expect(isValidAccountPhase('futures', 'phase1')).toBe(false);
    expect(isValidAccountPhase('futures', 'phase2')).toBe(false);
  });

  it('validates cfd phases (phase1|phase2|funded only)', () => {
    expect(isValidAccountPhase('cfd', 'phase1')).toBe(true);
    expect(isValidAccountPhase('cfd', 'phase2')).toBe(true);
    expect(isValidAccountPhase('cfd', 'funded')).toBe(true);
    expect(isValidAccountPhase('cfd', 'evaluation')).toBe(false);
  });

  it('mixed trades (+100, -50, +200): net, win rate, profit factor, extremes, averages', () => {
    const account = createAccount();
    const attachments = [
      createAttachment(100, { attachedAt: '2026-01-01T10:00:00.000Z' }),
      createAttachment(-50, { attachedAt: '2026-01-02T10:00:00.000Z' }),
      createAttachment(200, { attachedAt: '2026-01-03T10:00:00.000Z' }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    // Net Realized P&L = +250
    expect(summary.performance.totalPnl).toBe(250);
    expect(summary.tradeStats.totalPnl).toBe(250);
    // Win Rate = 2 / (2 + 1) * 100 = 66.67%
    expect(summary.tradeStats.winningTrades).toBe(2);
    expect(summary.tradeStats.losingTrades).toBe(1);
    expect(summary.tradeStats.winRate).toBeCloseTo(66.6667, 2);
    // Profit Factor = 300 / 50 = 6
    expect(summary.tradeStats.profitFactor).toBe(6);
    // Extremes
    expect(summary.tradeStats.highestWinningTrade).toBe(200);
    expect(summary.tradeStats.lowestWinningTrade).toBe(100);
    expect(summary.tradeStats.lowestLosingTrade).toBe(-50);
    // Averages
    expect(summary.tradeStats.averageWinner).toBe(150);
    expect(summary.tradeStats.averageLoser).toBe(-50);
  });

  it('all wins (+100, +200): 100% win rate, infinite profit factor, no worst loss', () => {
    const account = createAccount();
    const attachments = [
      createAttachment(100, { attachedAt: '2026-01-01T10:00:00.000Z' }),
      createAttachment(200, { attachedAt: '2026-01-02T10:00:00.000Z' }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    expect(summary.performance.totalPnl).toBe(300);
    expect(summary.tradeStats.winningTrades).toBe(2);
    expect(summary.tradeStats.losingTrades).toBe(0);
    expect(summary.tradeStats.winRate).toBe(100);
    expect(summary.tradeStats.profitFactor).toBe(Number.POSITIVE_INFINITY);
    expect(summary.tradeStats.highestWinningTrade).toBe(200);
    expect(summary.tradeStats.lowestWinningTrade).toBe(100);
    expect(summary.tradeStats.lowestLosingTrade).toBeNull();
    expect(summary.tradeStats.averageWinner).toBe(150);
    expect(summary.tradeStats.averageLoser).toBeNull();
  });

  it('all losses (-100, -50): 0% win rate, zero profit factor, no wins', () => {
    const account = createAccount();
    const attachments = [
      createAttachment(-100, { attachedAt: '2026-01-01T10:00:00.000Z' }),
      createAttachment(-50, { attachedAt: '2026-01-02T10:00:00.000Z' }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    expect(summary.performance.totalPnl).toBe(-150);
    expect(summary.tradeStats.winningTrades).toBe(0);
    expect(summary.tradeStats.losingTrades).toBe(2);
    expect(summary.tradeStats.winRate).toBe(0);
    expect(summary.tradeStats.profitFactor).toBe(0);
    expect(summary.tradeStats.highestWinningTrade).toBeNull();
    expect(summary.tradeStats.lowestWinningTrade).toBeNull();
    expect(summary.tradeStats.lowestLosingTrade).toBe(-100);
    expect(summary.tradeStats.averageWinner).toBeNull();
    expect(summary.tradeStats.averageLoser).toBe(-75);
  });

  it('missing P&L: null/undefined trades are excluded, never coerced to $0', () => {
    const account = createAccount();
    const attachments = [
      createAttachment(100, { attachedAt: '2026-01-01T10:00:00.000Z' }),
      createAttachment(null, { attachedAt: '2026-01-02T10:00:00.000Z' }),
      createAttachment(undefined, { attachedAt: '2026-01-03T10:00:00.000Z' }),
    ];

    const summary = calculateAccountSummary(account, attachments);

    // Only the +100 counts
    expect(summary.performance.totalPnl).toBe(100);
    expect(summary.tradeStats.winningTrades).toBe(1);
    expect(summary.tradeStats.losingTrades).toBe(0);
    expect(summary.tradeStats.winRate).toBe(100);
    expect(summary.tradeStats.profitFactor).toBe(Number.POSITIVE_INFINITY);
    // Equity curve skips missing-P&L trades: single point at 100
    const curve = calculateEquityCurve(attachments);
    expect(curve.map((p) => p.cumulativePnl)).toEqual([100]);
  });

  it('equity curve chronology: (+100, -50, +200) yields [100, 50, 250]', () => {
    const attachments = [
      createAttachment(200, { attachedAt: '2026-01-03T10:00:00.000Z' }),
      createAttachment(100, { attachedAt: '2026-01-01T10:00:00.000Z' }),
      createAttachment(-50, { attachedAt: '2026-01-02T10:00:00.000Z' }),
    ];

    const curve = calculateEquityCurve(attachments);

    // Sorted chronologically regardless of input order
    expect(curve.map((p) => p.cumulativePnl)).toEqual([100, 50, 250]);
  });

  it('resolveAttachmentPnl prefers account override, falls back to journal trade pnl', () => {
    const base = createAttachment(null);
    expect(resolveAttachmentPnl(base, 123)).toBe(123);
    expect(resolveAttachmentPnl(base, null)).toBeNull();
    expect(resolveAttachmentPnl(base, undefined)).toBeNull();
    expect(
      resolveAttachmentPnl(createAttachment(50), 123)
    ).toBe(50);
  });

  it('enrichAttachmentsWithTradePnl backfills legacy NULL accountPnl from trades.pnl', () => {
    const a1 = createAttachment(null, { tradeId: 't1' });
    const a2 = createAttachment(75, { tradeId: 't2' });
    const enriched = enrichAttachmentsWithTradePnl([a1, a2], {
      t1: { pnl: 100 },
      t2: { pnl: 200 },
    });
    expect(enriched[0]?.accountPnl).toBe(100);
    // Existing account-specific override is preserved
    expect(enriched[1]?.accountPnl).toBe(75);
  });
});
