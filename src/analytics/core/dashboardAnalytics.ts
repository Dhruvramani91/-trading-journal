import type { Trade, TemplateDefinition } from '@/domain/models/trade';
import type { DashboardMetric } from './metrics';
import { metricValue } from './metrics';
import { getTemplate, TEMPLATES } from '@/domain/templates/registry';
import { DEFAULT_TEMPLATE } from '@/domain/templates/default';

export type TimeframeFilter = '7d' | '30d' | '90d' | 'all';

export interface RadarMetricScore {
  label: string;
  value: number; // 0 to 100 for radar plotting
  displayValue: string;
}

export interface TraderRadarScore {
  overallScore: number; // 0 to 100
  axes: [
    RadarMetricScore, // Win %
    RadarMetricScore, // Profit factor
    RadarMetricScore, // Avg win/loss
    RadarMetricScore, // Recovery factor
    RadarMetricScore, // Max drawdown
    RadarMetricScore, // Consistency
  ];
}

export interface PeriodOverview {
  peakValue: number;
  peakDate: string | null;
  maxDrawdownValue: number;
  maxDrawdownPct: number;
  winStreakDays: number;
  bestDayValue: number;
  bestDayDate: string | null;
  tradingDaysCount: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  winRate: number; // 0 to 100
  avgMetric: number; // R or PnL or duration
  displayMetric?: string;
}

/**
 * Filter trades by timeframe relative to the latest trade in the dataset
 * (or now if empty/all).
 */
export function filterTradesByTimeframe(trades: readonly Trade[], timeframe: TimeframeFilter): Trade[] {
  if (timeframe === 'all' || trades.length === 0) return [...trades];

  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return trades.filter((t) => new Date(t.openedAt).getTime() >= cutoffTime);
}

/**
 * Compute the 6-axis Trader Score (Precision Score) normalized 0 to 100.
 */
export function computeTraderScore(trades: readonly Trade[], metric: DashboardMetric): TraderRadarScore {
  if (trades.length === 0) {
    return {
      overallScore: 0,
      axes: [
        { label: 'Win %', value: 0, displayValue: '0%' },
        { label: 'Profit factor', value: 0, displayValue: '0.00' },
        { label: 'Avg win/loss', value: 0, displayValue: '0.00' },
        { label: 'Recovery factor', value: 0, displayValue: '0.00' },
        { label: 'Max drawdown', value: 0, displayValue: '0%' },
        { label: 'Consistency', value: 0, displayValue: '0%' },
      ],
    };
  }

  let wins = 0;
  let losses = 0;
  let grossWin = 0;
  let grossLoss = 0;

  for (const t of trades) {
    const val = metricValue(t, metric) ?? (metric === 'r' ? t.r : t.r * 100);
    if (val > 0) {
      wins++;
      grossWin += val;
    } else if (val < 0) {
      losses++;
      grossLoss += Math.abs(val);
    }
  }

  // 1. Win % (0-100% -> score 0-100 directly)
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const winRateScore = Math.min(100, Math.max(0, winRate));

  // 2. Profit factor (grossWin / grossLoss)
  // Target benchmark: 1.0 = 40, 2.0 = 70, 3.5+ = 100
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 5 : 0;
  const pfScore = Math.min(100, Math.max(0, pf * 25));

  // 3. Avg win / loss ratio
  const avgWin = wins > 0 ? grossWin / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 0;
  // Target: 1.0 = 40, 2.0 = 70, 3.0+ = 100
  const winLossScore = Math.min(100, Math.max(0, winLossRatio * 30));

  // 4. Recovery factor (Net profit / Max drawdown)
  const netProfit = grossWin - grossLoss;
  const maxDD = computeMaxDrawdown(trades, metric).drawdownValue;
  const recoveryFactor = maxDD > 0 ? Math.max(0, netProfit / maxDD) : netProfit > 0 ? 4 : 0;
  const recoveryScore = Math.min(100, Math.max(0, recoveryFactor * 25));

  // 5. Max drawdown control (lower drawdown = higher score)
  // If drawdown is 0%, score 100. If 20%+, score drops.
  const peakVal = computePeak(trades, metric);
  const ddPct = peakVal > 0 ? (maxDD / peakVal) * 100 : maxDD > 0 ? 25 : 0;
  const ddScore = Math.min(100, Math.max(0, 100 - ddPct * 3));

  // 6. Consistency (% of positive days)
  const dayPerformance = computeDayWinRate(trades, metric);
  const consistencyScore = dayPerformance.dayWinRate;

  // Composite overall score (weighted average)
  const overall = Math.round(
    winRateScore * 0.2 +
    pfScore * 0.2 +
    winLossScore * 0.15 +
    recoveryScore * 0.15 +
    ddScore * 0.15 +
    consistencyScore * 0.15
  );

  return {
    overallScore: Math.min(100, Math.max(0, overall)),
    axes: [
      { label: 'Win %', value: Math.round(winRateScore), displayValue: `${winRate.toFixed(0)}%` },
      { label: 'Profit factor', value: Math.round(pfScore), displayValue: pf.toFixed(2) },
      { label: 'Avg win/loss', value: Math.round(winLossScore), displayValue: winLossRatio.toFixed(2) },
      { label: 'Recovery factor', value: Math.round(recoveryScore), displayValue: recoveryFactor.toFixed(2) },
      { label: 'Max drawdown', value: Math.round(ddScore), displayValue: `${ddPct.toFixed(0)}%` },
      { label: 'Consistency', value: Math.round(consistencyScore), displayValue: `${dayPerformance.dayWinRate.toFixed(0)}%` },
    ],
  };
}

/**
 * Computes calendar Day Win Rate (profitable days vs total trading days).
 */
export function computeDayWinRate(trades: readonly Trade[], metric: DashboardMetric) {
  const dayMap = new Map<string, number>();

  for (const t of trades) {
    const dayKey = t.openedAt.slice(0, 10);
    const val = metricValue(t, metric) ?? (metric === 'r' ? t.r : (t.pnl ?? 0));
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + val);
  }

  let winDays = 0;
  let beDays = 0;
  let lossDays = 0;

  for (const sum of dayMap.values()) {
    if (sum > 0.001) winDays++;
    else if (sum < -0.001) lossDays++;
    else beDays++;
  }

  const totalDays = dayMap.size;
  const dayWinRate = totalDays > 0 ? (winDays / totalDays) * 100 : 0;

  return {
    totalDays,
    winDays,
    beDays,
    lossDays,
    dayWinRate,
  };
}

/**
 * Computes Peak Cumulative Value and date.
 */
function computePeak(trades: readonly Trade[], metric: DashboardMetric): number {
  let cum = 0;
  let peak = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
  for (const t of sorted) {
    const v = metricValue(t, metric) ?? (metric === 'r' ? t.r : (t.pnl ?? 0));
    cum += v;
    if (cum > peak) peak = cum;
  }
  return peak;
}

/**
 * Computes Max Drawdown value and percentage drop from peak.
 */
function computeMaxDrawdown(trades: readonly Trade[], metric: DashboardMetric) {
  let cum = 0;
  let peak = 0;
  let maxDD = 0;

  const sorted = [...trades].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
  for (const t of sorted) {
    const v = metricValue(t, metric) ?? (metric === 'r' ? t.r : (t.pnl ?? 0));
    cum += v;
    if (cum > peak) {
      peak = cum;
    }
    const dd = peak - cum;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  const pct = peak > 0 ? (maxDD / peak) * 100 : 0;
  return { drawdownValue: maxDD, drawdownPct: pct };
}

/**
 * Computes Period Overview (Peak, Max Drawdown, Streak, Best Day, Trading Days).
 */
export function computePeriodOverview(trades: readonly Trade[], metric: DashboardMetric): PeriodOverview {
  if (trades.length === 0) {
    return {
      peakValue: 0,
      peakDate: null,
      maxDrawdownValue: 0,
      maxDrawdownPct: 0,
      winStreakDays: 0,
      bestDayValue: 0,
      bestDayDate: null,
      tradingDaysCount: 0,
    };
  }

  const sorted = [...trades].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
  let cum = 0;
  let peak = 0;
  let peakDate: string | null = null;
  let maxDD = 0;

  const dayTotals = new Map<string, number>();

  for (const t of sorted) {
    const v = metricValue(t, metric) ?? (metric === 'r' ? t.r : (t.pnl ?? 0));
    cum += v;
    if (cum >= peak) {
      peak = cum;
      peakDate = t.openedAt;
    }
    const dd = peak - cum;
    if (dd > maxDD) {
      maxDD = dd;
    }

    const dKey = t.openedAt.slice(0, 10);
    dayTotals.set(dKey, (dayTotals.get(dKey) ?? 0) + v);
  }

  // Best Day and Win Streak
  let bestDayVal = -Infinity;
  let bestDayDate: string | null = null;
  let currentStreak = 0;
  let maxStreak = 0;

  const dayEntries = Array.from(dayTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [dateStr, val] of dayEntries) {
    if (val > bestDayVal) {
      bestDayVal = val;
      bestDayDate = dateStr;
    }
    if (val > 0) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return {
    peakValue: peak,
    peakDate,
    maxDrawdownValue: maxDD,
    maxDrawdownPct: peak > 0 ? (maxDD / peak) * 100 : 0,
    winStreakDays: maxStreak,
    bestDayValue: bestDayVal === -Infinity ? 0 : bestDayVal,
    bestDayDate,
    tradingDaysCount: dayTotals.size,
  };
}

/**
 * Returns session or timeframe entry from trade template data or time of day.
 * If the template contains H4 Candle (e.g. 18:00, 22:00, 02:00, 06:00, 10:00, 14:00)
 * or explicit session fields, it uses the strategy form's definition.
 */
export function getTradeTimeOrSession(trade: Trade, template?: TemplateDefinition): string {
  // 1. Check for strategy form time entries (like GXT/Lathyrus 4H Candle)
  const h4 = trade.templateData?.h4Candle || trade.templateData?.H4Candle || trade.templateData?.h4Profile;
  if (typeof h4 === 'string' && h4.trim()) {
    return h4.trim();
  }

  // 2. Check for explicit session entry in template data
  const rawSession = trade.templateData?.session || trade.templateData?.Session;
  if (typeof rawSession === 'string' && rawSession.trim()) {
    return rawSession.trim();
  }

  // If a template is known and has an H4 field, do not inject UTC sessions
  if (template?.fields.some((f) => f.key === 'h4Candle' || f.key === 'h4Profile')) {
    return '';
  }

  // 3. Fallback to time-of-day heuristic based on UTC hour only if not an H4 strategy:
  const hour = new Date(trade.openedAt).getUTCHours();
  if (hour >= 0 && hour < 7) return 'Asia';
  if (hour >= 7 && hour < 13) return 'London';
  return 'New York';
}

/**
 * Calculates comparative breakdowns (by Direction, Market/Symbol, Duration, Weekday, Month, Session/Time).
 */
export function computeDashboardBreakdowns(
  trades: readonly Trade[],
  metric: DashboardMetric,
  templateInput?: string | TemplateDefinition,
) {
  // Resolve template definition
  let tpl: TemplateDefinition = DEFAULT_TEMPLATE;
  if (typeof templateInput === 'object' && templateInput !== null) {
    tpl = templateInput;
  } else if (typeof templateInput === 'string' && templateInput) {
    try {
      tpl = TEMPLATES[templateInput] ?? getTemplate(templateInput);
    } catch {
      tpl = DEFAULT_TEMPLATE;
    }
  } else if (trades.length > 0 && trades[0]?.templateSnapshot) {
    tpl = trades[0].templateSnapshot;
  } else if (trades.length > 0 && trades[0]?.templateId) {
    try {
      tpl = TEMPLATES[trades[0].templateId] ?? getTemplate(trades[0].templateId);
    } catch {
      tpl = DEFAULT_TEMPLATE;
    }
  }

  // Determine if the form uses H4 Candle (e.g. GXT / Lathyrus) or Session
  const h4Field = tpl.fields.find(
    (f) => f.key === 'h4Candle' || f.key === 'h4Profile' || f.label.toLowerCase().includes('4h'),
  );
  const sessionField = tpl.fields.find(
    (f) => f.key === 'session' || f.label.toLowerCase().includes('session'),
  );

  const isH4 = Boolean(h4Field);
  const timeDimensionTitle = isH4 ? 'Best 4H candle' : sessionField ? 'Best session' : 'Best time';
  const timeCardTitle = isH4 ? 'Win rate by 4H candle' : sessionField ? 'Win rate by session' : 'Win rate by time';

  const defaultTimeBuckets = isH4
    ? (h4Field?.options && h4Field.options.length > 0 ? h4Field.options : ['18:00', '22:00', '02:00', '06:00', '10:00', '14:00'])
    : sessionField?.options && sessionField.options.length > 0
      ? sessionField.options
      : ['London', 'New York', 'Asia'];

  // 1. By Direction
  const dirMap: Record<'long' | 'short', { count: number; wins: number; totalMetric: number; totalDuration: number }> = {
    long: { count: 0, wins: 0, totalMetric: 0, totalDuration: 0 },
    short: { count: 0, wins: 0, totalMetric: 0, totalDuration: 0 },
  };

  // 2. By Market / Instrument
  const marketMap = new Map<string, { count: number; rrSum: number; rrCount: number; wins: number }>();

  // 3. By Weekday
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weekdayMap = new Map<string, { count: number; wins: number; totalMetric: number }>();
  weekdays.forEach((w) => weekdayMap.set(w, { count: 0, wins: 0, totalMetric: 0 }));

  // 4. By Month
  const monthMap = new Map<string, { count: number; wins: number; totalMetric: number }>();

  // 5. By Time Entry / Session (GXT / 4H or Session)
  const sessionMap = new Map<string, { count: number; wins: number; totalMetric: number }>();
  defaultTimeBuckets.forEach((bucket) => {
    sessionMap.set(bucket, { count: 0, wins: 0, totalMetric: 0 });
  });

  for (const t of trades) {
    const isWin = t.result === 'win';
    const val = metricValue(t, metric) ?? (metric === 'r' ? t.r : (t.pnl ?? 0));
    const dir = t.direction === 'short' ? 'short' : 'long';

    // Direction
    dirMap[dir].count++;
    if (isWin) dirMap[dir].wins++;
    dirMap[dir].totalMetric += val;
    dirMap[dir].totalDuration += t.durationMin || 0;

    // Market / Instrument
    const inst = (t.instrument || 'Other').toUpperCase();
    let m = marketMap.get(inst);
    if (!m) {
      m = { count: 0, rrSum: 0, rrCount: 0, wins: 0 };
      marketMap.set(inst, m);
    }
    m.count++;
    if (isWin) m.wins++;
    if (t.plannedRR && Number.isFinite(t.plannedRR)) {
      m.rrSum += t.plannedRR;
      m.rrCount++;
    }

    // Weekday
    const d = new Date(t.openedAt);
    const wName = d.toLocaleDateString('en-US', { weekday: 'long' });
    if (weekdayMap.has(wName)) {
      const wk = weekdayMap.get(wName)!;
      wk.count++;
      if (isWin) wk.wins++;
      wk.totalMetric += val;
    }

    // Month
    const mName = d.toLocaleDateString('en-US', { month: 'short' });
    let mo = monthMap.get(mName);
    if (!mo) {
      mo = { count: 0, wins: 0, totalMetric: 0 };
      monthMap.set(mName, mo);
    }
    mo.count++;
    if (isWin) mo.wins++;
    mo.totalMetric += val;

    // Time entry / Session based on selected form
    const sessOrTime = getTradeTimeOrSession(t, tpl);
    if (sessOrTime) {
      let sEntry = sessionMap.get(sessOrTime);
      if (!sEntry) {
        sEntry = { count: 0, wins: 0, totalMetric: 0 };
        sessionMap.set(sessOrTime, sEntry);
      }
      sEntry.count++;
      if (isWin) sEntry.wins++;
      sEntry.totalMetric += val;
    }
  }

  // Format arrays for cards
  const directionWinRates = [
    {
      label: 'Long',
      count: dirMap.long.count,
      winRate: dirMap.long.count > 0 ? (dirMap.long.wins / dirMap.long.count) * 100 : 0,
      avgMetric: dirMap.long.count > 0 ? dirMap.long.totalMetric / dirMap.long.count : 0,
    },
    {
      label: 'Short',
      count: dirMap.short.count,
      winRate: dirMap.short.count > 0 ? (dirMap.short.wins / dirMap.short.count) * 100 : 0,
      avgMetric: dirMap.short.count > 0 ? dirMap.short.totalMetric / dirMap.short.count : 0,
    },
  ];

  const directionDurations = [
    {
      label: 'Long',
      count: dirMap.long.count,
      winRate: dirMap.long.count > 0 ? (dirMap.long.wins / dirMap.long.count) * 100 : 0,
      avgMetric: dirMap.long.count > 0 ? Math.round(dirMap.long.totalDuration / dirMap.long.count) : 0,
      displayMetric: `${dirMap.long.count > 0 ? Math.round(dirMap.long.totalDuration / dirMap.long.count) : 0}m`,
    },
    {
      label: 'Short',
      count: dirMap.short.count,
      winRate: dirMap.short.count > 0 ? (dirMap.short.wins / dirMap.short.count) * 100 : 0,
      avgMetric: dirMap.short.count > 0 ? Math.round(dirMap.short.totalDuration / dirMap.short.count) : 0,
      displayMetric: `${dirMap.short.count > 0 ? Math.round(dirMap.short.totalDuration / dirMap.short.count) : 0}m`,
    },
  ];

  const marketRR = Array.from(marketMap.entries())
    .map(([symbol, data]) => ({
      label: symbol,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      avgMetric: data.rrCount > 0 ? Number((data.rrSum / data.rrCount).toFixed(2)) : 0,
      displayMetric: data.rrCount > 0 ? (data.rrSum / data.rrCount).toFixed(2) : '—',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const weekdayWinRates = weekdays.map((w) => {
    const data = weekdayMap.get(w)!;
    return {
      label: w.slice(0, 3),
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      avgMetric: data.count > 0 ? data.totalMetric / data.count : 0,
    };
  });

  const monthWinRates = Array.from(monthMap.entries()).map(([m, data]) => ({
    label: m,
    count: data.count,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    avgMetric: data.count > 0 ? data.totalMetric / data.count : 0,
  }));

  // Session / Time Entry win rates
  const sessionWinRates = Array.from(sessionMap.entries())
    .map(([lbl, data]) => ({
      label: lbl,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      avgMetric: data.count > 0 ? data.totalMetric / data.count : 0,
    }))
    .slice(0, 6);

  // Best of items
  const bestDayTrades = weekdayWinRates.filter((d) => d.count > 0);
  const bestDay = bestDayTrades.length > 0
    ? [...bestDayTrades].sort((a, b) => b.winRate - a.winRate)[0]?.label || '—'
    : '—';

  const bestMonthTrades = monthWinRates.filter((m) => m.count > 0);
  const bestMonth = bestMonthTrades.length > 0
    ? [...bestMonthTrades].sort((a, b) => b.winRate - a.winRate)[0]?.label || '—'
    : '—';

  const bestSessionTrades = sessionWinRates.filter((s) => s.count > 0);
  const bestSession = bestSessionTrades.length > 0
    ? [...bestSessionTrades].sort((a, b) => b.winRate - a.winRate)[0]?.label || '—'
    : '—';

  return {
    directionWinRates,
    directionDurations,
    marketRR,
    weekdayWinRates,
    monthWinRates,
    sessionWinRates,
    bestDay,
    bestMonth,
    bestSession,
    timeCardTitle,
    timeDimensionTitle,
  };
}

