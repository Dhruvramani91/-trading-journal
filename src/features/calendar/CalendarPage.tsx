import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Info,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { byDay, dayKey } from '@/analytics/core';
import { formatR, formatSignedMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { computeTraderScore } from '@/analytics/core/dashboardAnalytics';
import { TraderScoreRadar } from '../dashboard/components/TraderScoreRadar';
import type { Trade } from '@/domain/models/trade';
import type { DayPerformance } from '@/analytics/core';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns monday-based offset for day 1 of the given year/month.
 * 0 = Monday, 6 = Sunday.
 */
function getMondayBasedOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function dayKeyFromParts(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarPage() {
  const { trades, loaded, load } = useTradesStore();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // View modes: Daily, Monthly, Yearly
  const [viewMode, setViewMode] = useState<'Daily' | 'Monthly' | 'Yearly'>('Daily');

  // Metric display toggles
  const [metricMode, setMetricMode] = useState<'pnl' | 'r'>('pnl');

  // Selected day for side panel breakdown
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Fullscreen / side-panel toggle for calendar
  const [isScoreOpen, setIsScoreOpen] = useState(true);

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  // Aggregate trades by day
  const dayMap = useMemo<Map<string, DayPerformance & { totalPnl: number | null; trades: Trade[] }>>(() => {
    if (!loaded) return new Map();

    const days = byDay(trades);
    const map = new Map<string, DayPerformance & { totalPnl: number | null; trades: Trade[] }>();

    for (const d of days) {
      map.set(d.date, { ...d, totalPnl: null, trades: [] });
    }

    for (const trade of trades) {
      const dKey = dayKey(trade.openedAt);
      const day = map.get(dKey);
      if (!day) continue;
      day.trades.push(trade);
      if (trade.pnl != null && Number.isFinite(trade.pnl)) {
        day.totalPnl = (day.totalPnl ?? 0) + trade.pnl;
      }
    }

    return map;
  }, [loaded, trades]);

  // Trades in current month
  const monthTrades = useMemo(() => {
    if (!loaded) return [] as Trade[];
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return trades.filter((t) => {
      const d = new Date(t.openedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === prefix;
    });
  }, [loaded, trades, year, month]);

  // Selected day or month trades for the right-hand score panel
  const displayTrades = useMemo(() => {
    if (selectedDayKey && dayMap.has(selectedDayKey)) {
      return dayMap.get(selectedDayKey)!.trades;
    }
    return monthTrades;
  }, [selectedDayKey, dayMap, monthTrades]);

  // Radar score computed for current display set
  const scoreData = useMemo(() => {
    return computeTraderScore(displayTrades, metricMode);
  }, [displayTrades, metricMode]);

  // Grid calculation (always 42 cells = 6 rows x 7 days)
  const totalDaysCurrentMonth = daysInMonth(year, month);
  const firstDayOffset = getMondayBasedOffset(year, month);

  // Previous month trailing days
  const prevMonthTotalDays = daysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);

  const calendarGrid = useMemo(() => {
    const cells: Array<{
      dayNumber: number;
      monthType: 'prev' | 'current' | 'next';
      dateKey: string;
      isToday: boolean;
      dateObj: Date;
    }> = [];

    // 1. Previous month trailing days
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const mIdx = month === 0 ? 11 : month - 1;
      const yVal = month === 0 ? year - 1 : year;
      const dKey = dayKeyFromParts(yVal, mIdx, dayNum);
      cells.push({
        dayNumber: dayNum,
        monthType: 'prev',
        dateKey: dKey,
        isToday: false,
        dateObj: new Date(yVal, mIdx, dayNum),
      });
    }

    // 2. Current month days
    for (let day = 1; day <= totalDaysCurrentMonth; day++) {
      const dKey = dayKeyFromParts(year, month, day);
      const isToday =
        day === now.getDate() &&
        month === now.getMonth() &&
        year === now.getFullYear();
      cells.push({
        dayNumber: day,
        monthType: 'current',
        dateKey: dKey,
        isToday,
        dateObj: new Date(year, month, day),
      });
    }

    // 3. Next month leading days (fill up to 35 or 42 cells)
    const targetLength = cells.length > 35 ? 42 : 35;
    const remaining = targetLength - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const mIdx = month === 11 ? 0 : month + 1;
      const yVal = month === 11 ? year + 1 : year;
      const dKey = dayKeyFromParts(yVal, mIdx, day);
      cells.push({
        dayNumber: day,
        monthType: 'next',
        dateKey: dKey,
        isToday: false,
        dateObj: new Date(yVal, mIdx, day),
      });
    }

    return cells;
  }, [year, month, totalDaysCurrentMonth, firstDayOffset, prevMonthTotalDays]);

  // Weekly summaries for 5 or 6 rows
  const weekSummaries = useMemo(() => {
    const rowCount = calendarGrid.length / 7;
    const rows: Array<{ count: number; totalR: number; totalPnl: number }> = [];

    for (let r = 0; r < rowCount; r++) {
      let count = 0;
      let totalR = 0;
      let totalPnl = 0;
      for (let c = 0; c < 7; c++) {
        const cell = calendarGrid[r * 7 + c];
        if (!cell) continue;
        const perf = dayMap.get(cell.dateKey);
        if (perf) {
          count += perf.count;
          totalR += perf.totalR;
          totalPnl += perf.totalPnl ?? 0;
        }
      }
      rows.push({ count, totalR, totalPnl });
    }
    return rows;
  }, [calendarGrid, dayMap]);

  function goPrev() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
    setSelectedDayKey(null);
  }

  function goNext() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
    setSelectedDayKey(null);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDayKey(null);
  }

  // Selected day stats for the side card
  const selectedDayPerf = selectedDayKey ? dayMap.get(selectedDayKey) : null;
  const isSelectedActive = Boolean(selectedDayKey && selectedDayPerf);

  // Top info bar text
  const periodTradeCount = monthTrades.length;

  if (!loaded) {
    return <Loader title="Loading calendar…" className="min-h-64" />;
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-16">
      {/* 1. Header Toolbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Month / Year Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prev Arrow */}
          <button
            type="button"
            onClick={goPrev}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-bg-1 border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setSelectedDayKey(null);
              }}
              className="appearance-none bg-bg-1 border border-line rounded-lg h-9 px-3 pr-8 text-xs font-medium text-fg hover:border-line-strong focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx} value={idx}>
                  {mName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-fg-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Year Selector Dropdown */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setSelectedDayKey(null);
              }}
              className="appearance-none bg-bg-1 border border-line rounded-lg h-9 px-3 pr-8 text-xs font-medium text-fg hover:border-line-strong focus:outline-none cursor-pointer font-mono"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yVal) => (
                <option key={yVal} value={yVal}>
                  {yVal}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-fg-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Next Arrow */}
          <button
            type="button"
            onClick={goNext}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-bg-1 border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Today Button */}
          <button
            type="button"
            onClick={goToday}
            className="h-9 px-3 rounded-lg bg-bg-1 border border-line text-xs font-medium text-fg hover:bg-bg-2 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Right: View Toggles & Note / Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* PnL vs R toggle */}
          <div className="inline-flex h-9 items-center p-0.5 rounded-lg bg-bg-2 border border-line">
            <button
              type="button"
              onClick={() => setMetricMode('pnl')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-colors',
                metricMode === 'pnl'
                  ? 'bg-bg-1 text-fg shadow-sm border border-line/50 font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              P&amp;L
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('r')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-colors',
                metricMode === 'r'
                  ? 'bg-bg-1 text-fg shadow-sm border border-line/50 font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              R
            </button>
          </div>

          {/* Daily / Monthly / Yearly segment */}
          <div className="inline-flex h-9 items-center p-0.5 rounded-lg bg-bg-2 border border-line">
            {(['Daily', 'Monthly', 'Yearly'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'h-7 px-3 rounded-md text-xs font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-bg-1 text-fg shadow-sm border border-line/50 font-semibold'
                    : 'text-fg-muted hover:text-fg',
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Fullscreen Calendar Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-lg border-line text-xs font-medium text-fg bg-bg-1 hover:bg-bg-2"
            onClick={() => setIsScoreOpen(!isScoreOpen)}
            leftIcon={isScoreOpen ? <PanelRightClose className="w-3.5 h-3.5 text-fg-muted" /> : <PanelRightOpen className="w-3.5 h-3.5 text-fg-muted" />}
            title={isScoreOpen ? 'Collapse score panel to expand calendar' : 'Show score panel'}
          >
            {isScoreOpen ? 'Expand' : 'Score'}
          </Button>

          {/* Add Trade Button */}
          <Button
            variant="primary"
            size="sm"
            className="h-9 px-3.5 rounded-lg text-xs font-medium"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => navigate('/journal/new')}
          >
            New trade
          </Button>
        </div>
      </header>

      {/* 2. Top Info Sub-banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-1 border border-line text-xs text-fg-muted shadow-card">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
        {periodTradeCount === 0 ? (
          <span className="font-medium">No trades logged in this period</span>
        ) : (
          <span className="font-medium">
            {periodTradeCount} {periodTradeCount === 1 ? 'trade' : 'trades'} logged in {MONTH_NAMES[month]} {year}
          </span>
        )}
      </div>

      {/* 3. Main Grid: 7-day + Week Column (Left) and Score Radar (Right) */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Calendar Matrix (Full width when collapsed, 8 cols when score is open) */}
        <div
          className={cn(
            'bg-bg-1 border border-line rounded-xl p-3 sm:p-4 md:p-5 flex flex-col justify-between shadow-card transition-all duration-300 relative',
            isScoreOpen ? 'lg:col-span-8' : 'lg:col-span-12',
          )}
        >
          {/* Interactive Toggle Handle on the Divider (Positioned top-middle of the border) */}
          <button
            type="button"
            onClick={() => setIsScoreOpen(!isScoreOpen)}
            className="hidden lg:flex absolute -right-3.5 top-8 z-40 h-7 w-7 rounded-full border border-line bg-bg-1 text-fg-dim shadow-sm items-center justify-center transition-all hover:bg-bg-3 hover:text-fg hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 cursor-pointer"
            title={isScoreOpen ? 'Hide score panel (Full calendar)' : 'Show score panel'}
            aria-label={isScoreOpen ? 'Hide score panel' : 'Show score panel'}
          >
            {isScoreOpen ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="w-full">
            {/* Weekday Header */}
            <div className="grid grid-cols-8 gap-1 sm:gap-1.5 mb-2.5 text-center">
              {WEEKDAY_HEADERS.map((hName) => (
                <div key={hName} className="text-[10px] sm:text-[11px] font-medium text-fg-dim py-1 truncate">
                  {hName}
                </div>
              ))}
              <div className="text-[10px] sm:text-[11px] font-medium text-fg-dim py-1 truncate">
                Week
              </div>
            </div>

            {/* Calendar Cells Grid with Week Summary Column */}
            <div className="flex flex-col gap-1 sm:gap-1.5">
              {Array.from({ length: calendarGrid.length / 7 }).map((_, rIdx) => {
                const weekRow = weekSummaries[rIdx];
                return (
                  <div key={rIdx} className="grid grid-cols-8 gap-1 sm:gap-1.5">
                    {/* 7 Days */}
                    {calendarGrid.slice(rIdx * 7, rIdx * 7 + 7).map((cell) => {
                      const perf = dayMap.get(cell.dateKey);
                      const hasTrades = Boolean(perf && perf.count > 0);
                      const isSelected = selectedDayKey === cell.dateKey;
                      const isPrevOrNext = cell.monthType !== 'current';

                      const isWin = perf && (metricMode === 'r' ? perf.totalR > 0 : (perf.totalPnl ?? 0) > 0);
                      const isLoss = perf && (metricMode === 'r' ? perf.totalR < 0 : (perf.totalPnl ?? 0) < 0);

                      return (
                        <div
                          key={cell.dateKey}
                          onClick={() => {
                            setSelectedDayKey(isSelected ? null : cell.dateKey);
                          }}
                          className={cn(
                            'min-h-[64px] sm:min-h-[76px] lg:min-h-[82px] rounded-lg p-1.5 sm:p-2.5 flex flex-col justify-between transition-colors border cursor-pointer select-none',
                            // Inactive vs Active Day styling
                            hasTrades
                              ? isWin
                                ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                                : isLoss
                                  ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60'
                                  : 'bg-bg-2 border-line hover:border-line-strong'
                              : 'bg-bg-1/60 border-line/40 hover:border-line',
                            cell.isToday && 'ring-1 ring-sky-500',
                            isSelected && 'border-sky-400 bg-sky-500/10',
                            isPrevOrNext && 'opacity-40',
                          )}
                        >
                          {/* Top: Day number + Trade dots */}
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-[11px] sm:text-xs font-semibold font-mono',
                                isPrevOrNext ? 'text-fg-dim' : 'text-fg',
                                cell.isToday && 'text-sky-500 dark:text-sky-400 font-bold',
                              )}
                            >
                              {cell.dayNumber}
                            </span>

                            {/* Small Trade indicator dots */}
                            {hasTrades && (
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: Math.min(4, perf!.count) }).map((_, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className={cn(
                                      'w-1.5 h-1.5 rounded-full',
                                      isWin ? 'bg-emerald-500 dark:bg-emerald-400' : isLoss ? 'bg-rose-500 dark:bg-rose-400' : 'bg-zinc-400',
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Bottom: Monetary P&L / R & Trade count */}
                          {hasTrades ? (
                            <div className="mt-0.5 sm:mt-1">
                              <span
                                className={cn(
                                  'text-[10px] sm:text-xs font-bold font-mono tracking-tight block truncate',
                                  isWin ? 'text-emerald-600 dark:text-emerald-400' : isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-fg-muted',
                                )}
                              >
                                {metricMode === 'r'
                                  ? formatR(perf!.totalR, 1)
                                  : perf!.totalPnl != null
                                    ? formatSignedMoney(perf!.totalPnl)
                                    : '—'}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-fg-muted block truncate mt-0.5">
                                {perf!.count} trade{perf!.count === 1 ? '' : 's'} · {perf!.count > 0 ? `${Math.round((perf!.wins / perf!.count) * 100)}%` : '0%'}
                              </span>
                            </div>
                          ) : (
                            <div className="h-3 sm:h-4" />
                          )}
                        </div>
                      );
                    })}

                    {/* 8th Column: Week Summary Block */}
                    <div className="min-h-[64px] sm:min-h-[76px] lg:min-h-[82px] rounded-lg p-1.5 sm:p-2 bg-bg-2 border border-line/60 flex flex-col justify-center items-center text-center">
                      {weekRow && weekRow.count > 0 ? (
                        <div>
                          <span
                            className={cn(
                              'text-[10px] sm:text-xs font-bold font-mono block truncate',
                              weekRow.totalR > 0 ? 'text-emerald-600 dark:text-emerald-400' : weekRow.totalR < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg-muted',
                            )}
                          >
                            {metricMode === 'r'
                              ? formatR(weekRow.totalR, 1)
                              : formatSignedMoney(weekRow.totalPnl)}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-fg-dim font-mono mt-0.5 block truncate">
                            {weekRow.count} tr
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-fg-dim/40 font-mono">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: SureScore / Precision Score Card (collapsible) */}
        {isScoreOpen && (
          <div className="lg:col-span-4 bg-bg-1 border border-line rounded-xl p-5 flex flex-col justify-between shadow-card animate-in fade-in duration-200">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    Precision Score
                    <Info className="w-3.5 h-3.5 text-fg-dim" />
                  </h3>
                  <p className="text-xs text-fg-dim mt-0.5">
                    {isSelectedActive
                      ? `Day: ${selectedDayKey} · ${selectedDayPerf?.count} trade(s)`
                      : `Month: ${MONTH_NAMES[month]} ${year} · ${displayTrades.length} trade(s)`}
                  </p>
                </div>
                <span className="text-2xl sm:text-3xl font-semibold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {scoreData.overallScore.toFixed(1)}
                </span>
              </div>

              {/* Radar Spider Plot */}
              <div className="flex justify-center my-2">
                <TraderScoreRadar scoreData={scoreData} />
              </div>
            </div>

            {/* Breakdown Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-line text-xs">
              {scoreData.axes.map((ax) => (
                <div key={ax.label} className="flex items-center justify-between">
                  <span className="text-fg-muted">{ax.label}</span>
                  <span className="font-mono font-bold text-fg">{ax.displayValue}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
