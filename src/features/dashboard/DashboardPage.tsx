import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Loader } from '@/components/ui/Loader';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { ResultPill } from '@/components/ui/ResultPill';
import { DirectionPill } from '@/components/ui/DirectionPill';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { useFilteredTrades, useFilterStore } from '@/store/filterStore';
import { useAuthStore } from '@/store/authStore';
import { accountRepository } from '@/data/supabaseAccountRepository';
import type { Account } from '@/domain/models/account';
import { summary, cumulativeCurve, metricSummary } from '@/analytics/core';
import type { Trade } from '@/domain/models/trade';
import {
  formatDuration,
  formatDate,
} from '@/lib/format';
import type { DashboardMetric, MetricPoint } from '@/analytics/core';
import { cn } from '@/lib/cn';
import { useChartTheme } from '@/lib/chartTheme';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

import {
  computeTraderScore,
  computeDayWinRate,
  computePeriodOverview,
  computeDashboardBreakdowns,
  filterTradesByTimeframe,
  type TimeframeFilter,
} from '@/analytics/core/dashboardAnalytics';

import { SemiCircleGauge } from './components/SemiCircleGauge';
import { CircularRingGauge } from './components/CircularRingGauge';
import { SplitBarGauge } from './components/SplitBarGauge';
import { TraderScoreRadar } from './components/TraderScoreRadar';
import { BreakdownBarCard } from './components/BreakdownBarCard';
import { motion, type Variants } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { motionTokens, fadeUp, scaleIn, staggerContainer, popIn } from '@/lib/motion';

const DashboardEquityChart = lazyWithRetry(() => import('./DashboardEquityChart'));

const MotionTR = motion.create(TR);

const rowVariant: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: motionTokens.ease,
    },
  }),
};

export function DashboardPage() {
  const { loaded, load } = useTradesStore();
  const { filtered } = useFilteredTrades();
  const { setFilter } = useFilterStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const chart = useChartTheme();

  // Metric Toggle: P&L vs R
  const [metric, setMetric] = useState<DashboardMetric>('pnl');

  // Timeframe Filter: 7d, 30d, 90d, all
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');

  // Privacy Masking (Eye icon)
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  // Accounts list for header dropdown
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  // Load user accounts for the switcher
  useEffect(() => {
    if (!user) return;
    accountRepository
      .list()
      .then((accs) => setAccounts(accs))
      .catch(() => setAccounts([]));
  }, [user]);

  // Sync selected account with global filter
  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    setFilter('account', accId === 'all' ? '' : accId);
  };

  const tradesToUseRaw = loaded ? (filtered as Trade[]) : [];

  // Filter trades by the selected timeframe
  const tradesToUse = useMemo(() => {
    return filterTradesByTimeframe(tradesToUseRaw, timeframe);
  }, [tradesToUseRaw, timeframe]);

  // Core calculations
  const s = useMemo(() => (loaded ? summary(tradesToUse) : null), [loaded, tradesToUse]);
  const pnlStats = useMemo(() => metricSummary(tradesToUse, 'pnl'), [tradesToUse]);

  // Trader Radar Score (6 axes)
  const scoreData = useMemo(() => computeTraderScore(tradesToUse, metric), [tradesToUse, metric]);

  // Day Win Rate
  const dayWinData = useMemo(() => computeDayWinRate(tradesToUse, metric), [tradesToUse, metric]);

  // Period Overview (Peak, Max Drawdown, Streak, Best Day)
  const periodOverview = useMemo(() => computePeriodOverview(tradesToUse, metric), [tradesToUse, metric]);

  // Comparative Breakdowns
  const breakdowns = useMemo(() => computeDashboardBreakdowns(tradesToUse, metric), [tradesToUse, metric]);

  // Cumulative Curve
  const curvePoints = useMemo(
    () => (loaded ? cumulativeCurve(tradesToUse, metric) : ([] as MetricPoint[])),
    [loaded, tradesToUse, metric],
  );

  const chartData = useMemo(
    () =>
      curvePoints.map((p) => ({
        dateLabel: new Date(p.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative: p.cumulative,
      })),
    [curvePoints],
  );

  // Net Metric calculation
  const netValue = metric === 'r' ? (s?.totalR ?? 0) : pnlStats.total;
  const isNetPositive = netValue >= 0;

  // Average Win & Loss
  const winsList = tradesToUse.filter((t) => t.result === 'win');
  const lossesList = tradesToUse.filter((t) => t.result === 'loss');

  const avgWinVal = useMemo(() => {
    if (metric === 'r') {
      return winsList.length > 0 ? winsList.reduce((acc, t) => acc + t.r, 0) / winsList.length : 0;
    }
    const winsWithPnl = winsList.filter((t) => typeof t.pnl === 'number' && Number.isFinite(t.pnl));
    return winsWithPnl.length > 0
      ? winsWithPnl.reduce((acc, t) => acc + (t.pnl ?? 0), 0) / winsWithPnl.length
      : 0;
  }, [winsList, metric]);

  const avgLossVal = useMemo(() => {
    if (metric === 'r') {
      return lossesList.length > 0 ? Math.abs(lossesList.reduce((acc, t) => acc + t.r, 0) / lossesList.length) : 0;
    }
    const lossesWithPnl = lossesList.filter((t) => typeof t.pnl === 'number' && Number.isFinite(t.pnl));
    return lossesWithPnl.length > 0
      ? Math.abs(lossesWithPnl.reduce((acc, t) => acc + (t.pnl ?? 0), 0) / lossesWithPnl.length)
      : 0;
  }, [lossesList, metric]);

  const avgWinLossRatio = avgLossVal > 0 ? avgWinVal / avgLossVal : avgWinVal > 0 ? 3 : 0;

  // Profit factor
  const grossWin = winsList.reduce(
    (acc, t) => acc + (metric === 'r' ? Math.max(0, t.r) : Math.max(0, t.pnl ?? 0)),
    0,
  );
  const grossLoss = lossesList.reduce(
    (acc, t) => acc + Math.abs(metric === 'r' ? Math.min(0, t.r) : Math.min(0, t.pnl ?? 0)),
    0,
  );
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 5 : 0;

  // Avg duration
  const avgDurationMin = tradesToUse.length
    ? Math.round(tradesToUse.reduce((acc, t) => acc + (t.durationMin || 0), 0) / tradesToUse.length)
    : 0;

  // Average RR calculation with fallback to realized R
  const displayAvgRR = useMemo(() => {
    if (s?.avgRR != null && Number.isFinite(s.avgRR) && s.avgRR > 0) return s.avgRR.toFixed(2);
    const validRs = tradesToUse.filter((t) => typeof t.r === 'number' && Number.isFinite(t.r));
    if (validRs.length > 0) {
      const positiveRs = validRs.filter((t) => t.r > 0);
      if (positiveRs.length > 0) {
        return (positiveRs.reduce((acc, t) => acc + t.r, 0) / positiveRs.length).toFixed(2);
      }
      return (validRs.reduce((acc, t) => acc + Math.abs(t.r), 0) / validRs.length).toFixed(2);
    }
    return '—';
  }, [s, tradesToUse]);

  // Recent trades for bottom preview
  const recent = useMemo(() => {
    if (!loaded) return [];
    return [...tradesToUse]
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
      .slice(0, 7);
  }, [loaded, tradesToUse]);

  // Greeting header
  const greeting = useMemo(() => {
    const name = user?.name ? user.name.split(' ')[0] : '';
    return name ? `Performance Overview — ${name}` : 'Performance Overview';
  }, [user]);

  const formattedCurrentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  if (!loaded) {
    return <Loader title="Loading trading data…" className="min-h-64" />;
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16">
      {/* 1. Header with Title, Time, PnL/R Toggle, Account, Privacy & Snapshot */}
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
        >
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg flex items-center gap-2">
            {greeting}
          </h1>
          <p className="text-xs font-normal text-fg-muted mt-1">{formattedCurrentDate}</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center gap-2 sm:gap-2.5"
        >
          {/* PnL ⇄ R Segmented Toggle */}
          <motion.div variants={fadeUp} className="inline-flex h-9 items-center p-0.5 rounded-lg bg-bg-2 border border-line">
            <button
              type="button"
              onClick={() => setMetric('pnl')}
              className={cn(
                'h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center',
                metric === 'pnl'
                  ? 'bg-bg-1 text-fg shadow-sm border border-line/50 font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              P&amp;L ($)
            </button>
            <button
              type="button"
              onClick={() => setMetric('r')}
              className={cn(
                'h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center',
                metric === 'r'
                  ? 'bg-bg-1 text-fg shadow-sm border border-line/50 font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              Realized R
            </button>
          </motion.div>

          {/* Account Selector Custom Form Select */}
          <motion.div variants={fadeUp} className="min-w-[130px] flex-1 sm:flex-initial">
            <Select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="h-9 text-xs font-medium rounded-lg border-line bg-bg-1 w-full"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </Select>
          </motion.div>

          {/* Privacy Toggle (Eye icon) */}
          <motion.button
            variants={fadeUp}
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            title={isPrivate ? 'Show sensitive balances' : 'Hide sensitive balances'}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-bg-1 border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            {isPrivate ? <EyeOff className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Eye className="w-4 h-4" />}
          </motion.button>

          {/* New Trade Primary CTA */}
          <motion.div variants={fadeUp} className="w-full sm:w-auto">
            <Button asChild variant="primary" className="h-9 px-3.5 text-xs font-medium rounded-lg w-full sm:w-auto" leftIcon={<TrendingUp className="h-3.5 w-3.5" />}>
              <Link to="/journal/new">New trade</Link>
            </Button>
          </motion.div>
        </motion.div>
      </header>

      {/* 2. Top Metric Gauge Cards (5 Cards Grid) */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        {/* Card 1: Net P&L / R */}
        <motion.div variants={scaleIn} className="bg-bg-1 border border-line rounded-xl p-5 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-fg-muted">
              {metric === 'r' ? 'Net Realized R' : 'Net P&L'}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-bg-2 text-fg-muted border border-line">
              {tradesToUse.length} trades
            </span>
          </div>
          <div className="mt-1">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-semibold font-mono tracking-tight',
                isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {isPrivate ? (
                '***'
              ) : metric === 'r' ? (
                <NumberFlow
                  value={netValue}
                  prefix={netValue > 0 ? '+' : ''}
                  suffix="R"
                  format={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }}
                />
              ) : (
                <NumberFlow
                  value={netValue}
                  format={{
                    style: 'currency',
                    currency: 'USD',
                    signDisplay: netValue > 0 ? 'always' : 'auto',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }}
                />
              )}
            </div>
            <span className="text-[11px] text-fg-dim font-normal mt-1 block">
              {metric === 'r' ? 'Total R multiple gained' : 'Cumulative net'}
            </span>
          </div>
        </motion.div>

        {/* Card 2: Trade Win % with Semi-Circle Speedometer */}
        <motion.div variants={scaleIn} className="bg-bg-1 border border-line rounded-xl p-5 flex items-center justify-between shadow-card">
          <div className="flex flex-col justify-between h-full">
            <span className="text-xs font-medium text-fg-muted">Trade win %</span>
            <div className="text-2xl sm:text-3xl font-semibold font-mono text-fg tracking-tight mt-2">
              <NumberFlow
                value={s?.winRate != null ? Math.round(s.winRate * 100) : 0}
                suffix="%"
              />
            </div>
            <span className="text-[11px] text-fg-dim font-normal mt-1">Per closed trade</span>
          </div>
          <SemiCircleGauge
            value={s?.winRate != null ? s.winRate * 100 : 0}
            wins={s?.wins ?? 0}
            bes={s?.bes ?? 0}
            losses={s?.losses ?? 0}
          />
        </motion.div>

        {/* Card 3: Profit Factor with Circular Ring */}
        <motion.div variants={scaleIn} className="bg-bg-1 border border-line rounded-xl p-5 flex items-center justify-between shadow-card">
          <div className="flex flex-col justify-between h-full">
            <span className="text-xs font-medium text-fg-muted">Profit factor</span>
            <div
              className={cn(
                'text-2xl sm:text-3xl font-semibold font-mono tracking-tight mt-2',
                profitFactor >= 1.5 ? 'text-emerald-600 dark:text-emerald-400' : profitFactor >= 1 ? 'text-amber-500 dark:text-amber-300' : 'text-rose-600 dark:text-rose-400',
              )}
            >
              <NumberFlow
                value={profitFactor}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              />
            </div>
            <span className="text-[11px] text-fg-dim font-normal mt-1">Gross W / Gross L</span>
          </div>
          <CircularRingGauge value={profitFactor} benchmark={3.0} />
        </motion.div>

        {/* Card 4: Day Win % with Semi-Circle Speedometer */}
        <motion.div variants={scaleIn} className="bg-bg-1 border border-line rounded-xl p-5 flex items-center justify-between shadow-card">
          <div className="flex flex-col justify-between h-full">
            <span className="text-xs font-medium text-fg-muted">Day win %</span>
            <div className="text-2xl sm:text-3xl font-semibold font-mono text-fg tracking-tight mt-2">
              <NumberFlow
                value={Math.round(dayWinData.dayWinRate)}
                suffix="%"
              />
            </div>
            <span className="text-[11px] text-fg-dim font-normal mt-1">
              {dayWinData.winDays} of {dayWinData.totalDays} green days
            </span>
          </div>
          <SemiCircleGauge
            value={dayWinData.dayWinRate}
            wins={dayWinData.winDays}
            bes={dayWinData.beDays}
            losses={dayWinData.lossDays}
          />
        </motion.div>

        {/* Card 5: Avg Win / Loss with Dual Split Bar */}
        <motion.div variants={scaleIn} className="bg-bg-1 border border-line rounded-xl p-5 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-fg-muted">Avg win/loss</span>
            <span className="text-lg font-semibold font-mono text-fg tracking-tight">
              <NumberFlow
                value={avgWinLossRatio}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              />
            </span>
          </div>
          <SplitBarGauge
            leftValue={avgWinVal}
            rightValue={avgLossVal}
            leftLabel={
              isPrivate
                ? '***'
                : metric === 'r'
                  ? `+${avgWinVal.toFixed(2)}R`
                  : `+${Math.round(avgWinVal)}`
            }
            rightLabel={
              isPrivate
                ? '***'
                : metric === 'r'
                  ? `-${avgLossVal.toFixed(2)}R`
                  : `-${Math.round(avgLossVal)}`
            }
          />
        </motion.div>
      </motion.section>

      {/* 3. Hero Middle Section: Precision Score Radar (Left) + Cumulative Curve (Right) */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* Left: Trader Precision Score Spider Radar */}
        <motion.div variants={scaleIn} className="lg:col-span-5 bg-bg-1 border border-line rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-medium text-fg tracking-normal">Precision Score</h2>
              <Info className="w-3.5 h-3.5 text-fg-dim" />
            </div>
            <span className="text-[11px] text-fg-muted font-mono px-2 py-0.5 rounded-md bg-bg-2 border border-line">
              0–100 Scale
            </span>
          </div>

          <TraderScoreRadar scoreData={scoreData} />
        </motion.div>

        {/* Right: Daily Net Cumulative Curve */}
        <motion.div variants={scaleIn} className="lg:col-span-7 bg-bg-1 border border-line rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-card">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xs font-medium text-fg tracking-normal">
                  {metric === 'r' ? 'Daily Net Cumulative R' : 'Daily Net Cumulative P&L'}
                </h2>
                <div className="text-2xl sm:text-3xl font-semibold font-mono text-fg tracking-tight mt-1">
                  {isPrivate ? (
                    '***'
                  ) : metric === 'r' ? (
                    <NumberFlow
                      value={netValue}
                      prefix={netValue > 0 ? '+' : ''}
                      suffix="R"
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    />
                  ) : (
                    <NumberFlow
                      value={netValue}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        signDisplay: netValue > 0 ? 'always' : 'auto',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Timeframe Tabs: 7d, 30d, 90d, All */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-bg-2 border border-line self-start sm:self-auto">
                {(['7d', '30d', '90d', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTimeframe(tab)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                      timeframe === tab
                        ? 'bg-bg-1 text-fg shadow-sm border border-line/50 font-semibold'
                        : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {tab === 'all' ? 'All' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-60 w-full mt-4">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-fg-muted">Loading curve…</div>}>
                <DashboardEquityChart
                  data={chartData}
                  metric={metric}
                  chart={chart}
                  isPrivate={isPrivate}
                />
              </Suspense>
            </div>
          </div>

          {/* Period Overview Sub-bar */}
          <div className="mt-6 pt-4 border-t border-line flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span className="font-medium text-fg">Period overview</span>
              <span className="font-mono text-[11px]">{periodOverview.tradingDaysCount} trading days</span>
            </div>

            <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              {/* Peak */}
              <motion.div variants={fadeUp} className="bg-bg-2 border border-line rounded-lg p-2.5">
                <span className="text-[11px] font-normal text-fg-muted block">Peak</span>
                <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {isPrivate ? (
                    '***'
                  ) : metric === 'r' ? (
                    <NumberFlow
                      value={periodOverview.peakValue}
                      prefix={periodOverview.peakValue > 0 ? '+' : ''}
                      suffix="R"
                      format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    />
                  ) : (
                    <NumberFlow
                      value={periodOverview.peakValue}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        signDisplay: periodOverview.peakValue > 0 ? 'always' : 'auto',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }}
                    />
                  )}
                </span>
                <span className="text-[10px] text-fg-dim block truncate">
                  {periodOverview.peakDate ? formatDate(periodOverview.peakDate) : '—'}
                </span>
              </motion.div>

              {/* Max Drawdown */}
              <motion.div variants={fadeUp} className="bg-bg-2 border border-line rounded-lg p-2.5">
                <span className="text-[11px] font-normal text-fg-muted block">Max Drawdown</span>
                <span className="text-sm font-semibold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                  {isPrivate ? (
                    '***'
                  ) : metric === 'r' ? (
                    <NumberFlow
                      value={periodOverview.maxDrawdownValue}
                      prefix="-"
                      suffix="R"
                      format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    />
                  ) : (
                    <NumberFlow
                      value={-periodOverview.maxDrawdownValue}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        signDisplay: 'auto',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                    />
                  )}
                </span>
                <span className="text-[10px] text-fg-dim block truncate">
                  -{periodOverview.maxDrawdownPct.toFixed(0)}% of peak
                </span>
              </motion.div>

              {/* Streak */}
              <motion.div variants={fadeUp} className="bg-bg-2 border border-line rounded-lg p-2.5">
                <span className="text-[11px] font-normal text-fg-muted block">Streak</span>
                <span className="text-sm font-semibold font-mono text-fg mt-0.5 block">
                  <NumberFlow value={periodOverview.winStreakDays} suffix="W" />
                </span>
                <span className="text-[10px] text-fg-dim block truncate">consecutive days</span>
              </motion.div>

              {/* Best Day */}
              <motion.div variants={fadeUp} className="bg-bg-2 border border-line rounded-lg p-2.5">
                <span className="text-[11px] font-normal text-fg-muted block">Best Day</span>
                <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {isPrivate ? (
                    '***'
                  ) : metric === 'r' ? (
                    <NumberFlow
                      value={periodOverview.bestDayValue}
                      prefix={periodOverview.bestDayValue > 0 ? '+' : ''}
                      suffix="R"
                      format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    />
                  ) : (
                    <NumberFlow
                      value={periodOverview.bestDayValue}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        signDisplay: periodOverview.bestDayValue > 0 ? 'always' : 'auto',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }}
                    />
                  )}
                </span>
                <span className="text-[10px] text-fg-dim block truncate">
                  {periodOverview.bestDayDate ? formatDate(periodOverview.bestDayDate) : '—'}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* 4. Quick KPI Stat Pills Row (6 Items) */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <motion.div variants={fadeUp} className="bg-bg-1 border border-line rounded-xl p-4 flex flex-col justify-between shadow-card">
          <span className="text-xs text-fg-muted font-normal">Win rate</span>
          <span className="text-xl font-semibold font-mono text-fg mt-2">
            <NumberFlow
              value={s?.winRate != null ? Math.round(s.winRate * 100) : 0}
              suffix="%"
            />
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-bg-1 border border-line rounded-xl p-4 flex flex-col justify-between shadow-card">
          <span className="text-xs text-fg-muted font-normal">Avg RR</span>
          <span className="text-xl font-semibold font-mono text-fg mt-2">
            {displayAvgRR !== '—' && !isNaN(Number(displayAvgRR)) ? (
              <NumberFlow
                value={Number(displayAvgRR)}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              />
            ) : (
              displayAvgRR
            )}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-bg-1 border border-line rounded-xl p-4 flex flex-col justify-between shadow-card">
          <span className="text-xs text-fg-muted font-normal">Avg duration</span>
          <span className="text-xl font-semibold font-mono text-fg mt-2">
            {avgDurationMin > 0 ? (
              <NumberFlow value={avgDurationMin} suffix="m" />
            ) : (
              '—'
            )}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-bg-1 border border-line rounded-xl p-4 flex flex-col justify-between shadow-card">
          <span className="text-xs text-fg-muted font-normal">Best day</span>
          <span className="text-xl font-semibold text-fg mt-2 truncate">{breakdowns.bestDay}</span>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-bg-1 border border-line rounded-xl p-4 flex flex-col justify-between shadow-card">
          <span className="text-xs text-fg-muted font-normal">Best month</span>
          <span className="text-xl font-semibold text-fg mt-2 truncate">{breakdowns.bestMonth}</span>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-bg-1 border border-line rounded-xl p-4 flex flex-col justify-between shadow-card">
          <span className="text-xs text-fg-muted font-normal">{breakdowns.timeDimensionTitle}</span>
          <span className="text-xl font-semibold text-fg mt-2 truncate">{breakdowns.bestSession}</span>
        </motion.div>
      </motion.section>

      {/* 5. Comparative Breakdown Cards (Bar Charts Grid) */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {/* 1. Win Rate by Direction */}
        <motion.div variants={fadeUp}>
          <BreakdownBarCard
            title="Win rate by direction"
            items={breakdowns.directionWinRates}
            variant="winRate"
          />
        </motion.div>

        {/* 2. Avg RR by Market */}
        <motion.div variants={fadeUp}>
          <BreakdownBarCard
            title="Avg RR by market"
            items={breakdowns.marketRR}
            variant="metric"
          />
        </motion.div>

        {/* 3. Avg Duration by Direction */}
        <motion.div variants={fadeUp}>
          <BreakdownBarCard
            title="Avg duration by direction"
            items={breakdowns.directionDurations}
            variant="duration"
          />
        </motion.div>

        {/* 4. Win Rate by Weekday */}
        <motion.div variants={fadeUp}>
          <BreakdownBarCard
            title="Win rate by weekday"
            items={breakdowns.weekdayWinRates}
            variant="winRate"
          />
        </motion.div>

        {/* 5. Win Rate by Month */}
        <motion.div variants={fadeUp}>
          <BreakdownBarCard
            title="Win rate by month"
            items={breakdowns.monthWinRates}
            variant="winRate"
          />
        </motion.div>

        {/* 6. Win Rate by Time Entry / Session (Dynamic based on selected template) */}
        <motion.div variants={fadeUp}>
          <BreakdownBarCard
            title={breakdowns.timeCardTitle}
            items={breakdowns.sessionWinRates}
            variant="winRate"
          />
        </motion.div>
      </motion.section>

      {/* 6. Recent Trades Table Preview */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="bg-bg-1 border border-line rounded-xl p-5 sm:p-6 shadow-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-fg tracking-normal">Recent Trades</h2>
          <Button asChild variant="ghost" className="h-7 px-2 text-xs text-fg-muted hover:text-fg">
            <Link to="/journal">View full journal →</Link>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="w-10 text-center">#</TH>
                <TH>Date</TH>
                <TH>Pair</TH>
                <TH>Direction</TH>
                <TH>Result</TH>
                <TH className="text-right">R</TH>
                <TH className="text-right">P&amp;L</TH>
                <TH className="text-right">Duration</TH>
              </TR>
            </THead>
            <TBody>
              {recent.map((t, i) => (
                <MotionTR
                  key={t.id}
                  interactive
                  onClick={() => navigate(`/journal/${t.id}`)}
                  variants={rowVariant}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <TD className="text-center text-fg-dim font-mono text-xs">{t.number ?? i + 1}</TD>
                  <TD className="whitespace-nowrap font-mono text-xs text-fg-muted">{formatDate(t.openedAt)}</TD>
                  <TD>
                    <span className="font-semibold text-fg text-xs">{t.instrument}</span>
                  </TD>
                  <TD>
                    <motion.div
                      variants={popIn}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                    >
                      <DirectionPill direction={t.direction} />
                    </motion.div>
                  </TD>
                  <TD>
                    <motion.div
                      variants={popIn}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={{ delay: 0.18 + i * 0.05 }}
                    >
                      <ResultPill result={t.result} />
                    </motion.div>
                  </TD>
                  <TD
                    align="right"
                    className={cn('num font-bold text-xs', t.r > 0 ? 'text-emerald-600 dark:text-emerald-400' : t.r < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg-muted')}
                  >
                    <NumberFlow
                      value={t.r}
                      prefix={t.r > 0 ? '+' : ''}
                      suffix="R"
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    />
                  </TD>
                  <TD
                    align="right"
                    className={cn(
                      'num font-semibold text-xs',
                      typeof t.pnl === 'number' && t.pnl > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : typeof t.pnl === 'number' && t.pnl < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-fg-muted',
                    )}
                  >
                    {isPrivate ? (
                      '***'
                    ) : typeof t.pnl === 'number' && Number.isFinite(t.pnl) ? (
                      <NumberFlow
                        value={t.pnl}
                        format={{
                          style: 'currency',
                          currency: 'USD',
                          signDisplay: t.pnl > 0 ? 'always' : 'auto',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD align="right" className="text-xs text-fg-muted num">
                    {t.durationMin > 0 ? formatDuration(t.durationMin) : '—'}
                  </TD>
                </MotionTR>
              ))}
            </TBody>
          </Table>
        </div>
      </motion.section>
    </div>
  );
}
