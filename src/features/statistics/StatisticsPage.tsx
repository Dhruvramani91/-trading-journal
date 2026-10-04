import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WinRateRing } from '@/components/stats/WinRateRing';
import { BreakdownCard } from '@/components/stats/BreakdownCard';
import { InstrumentMark } from '@/components/trade/InstrumentMark';

import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary, allBreakdowns } from '@/analytics/core';
import type { CategoryBreakdown } from '@/analytics/core';

import { formatMoney, formatPct, formatR } from '@/lib/format';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import { cn } from '@/lib/cn';

type Tone = 'win' | 'loss';

const toneOf = (v: number): Tone | undefined =>
  v > 0 ? 'win' : v < 0 ? 'loss' : undefined;

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
    <div className="flex min-h-[88px] min-w-0 items-start justify-between gap-3 rounded-xl border border-line bg-bg-1 p-4 shadow-sm transition-colors hover:border-line-strong">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-dim">{label}</p>

        <p
          className={cn(
            'mt-1 font-semibold tabular-nums tracking-tight',
            size === 'lg' ? 'text-2xl sm:text-[1.75rem]' : 'text-lg',
            tone === 'win' && 'text-win',
            tone === 'loss' && 'text-loss',
            !tone && 'text-fg',
          )}
        >
          {value}
        </p>

        {sub ? (
          <div className="mt-1.5 text-2xs text-fg-muted">
            {sub}
          </div>
        ) : null}
      </div>

      {aside}
    </div>
  );
}

/**
 * P&L statistics are deliberately separate from the existing
 * R-based analytics.
 *
 * R calculations continue to come from the existing analytics engine.
 * P&L calculations use the actual stored trade.pnl value.
 */
function calculatePnlStats(
  trades: readonly {
    pnl?: number | null;
    openedAt: string;
  }[],
) {
  if (trades.length === 0) {
    return {
      totalPnl: 0,
      averagePnl: 0,
      bestPnl: 0,
      worstPnl: 0,
      maxDrawdownPnl: 0,
    };
  }

  let totalPnl = 0;
  let bestPnl = -Infinity;
  let worstPnl = Infinity;

  for (const trade of trades) {
    const pnl =
      typeof trade.pnl === 'number' && Number.isFinite(trade.pnl)
        ? trade.pnl
        : 0;

    totalPnl += pnl;

    if (pnl > bestPnl) bestPnl = pnl;
    if (pnl < worstPnl) worstPnl = pnl;
  }

  /*
   * P&L drawdown follows the same conceptual approach as
   * the existing R drawdown:
   *
   * 1. Sort trades chronologically.
   * 2. Build cumulative P&L.
   * 3. Track the highest equity peak.
   * 4. Measure the largest peak-to-trough decline.
   */
  const ordered = [...trades].sort(
    (a, b) =>
      new Date(a.openedAt).getTime() -
      new Date(b.openedAt).getTime(),
  );

  let cumulative = 0;
  let peak = 0;
  let maxDrawdownPnl = 0;

  for (const trade of ordered) {
    const pnl =
      typeof trade.pnl === 'number' && Number.isFinite(trade.pnl)
        ? trade.pnl
        : 0;

    cumulative += pnl;

    if (cumulative > peak) {
      peak = cumulative;
    }

    const drawdown = peak - cumulative;

    if (drawdown > maxDrawdownPnl) {
      maxDrawdownPnl = drawdown;
    }
  }

  return {
    totalPnl,
    averagePnl: totalPnl / trades.length,
    bestPnl: bestPnl === -Infinity ? 0 : bestPnl,
    worstPnl: worstPnl === Infinity ? 0 : worstPnl,
    maxDrawdownPnl,
  };
}

export function StatisticsPage() {
  const { trades, loaded, load } = useTradesStore();

  const [tab, setTab] = useState<string>('instrument');

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) {
      void load();
    }
  }, [loaded, load]);

  /*
   * IMPORTANT:
   * This is the original R-based analytics engine.
   * Nothing here has been changed.
   */
  const s = useMemo(
    () => (loaded ? summary(trades) : null),
    [loaded, trades],
  );

  const templates = useMemo(
    () =>
      loaded
        ? allBreakdowns(trades, ACTIVE_TEMPLATE_ID)
        : ([] as CategoryBreakdown[]),
    [loaded, trades],
  );

  /*
   * NEW:
   * P&L analytics are calculated separately from R.
   */
  const pnlStats = useMemo(
    () => calculatePnlStats(trades),
    [trades],
  );

  /*
   * Instrument analysis:
   * Existing R analysis is preserved.
   * P&L is added alongside it.
   */
  const instruments = useMemo(() => {
    const m = new Map<
      string,
      {
        count: number;
        totalR: number;
        totalPnl: number;
        wins: number;
        losses: number;
      }
    >();

    for (const t of trades) {
      let row = m.get(t.instrument);

      if (!row) {
        row = {
          count: 0,
          totalR: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0,
        };

        m.set(t.instrument, row);
      }

      row.count++;

      // EXISTING R calculation
      row.totalR += t.r;

      // NEW P&L calculation
      row.totalPnl +=
        typeof t.pnl === 'number' && Number.isFinite(t.pnl)
          ? t.pnl
          : 0;

      if (t.result === 'win') {
        row.wins++;
      } else if (t.result === 'loss') {
        row.losses++;
      }
    }

    return Array.from(m.entries()).sort(
      (a, b) => b[1].totalR - a[1].totalR,
    );
  }, [trades]);

  const maxAbsR = Math.max(
    1,
    ...instruments.map(([, v]) => Math.abs(v.totalR)),
  );

  const tabs = [
    {
      key: 'instrument',
      label: 'Instruments',
    },

    ...templates.map((b) => ({
      key: b.fieldKey,
      label:
        b.fieldKey === 'mtf'
          ? 'ITF'
          : pretty(b.fieldKey),
    })),
  ];

  const active = templates.find(
    (b) => b.fieldKey === tab,
  );

  const showInstruments =
    tab === 'instrument' || !active;

  function onTabKey(
    e: KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      e.key !== 'ArrowRight' &&
      e.key !== 'ArrowLeft'
    ) {
      return;
    }

    e.preventDefault();

    const i = Math.max(
      0,
      tabs.findIndex((t) => t.key === tab),
    );

    const next =
      tabs[
        (i +
          (e.key === 'ArrowRight'
            ? 1
            : tabs.length - 1)) %
          tabs.length
      ];

    if (!next) {
      return;
    }

    setTab(next.key);

    document
      .getElementById(`stats-tab-${next.key}`)
      ?.focus();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics"
        description="How your trades perform, broken down by category."
      />

      {!loaded || !s ? (
        <div className="text-sm text-fg-muted">
          Loading statistics…
        </div>
      ) : trades.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No trades to analyze"
          description="Add trades from the journal to generate statistics."
        />
      ) : (
        <>
          {/* =========================================================
              SUMMARY
              Existing R analytics + NEW P&L analytics
             ========================================================= */}

          <Card className="overflow-hidden">
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-5 xl:p-6">

              {/* EXISTING */}
              <Metric
                label="Total R"
                value={formatR(s.totalR ?? 0)}
                tone={toneOf(s.totalR ?? 0)}
              />

              {/* NEW */}
              <Metric
                label="Total P&L"
                value={formatMoney(pnlStats.totalPnl)}
                tone={toneOf(pnlStats.totalPnl)}
              />

              {/* EXISTING */}
              <Metric
                label="Win rate"
                value={
                  s.winRate == null
                    ? '—'
                    : formatPct(s.winRate)
                }
                sub={
                  `Avg R ${formatR(s.avgR ?? 0)}`
                }
                aside={
                  <WinRateRing
                    rate={s.winRate ?? 0}
                    size={40}
                  />
                }
              />

              {/* EXISTING */}
              <Metric
                label="Trades"
                value={String(s.count ?? 0)}
                sub={
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone="win">
                      {s.wins ?? 0} W
                    </Badge>

                    <Badge tone="loss">
                      {s.losses ?? 0} L
                    </Badge>

                    <Badge tone="be">
                      {s.bes ?? 0} BE
                    </Badge>
                  </span>
                }
              />

              {/* EXISTING */}
              <Metric
                label="Expectancy"
                value={formatR(s.expectancy ?? 0)}
                tone={toneOf(s.expectancy ?? 0)}
              />
            </div>

            {/* =======================================================
                SECONDARY METRICS
               ======================================================= */}

            <div className="grid grid-cols-1 gap-3 border-t border-line bg-bg-3/40 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-5 xl:px-6">

              {/* EXISTING */}
              <Metric
                size="sm"
                label="Best trade"
                value={formatR(s.bestR ?? 0)}
                tone="win"
              />

              {/* NEW */}
              <Metric
                size="sm"
                label="Best P&L"
                value={formatMoney(pnlStats.bestPnl)}
                tone="win"
              />

              {/* EXISTING */}
              <Metric
                size="sm"
                label="Worst trade"
                value={formatR(s.worstR ?? 0)}
                tone="loss"
              />

              {/* NEW */}
              <Metric
                size="sm"
                label="Worst P&L"
                value={formatMoney(pnlStats.worstPnl)}
                tone="loss"
              />

              {/* EXISTING */}
              <Metric
                size="sm"
                label="Max drawdown"
                value={formatR(s.maxDrawdownR ?? 0)}
                tone="loss"
              />
            </div>

            {/* =======================================================
                THIRD ROW
               ======================================================= */}

            <div className="grid grid-cols-1 gap-3 border-t border-line bg-bg-3/20 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-5 xl:px-6">

              {/* NEW */}
              <Metric
                size="sm"
                label="Average P&L"
                value={formatMoney(pnlStats.averagePnl)}
                tone={toneOf(pnlStats.averagePnl)}
              />

              {/* NEW */}
              <Metric
                size="sm"
                label="P&L drawdown"
                value={formatMoney(
                  pnlStats.maxDrawdownPnl,
                )}
                tone="loss"
              />

              {/* EXISTING */}
              <Metric
                size="sm"
                label="Longest win streak"
                value={String(
                  s.longestWinStreak ?? 0,
                )}
              />

              {/* EXISTING */}
              <Metric
                size="sm"
                label="Longest loss streak"
                value={String(
                  s.longestLossStreak ?? 0,
                )}
              />

              {/* Small R / P&L relationship */}
              <Metric
                size="sm"
                label="R / P&L"
                value={`${formatR(
                  s.avgR ?? 0,
                )} · ${formatMoney(
                  pnlStats.averagePnl,
                )}`}
              />
            </div>
          </Card>

          {/* =========================================================
              BREAKDOWN TABS
             ========================================================= */}

          <div>
            <div
              role="tablist"
              aria-label="Break results down by"
              onKeyDown={onTabKey}
              className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-line bg-bg-2 p-2 shadow-sm"
            >
              {tabs.map((t) => {
                const selected =
                  t.key ===
                  (showInstruments
                    ? 'instrument'
                    : tab);

                return (
                  <button
                    key={t.key}
                    id={`stats-tab-${t.key}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="stats-panel"
                    tabIndex={
                      selected ? 0 : -1
                    }
                    onClick={() =>
                      setTab(t.key)
                    }
                    className={cn(
                      'shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',

                      selected
                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                        : 'border-transparent text-fg-muted hover:border-line hover:bg-bg-3 hover:text-fg',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div
              id="stats-panel"
              role="tabpanel"
            >
              {showInstruments ? (
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-bg-1 px-5 py-4">
                    <div>
                    <h2 className="text-base font-semibold text-fg">
                      Instruments
                    </h2>
                    <p className="mt-0.5 text-xs text-fg-muted">Performance by traded market</p>
                    </div>

                    <span className="text-xs text-fg-dim">
                      {instruments.length}{' '}
                      traded
                    </span>
                  </div>

                  {instruments.length === 0 ? (
                    <p className="border-t border-line px-5 py-6 text-sm text-fg-dim">
                      No instrument data.
                    </p>
                  ) : (
                    instruments.map(
                      ([instr, v]) => {
                        const width =
                          (Math.abs(
                            v.totalR,
                          ) /
                            maxAbsR) *
                          50;

                        const winPct =
                          v.count
                            ? Math.round(
                                (v.wins /
                                  v.count) *
                                  100,
                              )
                            : 0;

                        const tone =
                          toneOf(v.totalR);

                        const averageR =
                          v.count
                            ? v.totalR /
                              v.count
                            : 0;

                        const averagePnl =
                          v.count
                            ? v.totalPnl /
                              v.count
                            : 0;

                        return (
                          <div
                            key={instr}
                            className="mx-3 my-2 rounded-xl border border-line bg-bg-1 px-4 py-4 transition-colors hover:border-line-strong sm:mx-4"
                          >
                            {/* Instrument + R */}
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2.5 font-medium text-fg">
                                <InstrumentMark instrument={instr} className="h-8 w-8" />
                                <span className="truncate">{instr}</span>
                              </span>

                              <span
                                className={cn(
                                  'text-lg font-semibold tabular-nums tracking-tight',

                                  tone ===
                                    'win' &&
                                    'text-win',

                                  tone ===
                                    'loss' &&
                                    'text-loss',

                                  !tone &&
                                    'text-fg-muted',
                                )}
                              >
                                {formatR(
                                  v.totalR,
                                )}
                              </span>
                            </div>

                            {/* P&L */}
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <span className="text-xs text-fg-muted">
                                Total P&L
                              </span>

                              <span
                                className={cn(
                                  'text-sm font-semibold tabular-nums',

                                  toneOf(
                                    v.totalPnl,
                                  ) ===
                                    'win' &&
                                    'text-win',

                                  toneOf(
                                    v.totalPnl,
                                  ) ===
                                    'loss' &&
                                    'text-loss',

                                  !toneOf(
                                    v.totalPnl,
                                  ) &&
                                    'text-fg-muted',
                                )}
                              >
                                {formatMoney(
                                  v.totalPnl,
                                )}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-fg-muted">
                              <span className="flex flex-wrap gap-x-4">
                                <span>
                                  {v.count}{' '}
                                  trade
                                  {v.count === 1
                                    ? ''
                                    : 's'}
                                </span>

                                <span>
                                  {winPct}%
                                  {' '}
                                  win rate
                                </span>

                                <span>
                                  avg{' '}
                                  {formatR(
                                    averageR,
                                  )}
                                </span>

                                <span>
                                  avg{' '}
                                  {formatMoney(
                                    averagePnl,
                                  )}
                                </span>
                              </span>

                              <span className="flex gap-1.5">
                                {v.wins >
                                  0 && (
                                  <Badge tone="win">
                                    {v.wins} W
                                  </Badge>
                                )}

                                {v.losses >
                                  0 && (
                                  <Badge tone="loss">
                                    {v.losses} L
                                  </Badge>
                                )}
                              </span>
                            </div>

                            {/* Existing R bar */}
                            <div className="relative mt-3 h-2 rounded-full bg-bg-1">
                              <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line" />

                              <span
                                className={cn(
                                  'absolute inset-y-0 rounded-full',

                                  tone ===
                                    'win' &&
                                    'bg-win',

                                  tone ===
                                    'loss' &&
                                    'bg-loss',

                                  !tone &&
                                    'bg-fg-dim',
                                )}
                                style={
                                  v.totalR ===
                                  0
                                    ? {
                                        left: 'calc(50% - 3px)',
                                        width: 6,
                                      }
                                    : {
                                        left: `${
                                          v.totalR >
                                          0
                                            ? 50
                                            : 50 -
                                              width
                                        }%`,
                                        width: `${width}%`,
                                      }
                                }
                              />
                            </div>
                          </div>
                        );
                      },
                    )
                  )}
                </Card>
              ) : active ? (
                /*
                 * IMPORTANT:
                 * Template/strategy breakdowns remain untouched.
                 * They continue using the existing R-based
                 * BreakdownCard / analytics engine.
                 */
                <BreakdownCard
                  key={active.fieldKey}
                  breakdown={active}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
