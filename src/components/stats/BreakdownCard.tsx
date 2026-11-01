import { useState } from 'react';
import type { CategoryBreakdown } from '@/analytics/core';
import type { TemplateField } from '@/domain/models/trade';
import { BreakdownBarCard } from '@/features/dashboard/components/BreakdownBarCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, formatR } from '@/lib/format';
import { BarChart3, Rows3 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface BreakdownCardProps {
  breakdown: CategoryBreakdown;
  metricMode?: 'r' | 'pnl';
  fieldDefinition?: TemplateField;
  viewMode?: 'vertical' | 'horizontal';
  onViewModeChange?: (mode: 'vertical' | 'horizontal') => void;
}

/**
 * Renders category breakdowns with toggle between Vertical Bars and Horizontal Rows.
 * Correctly displays P&L stats or Realized R stats according to metricMode and
 * provides all template options/buckets.
 */
export function BreakdownCard({
  breakdown,
  metricMode = 'r',
  fieldDefinition,
  viewMode: controlledViewMode,
  onViewModeChange,
}: BreakdownCardProps) {
  const [internalViewMode, setInternalViewMode] = useState<'vertical' | 'horizontal'>('vertical');
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // If the field definition has predefined options (e.g. enum options), ensure all options are represented
  const predefinedOptions = fieldDefinition?.options;

  let buckets = breakdown.buckets.filter((b) => b.key !== '—');

  if (predefinedOptions && predefinedOptions.length > 0) {
    const existingKeys = new Set(buckets.map((b) => b.key));
    const allBuckets = [...buckets];
    for (const opt of predefinedOptions) {
      if (!existingKeys.has(opt)) {
        allBuckets.push({
          key: opt,
          label: opt,
          count: 0,
          wins: 0,
          losses: 0,
          bes: 0,
          winRate: null,
          avgR: 0,
          avgRR: null,
          totalR: 0,
          totalPnl: 0,
        });
      }
    }
    // Keep template definition order if matching
    allBuckets.sort((a, b) => {
      const idxA = predefinedOptions.indexOf(a.key);
      const idxB = predefinedOptions.indexOf(b.key);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
    buckets = allBuckets;
  }

  if (buckets.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-bg-1 dark:bg-[#121417] p-6 text-center shadow-card">
        <h2 className="text-base font-semibold text-fg">
          {breakdown.fieldLabel}
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          Log trades with a value for {breakdown.fieldLabel} to see this breakdown.
        </p>
      </div>
    );
  }

  const items = buckets.map((b) => {
    const winPct = b.count > 0 ? Math.round((b.wins / b.count) * 100) : 0;
    const isPnl = metricMode === 'pnl';

    let displayMetric: string | undefined;
    let avgMetric: number;

    if (isPnl) {
      avgMetric = b.totalPnl;
      displayMetric = b.count > 0 ? formatMoney(b.totalPnl) : '—';
    } else {
      avgMetric = b.totalR;
      displayMetric = b.count > 0 ? formatR(b.totalR) : '—';
    }

    return {
      label: b.label,
      count: b.count,
      winRate: winPct,
      avgMetric,
      displayMetric,
      rawBucket: b,
    };
  });

  // Mode Switcher Toggle
  const viewToggle = (
    <div className="inline-flex h-8 items-center p-0.5 rounded-lg bg-bg-2 dark:bg-[#181b20] border border-line/70 shadow-sm">
      <button
        type="button"
        title="Vertical Bar Chart"
        onClick={() => setViewMode('vertical')}
        className={cn(
          'h-7 px-2.5 rounded-md text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5',
          viewMode === 'vertical'
            ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
            : 'text-fg-muted hover:text-fg',
        )}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Bars</span>
      </button>
      <button
        type="button"
        title="Horizontal Detailed Rows"
        onClick={() => setViewMode('horizontal')}
        className={cn(
          'h-7 px-2.5 rounded-md text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5',
          viewMode === 'horizontal'
            ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
            : 'text-fg-muted hover:text-fg',
        )}
      >
        <Rows3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Rows</span>
      </button>
    </div>
  );

  if (viewMode === 'vertical') {
    return (
      <BreakdownBarCard
        title={`${breakdown.fieldLabel} Performance`}
        items={items}
        variant="metric"
        metricMode={metricMode}
        headerRight={viewToggle}
      />
    );
  }

  // Horizontal Detailed Rows View
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-bg-1 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-fg">
            {breakdown.fieldLabel} Performance
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Detailed breakdown by {breakdown.fieldLabel.toLowerCase()} ({metricMode === 'pnl' ? 'P&L focus' : 'Realized R focus'})
          </p>
        </div>
        <div className="flex items-center gap-3">
          {viewToggle}
        </div>
      </div>

      <div className="divide-y divide-line">
        {items.map((it) => {
          const b = it.rawBucket;
          const hasTrades = b.count > 0;
          const mainTone = metricMode === 'pnl'
            ? (b.totalPnl > 0 ? 'win' : b.totalPnl < 0 ? 'loss' : undefined)
            : (b.totalR > 0 ? 'win' : b.totalR < 0 ? 'loss' : undefined);

          const averageMetric = b.count
            ? (metricMode === 'pnl' ? b.totalPnl / b.count : b.totalR / b.count)
            : 0;

          return (
            <div
              key={it.label}
              className="p-4 sm:p-5 transition-all hover:bg-bg-2/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-fg">{it.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-bg-2 border border-line text-fg-muted">
                      {b.count} trade{b.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                    <span>{it.winRate}% win rate</span>
                    <span className="text-line">·</span>
                    <span>
                      Avg {metricMode === 'pnl' ? formatMoney(averageMetric) : formatR(averageMetric)}
                    </span>
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
                      {hasTrades
                        ? (metricMode === 'pnl' ? formatMoney(b.totalPnl) : formatR(b.totalR))
                        : '—'}
                    </div>
                    <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                      {metricMode === 'pnl' ? 'Total P&L' : 'Total R'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {b.wins > 0 && <Badge tone="win">{b.wins} W</Badge>}
                    {b.losses > 0 && <Badge tone="loss">{b.losses} L</Badge>}
                    {b.bes > 0 && <Badge tone="be">{b.bes} BE</Badge>}
                  </div>
                </div>
              </div>

              {/* Refined Proportion Track */}
              <div className="relative mt-4">
                <div className="flex items-center justify-between text-2xs text-fg-dim font-mono mb-1.5">
                  <span>Win Rate</span>
                  <span className={mainTone === 'win' ? 'text-win font-bold' : mainTone === 'loss' ? 'text-loss font-bold' : 'text-fg-muted'}>
                    {it.winRate}% ({b.wins}/{b.count})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-bg-2 overflow-hidden flex border border-line/40">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      it.winRate >= 50
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : it.winRate > 0
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : hasTrades ? 'bg-rose-500' : 'bg-transparent',
                    )}
                    style={{ width: `${hasTrades ? Math.max(4, it.winRate) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
