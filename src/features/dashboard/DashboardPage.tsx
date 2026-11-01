import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  formatR,
  formatDuration,
  formatDate,
  formatSignedMoney,
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

const DashboardEquityChart = lazyWithRetry(() => import('./DashboardEquityChart'));

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

  // Recent trades for bottom preview
  const recent = useMemo(() => {
    if (!loaded) return [];
    return [...tradesToUse]
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
      .slice(0, 7);
  }, [loaded, tradesToUse]);

  // Greeting helper
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name ? user.name.split(' ')[0] : 'Trader';
    if (hour < 12) return `Good morning, ${name}.`;
    if (hour < 17) return `Day's almost done, ${name}.`;
    return `Good evening, ${name}.`;
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
      {/* 1. Header with Greeting, Time, PnL/R Toggle, Account, Privacy & Snapshot */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f242c] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {greeting}
          </h1>
          <p className="text-sm font-medium text-[#8c94a0] mt-1">{formattedCurrentDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* PnL ⇄ R Segmented Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#121417] border border-[#1f242c] shadow-sm">
            <button
              type="button"
              onClick={() => setMetric('pnl')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all',
                metric === 'pnl'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-[#8c94a0] hover:text-white',
              )}
            >
              P&amp;L ($)
            </button>
            <button
              type="button"
              onClick={() => setMetric('r')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all',
                metric === 'r'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-[#8c94a0] hover:text-white',
              )}
            >
              Realized R
            </button>
          </div>

          {/* Account Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="appearance-none bg-[#121417] border border-[#1f242c] rounded-xl px-3.5 py-1.5 pr-8 text-xs font-medium text-white hover:border-[#2f3642] focus:outline-none focus:border-sky-500/50 cursor-pointer shadow-sm"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8c94a0] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Privacy Toggle (Eye icon) */}
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            title={isPrivate ? 'Show sensitive balances' : 'Hide sensitive balances'}
            className="p-2 rounded-xl bg-[#121417] border border-[#1f242c] text-[#8c94a0] hover:text-white hover:border-[#2f3642] transition-colors shadow-sm"
          >
            {isPrivate ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* New Trade Primary CTA */}
          <Button asChild variant="primary" className="h-9 px-3.5 text-xs font-semibold shadow-sm" leftIcon={<TrendingUp className="h-3.5 w-3.5" />}>
            <Link to="/journal/new">New trade</Link>
          </Button>
        </div>
      </header>

      {/* 2. Top Metric Gauge Cards (5 Cards Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Net P&L / R */}
        <div className="bg-[#121417] border border-[#1f242c] rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#8c94a0]">
              {metric === 'r' ? 'Net Realized R' : 'Net P&L'}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#181b20] text-[#8c94a0] border border-[#22272f]">
              {tradesToUse.length} trades
            </span>
          </div>
          <div className="mt-1">
            <div
              className={cn(
                'text-3xl font-extrabold font-mono tracking-tight',
                isNetPositive ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {isPrivate
                ? '***'
                : metric === 'r'
                  ? formatR(netValue)
                  : formatSignedMoney(netValue)}
            </div>
            <span className="text-[11px] text-[#555e6d] font-medium mt-1.5 block">
              {metric === 'r' ? 'Total R multiple gained' : 'Realized journal total'}
            </span>
          </div>
        </div>

        {/* Card 2: Trade Win % with Semi-Circle Speedometer */}
        <div className="bg-[#121417] border border-[#1f242c] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col justify-between h-full">
            <span className="text-xs font-medium text-[#8c94a0]">Trade win %</span>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-2">
              {s?.winRate != null ? `${(s.winRate * 100).toFixed(0)}%` : '0%'}
            </div>
            <span className="text-[11px] text-[#555e6d] font-medium mt-1">Per execution</span>
          </div>
          <SemiCircleGauge
            value={s?.winRate != null ? s.winRate * 100 : 0}
            wins={s?.wins ?? 0}
            bes={s?.bes ?? 0}
            losses={s?.losses ?? 0}
          />
        </div>

        {/* Card 3: Profit Factor with Circular Ring */}
        <div className="bg-[#121417] border border-[#1f242c] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col justify-between h-full">
            <span className="text-xs font-medium text-[#8c94a0]">Profit factor</span>
            <div
              className={cn(
                'text-3xl font-extrabold font-mono tracking-tight mt-2',
                profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor >= 1 ? 'text-amber-300' : 'text-rose-400',
              )}
            >
              {profitFactor.toFixed(2)}
            </div>
            <span className="text-[11px] text-[#555e6d] font-medium mt-1">Gross W / Gross L</span>
          </div>
          <CircularRingGauge value={profitFactor} benchmark={3.0} />
        </div>

        {/* Card 4: Day Win % with Semi-Circle Speedometer */}
        <div className="bg-[#121417] border border-[#1f242c] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col justify-between h-full">
            <span className="text-xs font-medium text-[#8c94a0]">Day win %</span>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-2">
              {dayWinData.dayWinRate.toFixed(0)}%
            </div>
            <span className="text-[11px] text-[#555e6d] font-medium mt-1">
              {dayWinData.winDays} of {dayWinData.totalDays} days green
            </span>
          </div>
          <SemiCircleGauge
            value={dayWinData.dayWinRate}
            wins={dayWinData.winDays}
            bes={dayWinData.beDays}
            losses={dayWinData.lossDays}
          />
        </div>

        {/* Card 5: Avg Win / Loss with Dual Split Bar */}
        <div className="bg-[#121417] border border-[#1f242c] rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8c94a0]">Avg win/loss</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {avgWinLossRatio.toFixed(2)}
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
        </div>
      </section>

      {/* 3. Hero Middle Section: Precision Score Radar (Left) + Cumulative Curve (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Trader Precision Score Spider Radar */}
        <div className="lg:col-span-5 bg-[#121417] border border-[#1f242c] rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-white tracking-tight">Precision Score</h2>
              <Info className="w-3.5 h-3.5 text-[#555e6d]" />
            </div>
            <span className="text-[11px] text-sky-400 font-medium px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20">
              Composite 0-100
            </span>
          </div>

          <TraderScoreRadar scoreData={scoreData} />
        </div>

        {/* Right: Daily Net Cumulative Curve */}
        <div className="lg:col-span-7 bg-[#121417] border border-[#1f242c] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  {metric === 'r' ? 'Daily Net Cumulative R' : 'Daily Net Cumulative P&L'}
                </h2>
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-1">
                  {isPrivate
                    ? '***'
                    : metric === 'r'
                      ? formatR(netValue)
                      : formatSignedMoney(netValue)}
                </div>
              </div>

              {/* Timeframe Tabs: 7d, 30d, 90d, All */}
              <div className="inline-flex items-center p-1 rounded-xl bg-[#181b20] border border-[#22272f] self-start sm:self-auto">
                {(['7d', '30d', '90d', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTimeframe(tab)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize',
                      timeframe === tab
                        ? 'bg-[#262c36] text-white shadow-sm'
                        : 'text-[#8c94a0] hover:text-white',
                    )}
                  >
                    {tab === 'all' ? 'All' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-60 w-full mt-4">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-zinc-500">Loading curve…</div>}>
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
          <div className="mt-6 pt-4 border-t border-[#1f242c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#8c94a0]">
              <span className="font-medium">Period overview</span>
              <span className="font-mono">{periodOverview.tradingDaysCount} trading days</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              {/* Peak */}
              <div className="bg-[#181b20]/60 border border-[#22272f] rounded-xl p-2.5">
                <span className="text-[10px] font-medium text-[#8c94a0] uppercase tracking-wider block">Peak</span>
                <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5 block">
                  {isPrivate
                    ? '***'
                    : metric === 'r'
                      ? `+${periodOverview.peakValue.toFixed(1)}R`
                      : formatSignedMoney(periodOverview.peakValue)}
                </span>
                <span className="text-[10px] text-[#555e6d] block truncate">
                  {periodOverview.peakDate ? formatDate(periodOverview.peakDate) : '—'}
                </span>
              </div>

              {/* Max Drawdown */}
              <div className="bg-[#181b20]/60 border border-[#22272f] rounded-xl p-2.5">
                <span className="text-[10px] font-medium text-[#8c94a0] uppercase tracking-wider block">Max Drawdown</span>
                <span className="text-sm font-bold font-mono text-rose-400 mt-0.5 block">
                  {isPrivate
                    ? '***'
                    : metric === 'r'
                      ? `-${periodOverview.maxDrawdownValue.toFixed(1)}R`
                      : `-$${Math.round(periodOverview.maxDrawdownValue)}`}
                </span>
                <span className="text-[10px] text-[#555e6d] block truncate">
                  -{periodOverview.maxDrawdownPct.toFixed(0)}% of peak
                </span>
              </div>

              {/* Streak */}
              <div className="bg-[#181b20]/60 border border-[#22272f] rounded-xl p-2.5">
                <span className="text-[10px] font-medium text-[#8c94a0] uppercase tracking-wider block">Streak</span>
                <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                  {periodOverview.winStreakDays}W
                </span>
                <span className="text-[10px] text-[#555e6d] block truncate">consecutive days</span>
              </div>

              {/* Best Day */}
              <div className="bg-[#181b20]/60 border border-[#22272f] rounded-xl p-2.5">
                <span className="text-[10px] font-medium text-[#8c94a0] uppercase tracking-wider block">Best Day</span>
                <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5 block">
                  {isPrivate
                    ? '***'
                    : metric === 'r'
                      ? `+${periodOverview.bestDayValue.toFixed(1)}R`
                      : formatSignedMoney(periodOverview.bestDayValue)}
                </span>
                <span className="text-[10px] text-[#555e6d] block truncate">
                  {periodOverview.bestDayDate ? formatDate(periodOverview.bestDayDate) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Quick KPI Stat Pills Row (6 Items) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#121417] border border-[#1f242c] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#8c94a0] font-medium">Win rate</span>
          <span className="text-xl font-bold font-mono text-white mt-2">
            {s?.winRate != null ? `${(s.winRate * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>

        <div className="bg-[#121417] border border-[#1f242c] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#8c94a0] font-medium">Avg RR</span>
          <span className="text-xl font-bold font-mono text-white mt-2">
            {s?.avgRR != null ? s.avgRR.toFixed(2) : '—'}
          </span>
        </div>

        <div className="bg-[#121417] border border-[#1f242c] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#8c94a0] font-medium">Avg duration</span>
          <span className="text-xl font-bold font-mono text-white mt-2">
            {avgDurationMin > 0 ? `${avgDurationMin}m` : '—'}
          </span>
        </div>

        <div className="bg-[#121417] border border-[#1f242c] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#8c94a0] font-medium">Best day</span>
          <span className="text-xl font-bold text-white mt-2 truncate">{breakdowns.bestDay}</span>
        </div>

        <div className="bg-[#121417] border border-[#1f242c] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#8c94a0] font-medium">Best month</span>
          <span className="text-xl font-bold text-white mt-2 truncate">{breakdowns.bestMonth}</span>
        </div>

        <div className="bg-[#121417] border border-[#1f242c] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#8c94a0] font-medium">Best session</span>
          <span className="text-xl font-bold text-white mt-2 truncate">{breakdowns.bestSession}</span>
        </div>
      </section>

      {/* 5. Comparative Breakdown Cards (Bar Charts Grid) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Win Rate by Direction */}
        <BreakdownBarCard
          title="Win rate by direction"
          items={breakdowns.directionWinRates}
          variant="winRate"
        />

        {/* 2. Avg RR by Market */}
        <BreakdownBarCard
          title="Avg RR by market"
          items={breakdowns.marketRR}
          variant="metric"
        />

        {/* 3. Avg Duration by Direction */}
        <BreakdownBarCard
          title="Avg duration by direction"
          items={breakdowns.directionDurations}
          variant="duration"
        />

        {/* 4. Win Rate by Weekday */}
        <BreakdownBarCard
          title="Win rate by weekday"
          items={breakdowns.weekdayWinRates}
          variant="winRate"
        />

        {/* 5. Win Rate by Month */}
        <BreakdownBarCard
          title="Win rate by month"
          items={breakdowns.monthWinRates}
          variant="winRate"
        />

        {/* 6. Win Rate by Session */}
        <BreakdownBarCard
          title="Win rate by session"
          items={breakdowns.sessionWinRates}
          variant="winRate"
        />
      </section>

      {/* 6. Recent Trades Table Preview */}
      <section className="bg-[#121417] border border-[#1f242c] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white tracking-tight">Recent Trades</h2>
          <Button asChild variant="ghost" className="h-8 px-2.5 text-xs text-[#8c94a0] hover:text-white">
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
                <TR key={t.id} interactive onClick={() => navigate(`/journal/${t.id}`)}>
                  <TD className="text-center text-[#555e6d] font-mono text-xs">{t.number ?? i + 1}</TD>
                  <TD className="whitespace-nowrap font-mono text-xs text-[#8c94a0]">{formatDate(t.openedAt)}</TD>
                  <TD>
                    <span className="font-semibold text-white text-xs">{t.instrument}</span>
                  </TD>
                  <TD>
                    <DirectionPill direction={t.direction} />
                  </TD>
                  <TD>
                    <ResultPill result={t.result} />
                  </TD>
                  <TD
                    align="right"
                    className={cn('num font-bold text-xs', t.r > 0 ? 'text-emerald-400' : t.r < 0 ? 'text-rose-400' : 'text-zinc-400')}
                  >
                    {formatR(t.r)}
                  </TD>
                  <TD
                    align="right"
                    className={cn(
                      'num font-semibold text-xs',
                      typeof t.pnl === 'number' && t.pnl > 0
                        ? 'text-emerald-400'
                        : typeof t.pnl === 'number' && t.pnl < 0
                          ? 'text-rose-400'
                          : 'text-zinc-400',
                    )}
                  >
                    {isPrivate
                      ? '***'
                      : typeof t.pnl === 'number' && Number.isFinite(t.pnl)
                        ? formatSignedMoney(t.pnl)
                        : '—'}
                  </TD>
                  <TD align="right" className="text-xs text-[#8c94a0] num">
                    {t.durationMin > 0 ? formatDuration(t.durationMin) : '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
