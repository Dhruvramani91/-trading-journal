import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';

import { Loader } from '@/components/ui/Loader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WinRateRing } from '@/components/stats/WinRateRing';
import { BreakdownCard } from '@/components/stats/BreakdownCard';
import { BreakdownBarCard } from '@/features/dashboard/components/BreakdownBarCard';
import { InstrumentMark } from '@/components/trade/InstrumentMark';
import { TradeGradeBadge } from '@/components/trade/TradeGradeBadge';

import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary, allBreakdowns, gradePerformance } from '@/analytics/core';
import type { CategoryBreakdown } from '@/analytics/core';

import { formatMoney, formatPct, formatR } from '@/lib/format';
import { getTemplate } from '@/domain/templates/registry';
import type { TemplateDefinition } from '@/domain/models/trade';
import { getDefaultTemplateId, listJournalTemplates } from '@/data/journalTemplateRepository';
import { Select } from '@/components/ui/Select';
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
    <div className="flex min-h-[76px] min-w-0 items-start justify-between gap-3 px-1 py-1">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-dim">{label}</p>

        <p
          className={cn(
            'mt-1 font-mono font-extrabold tracking-tight',
            size === 'lg' ? 'text-2xl sm:text-[1.75rem]' : 'text-lg',
            tone === 'win' && 'text-emerald-600 dark:text-emerald-400',
            tone === 'loss' && 'text-rose-600 dark:text-rose-400',
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
  const [metricMode, setMetricMode] = useState<'r' | 'pnl'>('r');
  const [templateOptions, setTemplateOptions] = useState<TemplateDefinition[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default-ict-2026');

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) {
      void load();
    }
  }, [loaded, load]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listJournalTemplates(), getDefaultTemplateId()]).then(([options, selected]) => {
      if (!cancelled) { setTemplateOptions(options); setSelectedTemplateId(selected); }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  /*
   * IMPORTANT:
   * This is the original R-based analytics engine.
   * Nothing here has been changed.
   */
  const usedTemplateIds = useMemo(() => Array.from(new Set(trades.map((trade) => trade.templateId))), [trades]);
  const availableTemplates = useMemo(() => {
    const unique = new Map(templateOptions.map((item) => [item.id, item]));
    for (const trade of trades) if (trade.templateSnapshot) {
      const snapshot = trade.templateSnapshot;
      const current = unique.get(trade.templateId);
      if (!current) {
        unique.set(trade.templateId, snapshot);
        continue;
      }
      // Keep fields captured with historical trades, while exposing fields
      // added to the current template (for example Strength Switch).
      // Use the current template's field order so breakdown tabs follow the
      // same sequence as the trade entry form. Keep retired historical fields
      // after current fields so older trade data remains accessible.
      const fields = new Map(current.fields.map((field) => [field.key, field]));
      for (const field of snapshot.fields) if (!fields.has(field.key)) fields.set(field.key, field);
      unique.set(trade.templateId, { ...snapshot, fields: Array.from(fields.values()) });
    }
    return usedTemplateIds.map((id) => unique.get(id) ?? getTemplate(id));
  }, [templateOptions, trades, usedTemplateIds]);
  const effectiveTemplateId = usedTemplateIds.length === 1
    ? usedTemplateIds[0]
    : usedTemplateIds.includes(selectedTemplateId) ? selectedTemplateId : (usedTemplateIds[0] ?? selectedTemplateId);
  const selectedTemplate = availableTemplates.find((item) => item.id === effectiveTemplateId)
    ?? trades.find((trade) => trade.templateId === effectiveTemplateId)?.templateSnapshot
    ?? getTemplate();
  const analysisTrades = useMemo(
    () => usedTemplateIds.length > 0 ? trades.filter((trade) => trade.templateId === effectiveTemplateId) : trades,
    [trades, usedTemplateIds.length, effectiveTemplateId],
  );
  const s = useMemo(
    () => (loaded ? summary(analysisTrades) : null),
    [loaded, analysisTrades],
  );
  const templates = useMemo(() => loaded
    ? allBreakdowns(analysisTrades, selectedTemplate)
    : ([] as CategoryBreakdown[]), [loaded, analysisTrades, selectedTemplate]);

  /*
   * NEW:
   * P&L analytics are calculated separately from R.
   */
  const pnlStats = useMemo(
    () => calculatePnlStats(analysisTrades),
    [analysisTrades],
  );

  const grades = useMemo(() => gradePerformance(analysisTrades), [analysisTrades]);

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

    for (const t of analysisTrades) {
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
  }, [analysisTrades]);

  const tabs = [
    {
      key: 'instrument',
      label: 'Instruments',
    },
    {
      key: 'grade',
      label: 'Grades',
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

  const showGrades = tab === 'grade';
  const showInstruments =
    tab === 'instrument' || (!active && !showGrades);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg">
            Statistics
          </h1>
          <p className="text-sm font-medium text-fg-muted mt-1">
            Performance analytics, win rates, and strategy breakdowns.
          </p>
        </div>

        {/* PnL ($) ⇄ Realized R Toggle Segment */}
        <div className="inline-flex h-10 items-center p-1 rounded-xl bg-bg-1 dark:bg-[#121417] border border-line shadow-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('r')}
            className={cn(
              'h-8 px-3.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-center',
              metricMode === 'r'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            Realized R
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('pnl')}
            className={cn(
              'h-8 px-3.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-center',
              metricMode === 'pnl'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            P&amp;L ($)
          </button>
        </div>
      </div>

      {availableTemplates.length > 1 && (
        <div className="max-w-sm">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fg-dim" htmlFor="stats-template">
            Strategy breakdown
          </label>
          <Select id="stats-template" value={effectiveTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
            {availableTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
      )}

      {!loaded || !s ? (
        <Loader size="sm" title="Loading statistics…" className="min-h-56" />
      ) : trades.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No trades to analyze"
          description="Add trades from the journal to generate statistics."
        />
      ) : (
        <>
          {/* =========================================================
              SUMMARY & TOP KPI METRICS
              Dashboard-aligned aesthetic cards with identical fonts and styling
             ========================================================= */}
          <div className="space-y-4">
            {/* Top 5 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {metricMode === 'pnl' ? (
                <>
                  {/* Total P&L */}
                  <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Total P&L</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] text-fg-muted border border-line">
                        Currency
                      </span>
                    </div>
                    <div className="mt-1">
                      <div
                        className={cn(
                          'text-3xl font-extrabold font-mono tracking-tight',
                          pnlStats.totalPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : pnlStats.totalPnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg',
                        )}
                      >
                        {formatMoney(pnlStats.totalPnl)}
                      </div>
                      <span className="text-[11px] text-fg-dim font-medium mt-1.5 block">
                        Net cash balance generated
                      </span>
                    </div>
                  </div>

                  {/* Avg P&L */}
                  <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Average P&L</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] text-fg-muted border border-line">
                        Per Trade
                      </span>
                    </div>
                    <div className="mt-1">
                      <div
                        className={cn(
                          'text-3xl font-extrabold font-mono tracking-tight',
                          pnlStats.averagePnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : pnlStats.averagePnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg',
                        )}
                      >
                        {formatMoney(pnlStats.averagePnl)}
                      </div>
                      <span className="text-[11px] text-fg-dim font-medium mt-1.5 block">
                        Average profit per execution
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Total R */}
                  <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Total R</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] text-fg-muted border border-line">
                        R Multiple
                      </span>
                    </div>
                    <div className="mt-1">
                      <div
                        className={cn(
                          'text-3xl font-extrabold font-mono tracking-tight',
                          (s.totalR ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (s.totalR ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg',
                        )}
                      >
                        {formatR(s.totalR ?? 0)}
                      </div>
                      <span className="text-[11px] text-fg-dim font-medium mt-1.5 block">
                        Realized R across all trades
                      </span>
                    </div>
                  </div>

                  {/* Expectancy */}
                  <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Expectancy</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] text-fg-muted border border-line">
                        Edge
                      </span>
                    </div>
                    <div className="mt-1">
                      <div
                        className={cn(
                          'text-3xl font-extrabold font-mono tracking-tight',
                          (s.expectancy ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (s.expectancy ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg',
                        )}
                      >
                        {formatR(s.expectancy ?? 0)}
                      </div>
                      <span className="text-[11px] text-fg-dim font-medium mt-1.5 block">
                        Expected return per execution
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Win Rate */}
              <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex items-center justify-between shadow-card">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Win Rate</span>
                  <div className="text-3xl font-extrabold font-mono text-fg tracking-tight mt-2">
                    {s.winRate == null ? '—' : formatPct(s.winRate)}
                  </div>
                  <span className="text-[11px] text-fg-dim font-medium mt-1">
                    {metricMode === 'pnl' ? `Avg ${formatMoney(pnlStats.averagePnl)}` : `Avg ${formatR(s.avgR ?? 0)}`}
                  </span>
                </div>
                <WinRateRing rate={s.winRate ?? 0} size={48} />
              </div>

              {/* Trades */}
              <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Trades</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] text-fg-muted border border-line">
                    {s.count ?? 0} executed
                  </span>
                </div>
                <div className="mt-1">
                  <div className="text-3xl font-extrabold font-mono text-fg tracking-tight">
                    {s.count ?? 0}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="win">{s.wins ?? 0} W</Badge>
                    <Badge tone="loss">{s.losses ?? 0} L</Badge>
                    <Badge tone="be">{s.bes ?? 0} BE</Badge>
                  </div>
                </div>
              </div>

              {/* Best Performer Metric */}
              <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                    {metricMode === 'pnl' ? 'Best P&L' : 'Best Trade'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] text-fg-muted border border-line">
                    High
                  </span>
                </div>
                <div className="mt-1">
                  <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {metricMode === 'pnl' ? formatMoney(pnlStats.bestPnl) : formatR(s.bestR ?? 0)}
                  </div>
                  <span className="text-[11px] text-fg-dim font-medium mt-1.5 block">
                    {metricMode === 'pnl' ? 'Largest single trade gain' : 'Largest single trade R'}
                  </span>
                </div>
              </div>
            </div>

            {/* Accordion: Extended In-Depth Analytics */}
            <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl overflow-hidden shadow-card">
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-sm font-semibold text-fg hover:bg-bg-2/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">More statistics</span>
                    <span className="text-xs text-fg-dim font-normal">— Best & worst trades, drawdowns, streaks</span>
                  </div>
                  <span className="flex items-center gap-2 text-xs font-medium text-fg-muted group-hover:text-fg">
                    <span>View breakdown</span>
                    <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </span>
                </summary>

                <div className="border-t border-line">
                  {metricMode === 'pnl' ? (
                    <>
                      <section aria-label="Additional P&L statistics" className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-x-0 xl:divide-x xl:divide-line [&>*]:px-3 xl:[&>*:first-child]:pl-0 xl:[&>*:last-child]:pr-0">
                        <Metric size="sm" label="Best P&L" value={formatMoney(pnlStats.bestPnl)} tone="win" />
                        <Metric size="sm" label="Worst P&L" value={formatMoney(pnlStats.worstPnl)} tone="loss" />
                        <Metric size="sm" label="Average P&L" value={formatMoney(pnlStats.averagePnl)} tone={toneOf(pnlStats.averagePnl)} />
                        <Metric size="sm" label="P&L Drawdown" value={formatMoney(pnlStats.maxDrawdownPnl)} tone="loss" />
                        <Metric size="sm" label="Net P&L" value={formatMoney(pnlStats.totalPnl)} tone={toneOf(pnlStats.totalPnl)} />
                      </section>

                      <section aria-label="Streaks and trade outcomes" className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line px-5 py-5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-x-0 xl:divide-x xl:divide-line [&>*]:px-3 xl:[&>*:first-child]:pl-0 xl:[&>*:last-child]:pr-0">
                        <Metric size="sm" label="Longest win streak" value={String(s.longestWinStreak ?? 0)} />
                        <Metric size="sm" label="Longest loss streak" value={String(s.longestLossStreak ?? 0)} />
                        <Metric size="sm" label="Total executions" value={String(s.count ?? 0)} />
                        <Metric size="sm" label="Winning trades" value={`${s.wins ?? 0} trades`} tone="win" />
                        <Metric size="sm" label="Losing trades" value={`${s.losses ?? 0} trades`} tone="loss" />
                      </section>
                    </>
                  ) : (
                    <>
                      <section aria-label="Additional R statistics" className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-x-0 xl:divide-x xl:divide-line [&>*]:px-3 xl:[&>*:first-child]:pl-0 xl:[&>*:last-child]:pr-0">
                        <Metric size="sm" label="Best trade" value={formatR(s.bestR ?? 0)} tone="win" />
                        <Metric size="sm" label="Worst trade" value={formatR(s.worstR ?? 0)} tone="loss" />
                        <Metric size="sm" label="Average R" value={formatR(s.avgR ?? 0)} tone={toneOf(s.avgR)} />
                        <Metric size="sm" label="Max drawdown" value={formatR(s.maxDrawdownR ?? 0)} tone="loss" />
                        <Metric size="sm" label="Total Realized R" value={formatR(s.totalR ?? 0)} tone={toneOf(s.totalR)} />
                      </section>

                      <section aria-label="Streaks and edge" className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line px-5 py-5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-x-0 xl:divide-x xl:divide-line [&>*]:px-3 xl:[&>*:first-child]:pl-0 xl:[&>*:last-child]:pr-0">
                        <Metric size="sm" label="Longest win streak" value={String(s.longestWinStreak ?? 0)} />
                        <Metric size="sm" label="Longest loss streak" value={String(s.longestLossStreak ?? 0)} />
                        <Metric size="sm" label="Expectancy" value={formatR(s.expectancy ?? 0)} tone={toneOf(s.expectancy)} />
                        <Metric size="sm" label="Winning trades" value={`${s.wins ?? 0} trades`} tone="win" />
                        <Metric size="sm" label="Losing trades" value={`${s.losses ?? 0} trades`} tone="loss" />
                      </section>
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>

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
                      'shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40',
                      selected
                        ? 'bg-bg-1 text-fg shadow-sm border border-line ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-fg-muted hover:text-fg hover:bg-bg-3/60',
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
              {showGrades ? (
                <div className="space-y-4">
                  <BreakdownBarCard
                    title="Grade Performance"
                    items={grades.map((row) => ({
                      label: `Grade ${row.grade}`,
                      count: row.count,
                      winRate: row.count > 0 && row.winRate != null ? Math.round(row.winRate * 100) : 0,
                      avgMetric: metricMode === 'pnl'
                        ? (analysisTrades.filter((t) => t.grade === row.grade).reduce((sum, t) => sum + (typeof t.pnl === 'number' && Number.isFinite(t.pnl) ? t.pnl : 0), 0))
                        : row.totalR,
                      displayMetric: row.count > 0
                        ? (metricMode === 'pnl'
                            ? formatMoney(analysisTrades.filter((t) => t.grade === row.grade).reduce((sum, t) => sum + (typeof t.pnl === 'number' && Number.isFinite(t.pnl) ? t.pnl : 0), 0))
                            : formatR(row.totalR))
                        : '—',
                    }))}
                    variant="metric"
                    metricMode={metricMode}
                  />

                  <Card className="overflow-hidden">
                    <div className="border-b border-line bg-bg-1 px-5 py-4">
                      <h2 className="text-base font-semibold text-fg">Trade grade analysis</h2>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        Compare execution quality by win rate and {metricMode === 'pnl' ? 'P&L' : 'realized R'}.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-bg-3/50 text-left text-xs text-fg-dim">
                          <tr>
                            <th className="px-5 py-3 font-medium">Grade</th>
                            <th className="px-5 py-3 text-right font-medium">Trades</th>
                            <th className="px-5 py-3 text-right font-medium">Win rate</th>
                            {metricMode === 'pnl' ? (
                              <>
                                <th className="px-5 py-3 text-right font-medium">Avg P&amp;L</th>
                                <th className="px-5 py-3 text-right font-medium">Total P&amp;L</th>
                              </>
                            ) : (
                              <>
                                <th className="px-5 py-3 text-right font-medium">Avg R</th>
                                <th className="px-5 py-3 text-right font-medium">Total R</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {grades.map((row) => {
                            const gradeTrades = analysisTrades.filter((t) => t.grade === row.grade);
                            const gradePnl = gradeTrades.reduce((sum, t) => sum + (typeof t.pnl === 'number' && Number.isFinite(t.pnl) ? t.pnl : 0), 0);
                            const avgGradePnl = row.count > 0 ? gradePnl / row.count : 0;

                            return (
                              <tr key={row.grade} className="border-t border-line">
                                <td className="px-5 py-3"><TradeGradeBadge grade={row.grade} /></td>
                                <td className="px-5 py-3 text-right tabular-nums">{row.count}</td>
                                <td className="px-5 py-3 text-right tabular-nums">{row.winRate == null ? '—' : formatPct(row.winRate)}</td>
                                {metricMode === 'pnl' ? (
                                  <>
                                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', toneOf(avgGradePnl) === 'win' ? 'text-win' : toneOf(avgGradePnl) === 'loss' ? 'text-loss' : 'text-fg-muted')}>
                                      {row.count ? formatMoney(avgGradePnl) : '—'}
                                    </td>
                                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', toneOf(gradePnl) === 'win' ? 'text-win' : toneOf(gradePnl) === 'loss' ? 'text-loss' : 'text-fg-muted')}>
                                      {row.count ? formatMoney(gradePnl) : '—'}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', toneOf(row.averageR) === 'win' ? 'text-win' : toneOf(row.averageR) === 'loss' ? 'text-loss' : 'text-fg-muted')}>
                                      {row.count ? formatR(row.averageR) : '—'}
                                    </td>
                                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', toneOf(row.totalR) === 'win' ? 'text-win' : toneOf(row.totalR) === 'loss' ? 'text-loss' : 'text-fg-muted')}>
                                      {row.count ? formatR(row.totalR) : '—'}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : showInstruments ? (
                <div className="space-y-4">
                  {instruments.length > 0 && (
                    <BreakdownBarCard
                      title="Instruments Performance"
                      items={instruments.map(([instr, v]) => ({
                        label: instr,
                        count: v.count,
                        winRate: v.count ? Math.round((v.wins / v.count) * 100) : 0,
                        avgMetric: metricMode === 'pnl' ? v.totalPnl : v.totalR,
                        displayMetric: v.count > 0 ? (metricMode === 'pnl' ? formatMoney(v.totalPnl) : formatR(v.totalR)) : '—',
                      }))}
                      variant="metric"
                      metricMode={metricMode}
                    />
                  )}

                  <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line bg-bg-1 px-5 py-4">
                      <div>
                        <h2 className="text-base font-semibold text-fg">
                          Instruments
                        </h2>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          Performance by traded market ({metricMode === 'pnl' ? 'P&L focus' : 'Realized R focus'})
                        </p>
                      </div>

                      <span className="text-xs text-fg-dim">
                        {instruments.length} traded
                      </span>
                    </div>

                    {instruments.length === 0 ? (
                      <p className="border-t border-line px-5 py-6 text-sm text-fg-dim">
                        No instrument data.
                      </p>
                    ) : (
                      instruments.map(
                        ([instr, v]) => {
                          const winPct =
                            v.count
                              ? Math.round(
                                  (v.wins /
                                    v.count) *
                                    100,
                                )
                              : 0;

                          const mainTone =
                            metricMode === 'pnl' ? toneOf(v.totalPnl) : toneOf(v.totalR);

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
                              className="mx-3 my-2.5 rounded-xl border border-line bg-bg-1 p-4 sm:p-5 transition-all hover:border-line-strong hover:shadow-card sm:mx-4"
                            >
                              {/* Instrument + P&L / R Metrics Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <InstrumentMark instrument={instr} className="h-10 w-10 shrink-0" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-base font-bold text-fg">{instr}</span>
                                      <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-bg-2 border border-line text-fg-muted">
                                        {v.count} trade{v.count === 1 ? '' : 's'}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                                      <span>{winPct}% win rate</span>
                                      <span className="text-line">·</span>
                                      {metricMode === 'pnl' ? (
                                        <span>Avg {formatMoney(averagePnl)}</span>
                                      ) : (
                                        <span>Avg {formatR(averageR)}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center sm:items-end justify-between sm:justify-start gap-4 sm:flex-col">
                                  <div className="text-right">
                                    <div
                                      className={cn(
                                        'text-lg font-bold font-mono tabular-nums tracking-tight',
                                        mainTone === 'win' && 'text-win',
                                        mainTone === 'loss' && 'text-loss',
                                        !mainTone && 'text-fg-muted',
                                      )}
                                    >
                                      {metricMode === 'pnl' ? formatMoney(v.totalPnl) : formatR(v.totalR)}
                                    </div>
                                    <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                                      {metricMode === 'pnl' ? 'Total P&L' : 'Total R'}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {v.wins > 0 && <Badge tone="win">{v.wins} W</Badge>}
                                    {v.losses > 0 && <Badge tone="loss">{v.losses} L</Badge>}
                                  </div>
                                </div>
                              </div>

                              {/* Refined Proportion Track */}
                              <div className="relative mt-4">
                                <div className="flex items-center justify-between text-2xs text-fg-dim font-mono mb-1.5">
                                  <span>Win Rate</span>
                                  <span className={mainTone === 'win' ? 'text-win font-bold' : mainTone === 'loss' ? 'text-loss font-bold' : 'text-fg-muted'}>
                                    {winPct}% ({v.wins}/{v.count})
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-bg-2 overflow-hidden flex border border-line/40">
                                  <div
                                    className={cn(
                                      'h-full transition-all duration-300 rounded-full',
                                      winPct >= 50
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                        : winPct > 0
                                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                          : 'bg-rose-500',
                                    )}
                                    style={{ width: `${Math.max(4, winPct)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </Card>
                </div>
              ) : active ? (
                <BreakdownCard
                  key={active.fieldKey}
                  breakdown={active}
                  metricMode={metricMode}
                  fieldDefinition={selectedTemplate?.fields.find((f) => f.key === active.fieldKey)}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
