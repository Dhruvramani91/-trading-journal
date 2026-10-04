import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { byDay, dayKey, summary } from '@/analytics/core';
import { formatR, formatPct, formatSignedMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Trade } from '@/domain/models/trade';
import type { DayPerformance } from '@/analytics/core';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOffset(year: number, month: number, showWeekends: boolean): number {
  const day = new Date(year, month, 1).getDay();

  // Calendar starts on Monday.
  const mondayBasedDay = day === 0 ? 7 : day;

  if (showWeekends) {
    return mondayBasedDay - 1;
  }

  // When weekends are hidden, a month beginning on Saturday/Sunday
  // starts with the first visible weekday instead of leaving weekend gaps.
  if (mondayBasedDay > 5) {
    return 0;
  }

  return mondayBasedDay - 1;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function dayKeyFromParts(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rTone(totalR: number): string {
  if (totalR > 0) return 'text-win';
  if (totalR < 0) return 'text-loss';
  return 'text-be';
}

function rBg(totalR: number): string {
  if (totalR > 0) return 'bg-win/10 border-win/30 hover:bg-win/20';
  if (totalR < 0) return 'bg-loss/10 border-loss/30 hover:bg-loss/20';
  return 'bg-be/10 border-be/30 hover:bg-be/20';
}

export function CalendarPage() {
  const { trades, loaded, load } = useTradesStore();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // ON by default so the existing calendar behavior is preserved.
  const [showWeekends, setShowWeekends] = useState(true);
  const [showCalendarValues, setShowCalendarValues] = useState(true);

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const dayMap = useMemo<Map<string, DayPerformance & { totalPnl: number | null }>>(() => {
    if (!loaded) return new Map<string, DayPerformance & { totalPnl: number | null }>();

    const days = byDay(trades);
    const map = new Map<string, DayPerformance & { totalPnl: number | null }>();

    for (const d of days) {
      map.set(d.date, { ...d, totalPnl: null });
    }

    for (const trade of trades) {
      const day = map.get(dayKey(trade.openedAt));
      if (!day || trade.pnl == null || !Number.isFinite(trade.pnl)) continue;
      day.totalPnl = (day.totalPnl ?? 0) + trade.pnl;
    }

    return map;
  }, [loaded, trades]);

  const monthTrades = useMemo(() => {
    if (!loaded) return [] as Trade[];

    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    return trades.filter((t) => {
      const d = new Date(t.openedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === prefix;
    });
  }, [loaded, trades, year, month]);

  const monthSummary = useMemo(() => {
    if (monthTrades.length === 0) return null;
    return summary(monthTrades);
  }, [monthTrades]);

  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month, showWeekends);

  const visibleWeekdays = showWeekends
    ? WEEKDAY_LABELS
    : WEEKDAY_LABELS.slice(0, 5);

  function goPrev() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function goNext() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  if (!loaded) {
    return <Loader title="Loading calendar…" className="min-h-64" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Performance"
        description="A calendar view of your daily R, with each day colored by performance."
      />

      <Card>
        <CardHeader className="flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={goPrev}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Prev
            </Button>

            <h2 className="text-base sm:text-lg font-bold text-fg min-w-[9rem] sm:min-w-[11rem] text-center">
              {monthLabel(year, month)}
            </h2>

            <Button
              variant="secondary"
              size="sm"
              onClick={goNext}
              leftIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto sm:ml-auto">
            {/* Weekend visibility toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={showWeekends}
              aria-label="Show weekends"
              onClick={() => setShowWeekends((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2 px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-3 hover:text-fg"
            >
              <span>Weekends</span>

              <span
                aria-hidden="true"
                className={cn(
                  'relative block h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors',
                  showWeekends ? 'bg-accent' : 'bg-bg-4 border border-line',
                )}
              >
                <span
                  className={cn(
                    'block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    showWeekends ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={showCalendarValues}
              aria-label="Show R and P&L on calendar"
              onClick={() => setShowCalendarValues((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2 px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-3 hover:text-fg"
            >
              <span>Show R &amp; P&amp;L</span>
              <span
                aria-hidden="true"
                className={cn(
                  'relative block h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors',
                  showCalendarValues ? 'bg-accent' : 'bg-bg-4 border border-line',
                )}
              >
                <span
                  className={cn(
                    'block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    showCalendarValues ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </span>
            </button>

            {!isCurrentMonth && (
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
            )}
          </div>
        </CardHeader>

        <CardBody className="p-2 sm:p-4 md:p-5">
          {trades.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-6 w-6" />}
              title="No trades yet"
              description="Add trades from the journal to see calendar performance."
            />
          ) : (
            <>
              <div className="w-full overflow-x-auto pb-2 pr-1 xl:overflow-visible">
              <div className="min-w-[980px] xl:min-w-0">
              {/* Weekday header */}
              <div
                className={cn(
                  'grid gap-2 mb-2',
                  showWeekends ? 'grid-cols-7' : 'grid-cols-5',
                )}
              >
                {visibleWeekdays.map((label) => (
                  <div
                    key={label}
                    className="text-center text-[11px] uppercase tracking-wider text-fg-dim font-bold py-2"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div
                className={cn(
                  'grid gap-2',
                  showWeekends ? 'grid-cols-7' : 'grid-cols-5',
                )}
              >
                {Array.from({ length: totalDays }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const weekday = date.getDay();

                  // Hide Saturday and Sunday when the toggle is OFF.
                  if (!showWeekends && (weekday === 0 || weekday === 6)) {
                    return null;
                  }

                  const key = dayKeyFromParts(year, month, day);
                  const perf = dayMap.get(key);

                  const isToday =
                    day === now.getDate() &&
                    month === now.getMonth() &&
                    year === now.getFullYear();

                  return (
                    <button
                      key={key}
                      type="button"
                      style={day === 1 ? { gridColumnStart: offset + 1 } : undefined}
                      onClick={() => {
                        if (perf) navigate('/journal');
                      }}
                      className={cn(
                        'relative flex flex-col items-stretch justify-between p-3 rounded-xl border transition-all min-h-[112px]',
                        perf
                          ? cn(
                              rBg(perf.totalR),
                              'cursor-pointer hover:scale-[1.02] shadow-sm',
                            )
                          : 'border-line/60 bg-bg-2/60 text-fg-dim hover:border-line',
                        isToday && 'ring-2 ring-accent shadow-sm',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-semibold self-start',
                          perf ? 'text-fg' : 'text-fg-dim',
                          isToday && 'text-accent font-bold',
                        )}
                      >
                        {day}
                      </span>

                      {perf && (
                        <div className="mt-2 flex w-full flex-col gap-1.5">
                          {showCalendarValues ? (
                            <>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-fg-dim">R</span>
                                <span className={cn('text-sm font-bold tabular-nums', rTone(perf.totalR))}>
                                  {formatR(perf.totalR, 1)}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-fg-dim">P&amp;L</span>
                                <span className={cn('text-[13px] font-bold tabular-nums', perf.totalPnl == null ? 'text-fg-dim' : perf.totalPnl > 0 ? 'text-win' : perf.totalPnl < 0 ? 'text-loss' : 'text-be')}>
                                  {perf.totalPnl == null ? '—' : formatSignedMoney(perf.totalPnl)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="self-end text-xs text-fg-dim">{perf.count} trade{perf.count === 1 ? '' : 's'}</span>
                          )}
                          {showCalendarValues && (
                            <span className="text-right text-[10px] font-medium text-fg-dim">
                              {perf.count} trade{perf.count === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Month summary */}
      {monthSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
          <Card>
            <CardBody className="p-3.5 sm:p-4">
              <Stat
                label="Total R"
                value={formatR(monthSummary.totalR)}
                tone={
                  monthSummary.totalR > 0
                    ? 'win'
                    : monthSummary.totalR < 0
                      ? 'loss'
                      : 'default'
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-3.5 sm:p-4">
              <Stat label="Trades" value={String(monthSummary.count)} />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-3.5 sm:p-4">
              <Stat
                label="Win Rate"
                value={
                  monthSummary.winRate == null
                    ? '—'
                    : formatPct(monthSummary.winRate)
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-3.5 sm:p-4">
              <Stat label="Best R" value={formatR(monthSummary.bestR)} tone="win" />
            </CardBody>
          </Card>

          <Card className="col-span-2 sm:col-span-1">
            <CardBody className="p-3.5 sm:p-4">
              <Stat label="Worst R" value={formatR(monthSummary.worstR)} tone="loss" />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Daily breakdown */}
      {monthTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Daily breakdown
            </CardTitle>
          </CardHeader>

          <CardBody className="p-0">
            <div className="divide-y divide-line">
              {byDay(monthTrades).map((d) => (
                <div
                  key={d.date}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 text-sm hover:bg-bg-4 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-fg font-semibold text-xs font-mono w-24">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        },
                      )}
                    </span>

                    <span className="text-fg-dim text-xs">
                      {d.count} trade{d.count === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-2xs text-fg-dim">
                      {d.wins}W / {d.losses}L / {d.bes}BE
                    </span>

                    <span className={cn('font-bold tabular-nums', rTone(d.totalR))}>
                      {formatR(d.totalR)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
