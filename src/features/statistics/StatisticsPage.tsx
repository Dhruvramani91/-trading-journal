import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WinRateRing } from '@/components/stats/WinRateRing';
import { BreakdownCard } from '@/components/stats/BreakdownCard';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary, allBreakdowns } from '@/analytics/core';
import type { CategoryBreakdown } from '@/analytics/core';
import { formatPct, formatR } from '@/lib/format';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import { cn } from '@/lib/cn';

type Tone = 'win' | 'loss';
const toneOf = (v: number): Tone | undefined => (v > 0 ? 'win' : v < 0 ? 'loss' : undefined);

/** "dailyCandle" -> "Daily Candle", "h4Candle" -> "H4 Candle" */
function pretty(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Metric({
  label,
  value,
  sub,
  tone,
  size = 'lg',
  aside,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: Tone;
  size?: 'lg' | 'sm';
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-2xs text-fg-dim">{label}</p>
        <p
          className={cn(
            'mt-1 font-semibold tabular-nums tracking-tight',
            size === 'lg' ? 'text-2xl' : 'text-base',
            tone === 'win' && 'text-win',
            tone === 'loss' && 'text-loss',
            !tone && 'text-fg',
          )}
        >
          {value}
        </p>
        {sub ? <div className="mt-1.5 text-2xs text-fg-muted">{sub}</div> : null}
      </div>
      {aside}
    </div>
  );
}

export function StatisticsPage() {
  const { trades, loaded, load } = useTradesStore();
  const [tab, setTab] = useState<string>('instrument');

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const s = useMemo(() => (loaded ? summary(trades) : null), [loaded, trades]);

  const templates = useMemo(
    () => (loaded ? allBreakdowns(trades, ACTIVE_TEMPLATE_ID) : ([] as CategoryBreakdown[])),
    [loaded, trades],
  );

  const instruments = useMemo(() => {
    const m = new Map<string, { count: number; totalR: number; wins: number; losses: number }>();
    for (const t of trades) {
      let row = m.get(t.instrument);
      if (!row) {
        row = { count: 0, totalR: 0, wins: 0, losses: 0 };
        m.set(t.instrument, row);
      }
      row.count++;
      row.totalR += t.r;
      if (t.result === 'win') row.wins++;
      else if (t.result === 'loss') row.losses++;
    }
    return Array.from(m.entries()).sort((a, b) => b[1].totalR - a[1].totalR);
  }, [trades]);

  const maxAbs = Math.max(1, ...instruments.map(([, v]) => Math.abs(v.totalR)));

  const tabs = [
    { key: 'instrument', label: 'Instruments' },
    ...templates.map((b) => ({ key: b.fieldKey, label: b.fieldKey === 'mtf' ? 'ITF' : pretty(b.fieldKey), })),
  ];
  const active = templates.find((b) => b.fieldKey === tab);
  const showInstruments = tab === 'instrument' || !active;

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = Math.max(0, tabs.findIndex((t) => t.key === tab));
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];

      if (!next) return;

    setTab(next.key);
    document.getElementById(`stats-tab-${next.key}`)?.focus();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics"
        description="How your trades perform, broken down by category."
      />

      {!loaded || !s ? (
        <div className="text-sm text-fg-muted">Loading statistics…</div>
      ) : trades.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No trades to analyze"
          description="Add trades from the journal to generate statistics."
        />
      ) : (
        <>
          {/* One summary card: main numbers on top, extremes underneath */}
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 p-5 md:grid-cols-5 md:p-6">
              <Metric
                label="Total R"
                value={formatR(s.totalR ?? 0)}
                tone={toneOf(s.totalR ?? 0)}
              />
              <Metric
                label="Win rate"
                value={s.winRate == null ? '—' : formatPct(s.winRate)}
                sub={`Avg R ${formatR(s.avgR ?? 0)}`}
                aside={<WinRateRing rate={s.winRate ?? 0} size={40} />}
              />
              <Metric
                label="Trades"
                value={String(s.count ?? 0)}
                sub={
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone="win">{s.wins ?? 0} W</Badge>
                    <Badge tone="loss">{s.losses ?? 0} L</Badge>
                    <Badge tone="be">{s.bes ?? 0} BE</Badge>
                  </span>
                }
              />
              <Metric
                label="Expectancy"
                value={formatR(s.expectancy ?? 0)}
                tone={toneOf(s.expectancy ?? 0)}
              />
              <Metric
                label="Avg R:R"
                value={s.avgRR == null ? '—' : s.avgRR.toFixed(2)}
              />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line px-5 py-5 md:grid-cols-5 md:px-6">
              <Metric size="sm" label="Best trade" value={formatR(s.bestR ?? 0)} tone="win" />
              <Metric size="sm" label="Worst trade" value={formatR(s.worstR ?? 0)} tone="loss" />
              <Metric size="sm" label="Max drawdown" value={formatR(s.maxDrawdownR ?? 0)} tone="loss" />
              <Metric size="sm" label="Longest win streak" value={String(s.longestWinStreak ?? 0)} />
              <Metric size="sm" label="Longest loss streak" value={String(s.longestLossStreak ?? 0)} />
            </div>
          </Card>

          {/* One breakdown at a time, chosen with the tabs */}
          <div>
            <div
              role="tablist"
              aria-label="Break results down by"
              onKeyDown={onTabKey}
              className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {tabs.map((t) => {
                const selected = t.key === (showInstruments ? 'instrument' : tab);
                return (
                  <button
                    key={t.key}
                    id={`stats-tab-${t.key}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="stats-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-fg bg-fg font-medium text-fg-inverse'
                        : 'border-line text-fg-muted hover:bg-bg-4 hover:text-fg',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div id="stats-panel" role="tabpanel">
              {showInstruments ? (
                <Card className="overflow-hidden">
                  <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
                    <h2 className="text-base font-semibold text-fg">Instruments</h2>
                    <span className="text-xs text-fg-dim">{instruments.length} traded</span>
                  </div>

                  {instruments.length === 0 ? (
                    <p className="border-t border-line px-5 py-6 text-sm text-fg-dim">
                      No instrument data.
                    </p>
                  ) : (
                    instruments.map(([instr, v]) => {
                      const w = (Math.abs(v.totalR) / maxAbs) * 50;
                      const winPct = v.count ? Math.round((v.wins / v.count) * 100) : 0;
                      const tone = toneOf(v.totalR);
                      return (
                        <div key={instr} className="border-t border-line px-5 py-4">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-medium text-fg">{instr}</span>
                            <span
                              className={cn(
                                'text-lg font-semibold tabular-nums tracking-tight',
                                tone === 'win' && 'text-win',
                                tone === 'loss' && 'text-loss',
                                !tone && 'text-fg-muted',
                              )}
                            >
                              {formatR(v.totalR)}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-fg-muted">
                            <span className="flex flex-wrap gap-x-4">
                              <span>
                                {v.count} trade{v.count === 1 ? '' : 's'}
                              </span>
                              <span>{winPct}% win rate</span>
                              <span>avg {formatR(v.count ? v.totalR / v.count : 0)}</span>
                            </span>
                            <span className="flex gap-1.5">
                              {v.wins > 0 && <Badge tone="win">{v.wins} W</Badge>}
                              {v.losses > 0 && <Badge tone="loss">{v.losses} L</Badge>}
                            </span>
                          </div>

                          {/* bar grows right for gains, left for losses, same scale for every row */}
                          <div className="relative mt-3 h-2 rounded-full bg-bg-1">
                            <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line" />
                            <span
                              className={cn(
                                'absolute inset-y-0 rounded-full',
                                tone === 'win' && 'bg-win',
                                tone === 'loss' && 'bg-loss',
                                !tone && 'bg-fg-dim',
                              )}
                              style={
                                v.totalR === 0
                                  ? { left: 'calc(50% - 3px)', width: 6 }
                                  : { left: `${v.totalR > 0 ? 50 : 50 - w}%`, width: `${w}%` }
                              }
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </Card>
              ) : (
                active ? <BreakdownCard key={active.fieldKey} breakdown={active} /> : null
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
