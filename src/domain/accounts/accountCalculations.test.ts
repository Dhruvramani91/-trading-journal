import { describe, expect, it } from 'vitest';

import {
  calculateAccountSummary,
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
    accountSize: 25_000,
    ruleMode: 'standard',
    profitTarget: 1_500,
    maxDrawdown: 1_000,
    consistencyLimit: 40,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createAttachment(
  pnl: number,
  overrides: Partial<AccountTradeAttachment> = {}
): AccountTradeAttachment {
  return {
    id: crypto.randomUUID(),
    accountId: 'account-1',
    tradeId: crypto.randomUUID(),
    userId: 'user-1',
    accountPnl: pnl,
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

    expect(
      summary.tradeStats.winRate
    ).toBe(50);
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

  it('calculates consistency percentage', () => {
    const account = createAccount({
      consistencyLimit: 40,
    });

    const attachments = [
      createAttachment(300),
      createAttachment(200),
      createAttachment(500),
    ];

    const summary = calculateAccountSummary(
      account,
      attachments
    );

    /*
     * Positive P&L = 1,000
     * Best trade = 500
     * Consistency = 50%
     */
    expect(
      summary.performance.consistencyPercentage
    ).toBe(50);

    expect(
      summary.performance.consistencyPassed
    ).toBe(false);

    expect(
      summary.performance.consistencyRemaining
    ).toBe(0);
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
});