import type { CategoryBreakdown } from '@/analytics/core';
import { BreakdownBarCard } from '@/features/dashboard/components/BreakdownBarCard';

interface BreakdownCardProps {
  breakdown: CategoryBreakdown;
  metricMode?: 'r' | 'pnl';
}

/**
 * Renders category breakdowns using the same vertical bar system as the dashboard.
 */
export function BreakdownCard({ breakdown, metricMode = 'r' }: BreakdownCardProps) {
  const visible = breakdown.buckets.filter(
    (b) => b.key !== '—' && b.count > 0,
  );

  if (visible.length === 0) {
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

  const items = visible.map((b) => {
    const winPct = b.count > 0 ? Math.round((b.wins / b.count) * 100) : 0;
    return {
      label: b.label,
      count: b.count,
      winRate: winPct,
      avgMetric: b.count ? (metricMode === 'r' ? b.totalR / b.count : 0) : 0,
      displayMetric: metricMode === 'r' ? `${b.totalR > 0 ? '+' : ''}${b.totalR.toFixed(1)}R` : undefined,
    };
  });

  return (
    <BreakdownBarCard
      title={`${breakdown.fieldLabel} Performance`}
      items={items}
      variant="winRate"
    />
  );
}
