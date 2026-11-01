import type { CategoryBreakdown } from '@/analytics/core';
import type { TemplateField } from '@/domain/models/trade';
import { BreakdownBarCard } from '@/features/dashboard/components/BreakdownBarCard';
import { formatMoney, formatR } from '@/lib/format';

interface BreakdownCardProps {
  breakdown: CategoryBreakdown;
  metricMode?: 'r' | 'pnl';
  fieldDefinition?: TemplateField;
}

/**
 * Renders category breakdowns using the same vertical bar system as the dashboard.
 * Correctly displays P&L stats or Realized R stats according to metricMode and
 * provides all template options/buckets.
 */
export function BreakdownCard({
  breakdown,
  metricMode = 'r',
  fieldDefinition,
}: BreakdownCardProps) {
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
    };
  });

  return (
    <BreakdownBarCard
      title={`${breakdown.fieldLabel} Performance`}
      items={items}
      variant="metric"
      metricMode={metricMode}
    />
  );
}
