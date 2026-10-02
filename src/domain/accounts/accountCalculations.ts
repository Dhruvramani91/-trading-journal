import type { Account, AccountType, AccountPhase, AccountResult, AccountRuleMode, FuturesPhase, CfdPhase } from '@/domain/models/account';
import type { AccountTradeAttachment } from '@/domain/models/accountTradeAttachment';

/* -------------------------------------------------------------------------- */
/* Default account rules (standards)                                          */
/* -------------------------------------------------------------------------- */

export interface DefaultAccountRules {
  profitTarget: number | null;
  maxDrawdown: number | null;
}

export function getFuturesPhaseOptions(): { value: AccountPhase; label: string }[] {
  return [
    { value: 'evaluation', label: 'Evaluation' },
    { value: 'funded', label: 'Funded' },
  ];
}

export function getCfdPhaseOptions(): { value: AccountPhase; label: string }[] {
  return [
    { value: 'phase1', label: 'Phase 1' },
    { value: 'phase2', label: 'Phase 2' },
    { value: 'funded', label: 'Funded' },
  ];
}

export function getPhaseOptions(accountType: AccountType): { value: AccountPhase; label: string }[] {
  return accountType === 'futures' ? getFuturesPhaseOptions() : getCfdPhaseOptions();
}

export function isValidAccountPhase(accountType: AccountType, phase: AccountPhase): boolean {
  if (accountType === 'futures') {
    return phase === 'evaluation' || phase === 'funded';
  }
  return phase === 'phase1' || phase === 'phase2' || phase === 'funded';
}

export function assertValidAccountPhase(accountType: AccountType, phase: AccountPhase): void {
  if (!isValidAccountPhase(accountType, phase)) {
    throw new Error(`Invalid phase "${phase}" for account type "${accountType}".`);
  }
}

export function getAccountResultOptions(): { value: AccountResult; label: string }[] {
  return [
    { value: 'active', label: 'Active' },
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
  ];
}

export function getFuturesSizes(): { value: number; label: string }[] {
  return [
    { value: 25_000, label: '$25,000' },
    { value: 50_000, label: '$50,000' },
    { value: 100_000, label: '$100,000' },
  ];
}

export function getCfdSizes(): { value: number; label: string }[] {
  return [
    { value: 5_000, label: '$5,000' },
    { value: 10_000, label: '$10,000' },
    { value: 25_000, label: '$25,000' },
    { value: 50_000, label: '$50,000' },
    { value: 100_000, label: '$100,000' },
  ];
}

export function getAccountSizes(accountType: AccountType): { value: number; label: string }[] {
  return accountType === 'futures' ? getFuturesSizes() : getCfdSizes();
}

export function getDefaultFuturesRules(size: number, phase: FuturesPhase): DefaultAccountRules {
  if (phase === 'evaluation') {
    // Futures Evaluation rules
    if (size === 25_000) {
      return { profitTarget: 1_500, maxDrawdown: 1_000 };
    }
    if (size === 50_000) {
      return { profitTarget: 3_000, maxDrawdown: 2_000 };
    }
    if (size === 100_000) {
      return { profitTarget: 6_000, maxDrawdown: 3_000 };
    }
    // Fallback for any other size (e.g., existing 150K records)
    return {
      profitTarget: Math.round(size * 0.06),
      maxDrawdown: Math.round(size * 0.04),
    };
  }
  // Futures Funded - no evaluation profit target, keep existing or null
  return { profitTarget: null, maxDrawdown: null };
}

export function getDefaultCfdRules(size: number, phase: CfdPhase): DefaultAccountRules {
  if (phase === 'phase1') {
    return {
      profitTarget: Math.round(size * 0.08),
      maxDrawdown: Math.round(size * 0.10),
    };
  }
  if (phase === 'phase2') {
    return {
      profitTarget: Math.round(size * 0.04),
      maxDrawdown: Math.round(size * 0.06),
    };
  }
  // CFD Funded - no profit target
  return { profitTarget: null, maxDrawdown: null };
}

export function getDefaultAccountRules(
  accountType: AccountType,
  size: number,
  phase: AccountPhase
): DefaultAccountRules {
  if (accountType === 'futures') {
    return getDefaultFuturesRules(size, phase as FuturesPhase);
  }
  return getDefaultCfdRules(size, phase as CfdPhase);
}

/**
 * Resolves the effective profit target / max drawdown for an account.
 *
 * The account's SAVED rule values are authoritative:
 * - `custom` accounts keep exactly what was stored (never overwritten).
 * - `standard` accounts use stored values when present, otherwise fall back to
 *   the configured standard defaults for the account type/size/phase.
 *
 * This is the single source of truth used by the repository when loading an
 * account, so pages never fabricate rule values themselves.
 */
export function resolveAccountRules(
  accountType: AccountType,
  size: number,
  phase: AccountPhase,
  ruleMode: AccountRuleMode,
  storedProfitTarget: number | null,
  storedMaxDrawdown: number | null
): DefaultAccountRules {
  if (ruleMode === 'custom') {
    return {
      profitTarget: storedProfitTarget,
      maxDrawdown: storedMaxDrawdown,
    };
  }

  const defaults = getDefaultAccountRules(accountType, size, phase);

  return {
    profitTarget: storedProfitTarget ?? defaults.profitTarget,
    maxDrawdown: storedMaxDrawdown ?? defaults.maxDrawdown,
  };
}

export function getPhaseLabel(phase: AccountPhase | null | undefined): string {
  if (phase == null) return '—';
  const labels: Record<AccountPhase, string> = {
    evaluation: 'Evaluation',
    funded: 'Funded',
    phase1: 'Phase 1',
    phase2: 'Phase 2',
  };
  return labels[phase] ?? phase;
}

export function getResultLabel(result: AccountResult): string {
  const labels: Record<AccountResult, string> = {
    active: 'Active',
    passed: 'Passed',
    failed: 'Failed',
  };
  return labels[result] ?? result;
}

export function getPhaseTone(phase: AccountPhase | null | undefined): 'accent' | 'win' | 'neutral' {
  if (phase === 'funded') return 'win';
  if (phase === 'evaluation' || phase === 'phase1' || phase === 'phase2') return 'accent';
  return 'neutral';
}

export function getResultTone(result: AccountResult): 'win' | 'loss' | 'neutral' {
  if (result === 'passed') return 'win';
  if (result === 'failed') return 'loss';
  return 'neutral';
}

/* -------------------------------------------------------------------------- */
/* Account calculations                                                       */
/* -------------------------------------------------------------------------- */

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

  totalR: number;
  averageR: number;
  bestR: number | null;
  worstR: number | null;

  profitFactor: number | null;
  averageWinner: number | null;
  averageLoser: number | null;
  expectancy: number | null;

  // Consistency statistic (calculated from attached trades)
  consistencyPercentage: number | null;
  bestTradingDayProfit: number | null;
  totalPositiveProfit: number | null;
}

export interface EquityPoint {
  date: string;
  dateLabel: string;
  cumulativePnl: number;
  tradeCount: number;
}

export interface AccountPerformance {
  startingBalance: number;

  currentBalance: number;

  totalPnl: number;

  pnlPercentage: number | null;

  profitTarget: number | null;

  profitTargetProgress: number | null;

  remainingProfitTarget: number | null;

  maxDrawdown: number | null;

  currentDrawdown: number;

  remainingDrawdown: number | null;
}

export interface AccountSummary {
  account: Account;

  performance: AccountPerformance;

  tradeStats: AccountTradeStats;

  equityCurve: EquityPoint[];
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

function getRs(
  attachments: AccountTradeAttachment[]
): number[] {
  return attachments
    .map((attachment) => attachment.accountR)
    .filter(
      (r): r is number => r != null && Number.isFinite(r)
    );
}

/**
 * Canonical P&L resolution order (read-only fallback, no DB writes):
 * 1. attachment.accountPnl (account-specific override)
 * 2. linked journal trade's numeric pnl (canonical Trade.pnl from trades.pnl)
 * 3. null = "no realized P&L available" (never coerced to $0 in stats).
 */
export function resolveAttachmentPnl(
  attachment: AccountTradeAttachment,
  tradePnl?: number | null
): number | null {
  if (attachment.accountPnl != null && Number.isFinite(attachment.accountPnl)) {
    return attachment.accountPnl;
  }
  if (tradePnl != null && Number.isFinite(tradePnl)) {
    return tradePnl;
  }
  return null;
}

/**
 * Attachments enriched with their journal trade's canonical pnl, so legacy
 * attachments created with account_pnl = NULL still compute from trades.pnl
 * without requiring detach/reattach. Does not mutate inputs.
 */
export type AttachmentWithTradePnl = {
  attachment: AccountTradeAttachment;
  tradePnl?: number | null;
};

export function enrichAttachmentsWithTradePnl(
  attachments: AccountTradeAttachment[],
  tradesById: Map<string, number | null | undefined> | Record<string, number | null | undefined>
): AccountTradeAttachment[] {
  const lookup =
    tradesById instanceof Map
      ? (id: string) => tradesById.get(id)
      : (id: string) => tradesById[id];
  return attachments.map((attachment) => {
    if (attachment.accountPnl != null && Number.isFinite(attachment.accountPnl)) {
      return attachment;
    }
    const tradePnl = lookup(attachment.tradeId);
    if (tradePnl != null && Number.isFinite(tradePnl)) {
      return { ...attachment, accountPnl: tradePnl };
    }
    return attachment;
  });
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

  // Trades with no realized P&L are excluded from counts/rates entirely.
  // totalTrades stays as attached count for display, but win rate uses only
  // decided trades (wins + losses).
  const totalTrades = attachments.length;

  const winningTrades = winningPnls.length;
  const losingTrades = losingPnls.length;

  const decidedTrades = winningTrades + losingTrades;

  const winRate =
    decidedTrades > 0
      ? (winningTrades / decidedTrades) * 100
      : 0;

  const rs = getRs(attachments);
  const totalR = rs.reduce((sum, r) => sum + r, 0);

  const grossWinners = pnls.filter((pnl) => pnl > 0);
  const grossLosers = pnls.filter((pnl) => pnl < 0);

  const sumWinners = grossWinners.reduce(
    (sum, pnl) => sum + pnl,
    0
  );
  const sumLosers = grossLosers.reduce(
    (sum, pnl) => sum + pnl,
    0
  );
  const sumLosersAbs = Math.abs(sumLosers);

  // Profit factor: gross wins / |gross losses|.
  // All wins (no losses) => Infinity; no wins and no losses => null (—).
  const profitFactor =
    sumLosersAbs > 0
      ? sumWinners / sumLosersAbs
      : sumWinners > 0
        ? Number.POSITIVE_INFINITY
        : null;

  const averageWinner =
    grossWinners.length > 0
      ? sumWinners / grossWinners.length
      : null;

  // Signed average of losing trades (negative), i.e. gross losing P&L / count.
  const averageLoser =
    grossLosers.length > 0
      ? sumLosers / grossLosers.length
      : null;

  const expectancy =
    rs.length > 0
      ? totalR / rs.length
      : null;

  // Consistency calculation: group by trading day, find best day, divide by total positive profit
  const consistencyData = calculateConsistency(attachments);

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

    totalR,
    averageR: rs.length > 0 ? totalR / rs.length : 0,
    bestR: rs.length > 0 ? Math.max(...rs) : null,
    worstR: rs.length > 0 ? Math.min(...rs) : null,

    profitFactor,
    averageWinner,
    averageLoser,
    expectancy,

    // Consistency statistic
    consistencyPercentage: consistencyData.percentage,
    bestTradingDayProfit: consistencyData.bestTradingDayProfit,
    totalPositiveProfit: consistencyData.totalPositiveProfit,
  };
}

export interface ConsistencyData {
  percentage: number | null;
  bestTradingDayProfit: number;
  totalPositiveProfit: number;
}

function calculateConsistency(attachments: AccountTradeAttachment[]): ConsistencyData {
  if (attachments.length === 0) {
    return { percentage: null, bestTradingDayProfit: 0, totalPositiveProfit: 0 };
  }

  // Group trades by trading day (using attachedAt date)
  const dailyPnlMap = new Map<string, number>();

  attachments.forEach((attachment) => {
    // Null/undefined P&L = "no realized P&L available": skip entirely.
    // Never coerce to $0 (would corrupt best-day / totals).
    const raw = attachment.accountPnl;
    if (raw == null || !Number.isFinite(raw)) return;
    const pnl: number = raw;
    const attachedAt: string = attachment.attachedAt ?? '';
    if (!attachedAt) return;
    const parsed = new Date(attachedAt);
    if (Number.isNaN(parsed.getTime())) return;
    const date: string = parsed.toISOString().split('T')[0] ?? attachedAt; // YYYY-MM-DD
    const existing: number = dailyPnlMap.get(date) ?? 0;
    dailyPnlMap.set(date, existing + pnl);
  });

  // Find best trading day (only positive days)
  let bestTradingDayProfit = 0;
  for (const dailyPnl of dailyPnlMap.values()) {
    if (dailyPnl > bestTradingDayProfit) {
      bestTradingDayProfit = dailyPnl;
    }
  }

  // Calculate total positive profit
  const totalPositiveProfit = Array.from(dailyPnlMap.values())
    .filter((pnl) => pnl > 0)
    .reduce((sum, pnl) => sum + pnl, 0);

  // Calculate consistency percentage
  const percentage =
    totalPositiveProfit > 0 && bestTradingDayProfit > 0
      ? (bestTradingDayProfit / totalPositiveProfit) * 100
      : null;

  return { percentage, bestTradingDayProfit, totalPositiveProfit };
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

   const pnlPercentage =
     startingBalance > 0
       ? (totalPnl / startingBalance) * 100
       : null;

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

  return {
    startingBalance,

    currentBalance,

    totalPnl,

    pnlPercentage,

    profitTarget,

    profitTargetProgress,

    remainingProfitTarget,

    maxDrawdown,

    currentDrawdown,

    remainingDrawdown,
  };
}

/* -------------------------------------------------------------------------- */
/* Equity curve                                                               */
/* -------------------------------------------------------------------------- */

export function calculateEquityCurve(
  attachments: AccountTradeAttachment[]
): EquityPoint[] {
  if (attachments.length === 0) return [];

  const ordered = [...attachments].sort(
    (a, b) =>
      new Date(a.attachedAt).getTime() -
      new Date(b.attachedAt).getTime()
  );

  const points: EquityPoint[] = [];

  // Start at $0 cumulative; skip trades with missing P&L entirely
  // (never coerce null to $0, never emit a flat point for them).
  let cumulative = 0;
  let tradeCount = 0;

  for (const attachment of ordered) {
    const raw = attachment.accountPnl;
    if (raw == null || !Number.isFinite(raw)) continue;

    cumulative += raw;
    tradeCount += 1;

    const d = new Date(attachment.attachedAt);
    const dateLabel = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    points.push({
      date: attachment.attachedAt,
      dateLabel,
      cumulativePnl: cumulative,
      tradeCount,
    });
  }

  return points;
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

  const equityCurve =
    calculateEquityCurve(attachments);

  return {
    account,
    performance,
    tradeStats,
    equityCurve,
  };
}