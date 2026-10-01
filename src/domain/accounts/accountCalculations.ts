import type { Account } from '@/domain/models/account';
import type { AccountTradeAttachment } from '@/domain/models/accountTradeAttachment';

export interface AccountTradeStats {
  totalTrades: number;

  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;

  winRate: number;

  totalPnl: number;
  averagePnl: number;

  bestTradePnl: number | null;
  worstTradePnl: number | null;

  highestWinningTrade: number | null;
  lowestWinningTrade: number | null;

  highestLosingTrade: number | null;
  lowestLosingTrade: number | null;
}

export interface AccountPerformance {
  startingBalance: number;

  currentBalance: number;

  totalPnl: number;

  profitTarget: number | null;

  profitTargetProgress: number | null;

  remainingProfitTarget: number | null;

  maxDrawdown: number | null;

  currentDrawdown: number;

  remainingDrawdown: number | null;

  consistencyLimit: number | null;

  consistencyPercentage: number | null;

  consistencyRemaining: number | null;

  consistencyPassed: boolean | null;
}

export interface AccountSummary {
  account: Account;

  performance: AccountPerformance;

  tradeStats: AccountTradeStats;
}

function getPnls(
  attachments: AccountTradeAttachment[]
): number[] {
  return attachments
    .map((attachment) => attachment.accountPnl)
    .filter(
      (pnl): pnl is number =>
        pnl != null && Number.isFinite(pnl)
    );
}

function calculateTradeStats(
  attachments: AccountTradeAttachment[]
): AccountTradeStats {
  const pnls = getPnls(attachments);

  const winningPnls = pnls.filter((pnl) => pnl > 0);
  const losingPnls = pnls.filter((pnl) => pnl < 0);

  const breakevenTrades = pnls.filter(
    (pnl) => pnl === 0
  ).length;

  const totalPnl = pnls.reduce(
    (sum, pnl) => sum + pnl,
    0
  );

  const totalTrades = attachments.length;

  const winningTrades = winningPnls.length;
  const losingTrades = losingPnls.length;

  const winRate =
    totalTrades > 0
      ? (winningTrades / totalTrades) * 100
      : 0;

  return {
    totalTrades,

    winningTrades,
    losingTrades,
    breakevenTrades,

    winRate,

    totalPnl,

    averagePnl:
      pnls.length > 0
        ? totalPnl / pnls.length
        : 0,

    bestTradePnl:
      pnls.length > 0
        ? Math.max(...pnls)
        : null,

    worstTradePnl:
      pnls.length > 0
        ? Math.min(...pnls)
        : null,

    highestWinningTrade:
      winningPnls.length > 0
        ? Math.max(...winningPnls)
        : null,

    lowestWinningTrade:
      winningPnls.length > 0
        ? Math.min(...winningPnls)
        : null,

    highestLosingTrade:
      losingPnls.length > 0
        ? Math.max(...losingPnls)
        : null,

    lowestLosingTrade:
      losingPnls.length > 0
        ? Math.min(...losingPnls)
        : null,
  };
}

function calculatePerformance(
  account: Account,
  attachments: AccountTradeAttachment[]
): AccountPerformance {
  const tradeStats = calculateTradeStats(attachments);

  const totalPnl = tradeStats.totalPnl;

  const startingBalance = account.accountSize;

  const currentBalance =
    startingBalance + totalPnl;

  const profitTarget =
    account.profitTarget;

  const profitTargetProgress =
    profitTarget != null && profitTarget > 0
      ? Math.max(
          0,
          (totalPnl / profitTarget) * 100
        )
      : null;

  const remainingProfitTarget =
    profitTarget != null
      ? Math.max(
          0,
          profitTarget - totalPnl
        )
      : null;

  /*
   * Current drawdown is calculated from the
   * account's starting balance and current P&L.
   *
   * Positive P&L = no drawdown.
   * Negative P&L = drawdown.
   */
  const currentDrawdown =
    totalPnl < 0
      ? Math.abs(totalPnl)
      : 0;

  const maxDrawdown =
    account.maxDrawdown;

  const remainingDrawdown =
    maxDrawdown != null
      ? Math.max(
          0,
          maxDrawdown - currentDrawdown
        )
      : null;

  /*
   * Consistency is measured as the largest
   * winning trade's contribution to total
   * positive P&L.
   *
   * Example:
   *
   * Total positive P&L = $1,000
   * Best winning trade = $300
   *
   * Consistency = 30%
   */
  const positivePnl = getPnls(attachments)
    .filter((pnl) => pnl > 0)
    .reduce((sum, pnl) => sum + pnl, 0);

  const bestWinningTrade =
    tradeStats.highestWinningTrade;

  const consistencyPercentage =
    positivePnl > 0 &&
    bestWinningTrade != null
      ? (bestWinningTrade / positivePnl) * 100
      : null;

  const consistencyLimit =
    account.consistencyLimit;

  const consistencyRemaining =
    consistencyLimit != null &&
    consistencyPercentage != null
      ? Math.max(
          0,
          consistencyLimit -
            consistencyPercentage
        )
      : null;

  const consistencyPassed =
    consistencyLimit != null &&
    consistencyPercentage != null
      ? consistencyPercentage <=
        consistencyLimit
      : null;

  return {
    startingBalance,

    currentBalance,

    totalPnl,

    profitTarget,

    profitTargetProgress,

    remainingProfitTarget,

    maxDrawdown,

    currentDrawdown,

    remainingDrawdown,

    consistencyLimit,

    consistencyPercentage,

    consistencyRemaining,

    consistencyPassed,
  };
}

export function calculateAccountSummary(
  account: Account,
  attachments: AccountTradeAttachment[]
): AccountSummary {
  const tradeStats =
    calculateTradeStats(attachments);

  const performance =
    calculatePerformance(
      account,
      attachments
    );

  return {
    account,
    performance,
    tradeStats,
  };
}