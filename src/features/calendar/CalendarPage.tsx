import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { byDay, summary } from '@/analytics/core';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Trade } from '@/domain/models/trade';
import type { DayPerformance } from '@/analytics/core';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Get the number of days in a given month (0-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the weekday offset (0=Mon, 6=Sun) for the 1st of the month.
 * JS getDay() returns 0=Sun, so we convert to Mon-first.
 */
function firstDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // convert Sun=0→6, Mon=1→0, etc.
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

/** Tone class for a given R total. */
function rTone(totalR: number): string {
  if (totalR > 0) return 'text-win';
  if (totalR < 0) return 'text-loss';
  return 'text-be';
}

function rBg(totalR: number): string {
  if (totalR > 0) return 'bg-win/8 border-win/20';
  if (totalR < 0) return 'bg-loss/8 border-loss/20';
  return 'bg-be/8 border-be/20';
}

export function CalendarPage() {
  const { trades, loaded, load } = useTradesStore();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => { bootTradesStore(); }, []);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);

  // Build a map of date → DayPerformance for fast lookup
  const dayMap = useMemo(() => {
    if (!loaded) return new Map<string, DayPerformance>();
    const days = byDay(trades);
    const map = new Map<string, DayPerformance>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [loaded, trades]);

  // Trades for the currently displayed month
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

  // Grid data
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);

  function goPrev() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function goNext() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  if (!loaded) {
    return <div className="pt-20 text-center text-sm text-fg-muted">Loading calendar…</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Performance"
        description="A calendar view of your daily R, with each day colored by performance."
      />

      {/* Month navigator */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goPrev} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                Prev
              </Button>
              <h2 className="text-lg font-semibold text-fg min-w-[11rem] text-center">
                {monthLabel(year, month)}
              </h2>
              <Button variant="ghost" size="sm" onClick={goNext} leftIcon={<ChevronRight className="h-4 w-4" />}>
                Next
              </Button>
            </div>
            {!isCurrentMonth && (
              <Button variant="secondary" size="sm" onClick={goToday}>
                Today
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {trades.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-6 w-6" />}
              title="No trades yet"
              description="Add trades from the journal to see calendar performance."
            />
          ) : (
            <>
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="text-center text-2xs uppercase tracking-wider text-fg-dim font-medium py-1.5"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: offset }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Actual day cells */}
                {Array.from({ length: totalDays }, (_, i) => {
                  const day = i + 1;
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
                      onClick={() => {
                        if (perf) navigate('/journal');
                      }}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-lg border transition-all aspect-square',
                        perf
                          ? cn(
                              rBg(perf.totalR),
                              'cursor-pointer hover:scale-[1.04] hover:shadow-pop',
                            )
                          : 'border-transparent',
                        isToday && 'ring-1 ring-accent/60',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-medium',
                          perf ? 'text-fg' : 'text-fg-dim',
                          isToday && 'text-accent',
                        )}
                      >
                        {day}
                      </span>
                      {perf && (
                        <>
                          <span className={cn('text-sm font-bold tabular-nums mt-0.5', rTone(perf.totalR))}>
                            {formatR(perf.totalR)}
                          </span>
                          <span className="text-2xs text-fg-dim mt-0.5">
                            {perf.count} trade{perf.count === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Month summary */}
      {monthSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardBody>
              <Stat
                label="Total R"
                value={formatR(monthSummary.totalR)}
                tone={monthSummary.totalR > 0 ? 'win' : monthSummary.totalR < 0 ? 'loss' : 'default'}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat label="Trades" value={String(monthSummary.count)} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat
                label="Win Rate"
                value={monthSummary.winRate == null ? '—' : formatPct(monthSummary.winRate)}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat
                label="Best R"
                value={formatR(monthSummary.bestR)}
                tone="win"
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat
                label="Worst R"
                value={formatR(monthSummary.worstR)}
                tone="loss"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Trading days breakdown */}
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
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg-3/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-fg-muted text-xs font-mono w-24">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-fg-dim text-xs">
                      {d.count} trade{d.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xs text-fg-dim">
                      {d.wins}W / {d.losses}L / {d.bes}BE
                    </span>
                    <span className={cn('font-semibold tabular-nums', rTone(d.totalR))}>
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
