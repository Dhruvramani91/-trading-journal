import type { CategoryBreakdown, CategoryBucket } from '@/analytics/core';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { MetricRow } from './MetricRow';
import { formatPct, formatR } from '@/lib/format';

interface BreakdownCardProps {
  breakdown: CategoryBreakdown;
}

/**
 * Renders a template-driven breakdown as a card with one MetricRow per bucket.
 * Empty buckets and the placeholder "—" bucket are skipped so the card stays tight.
 */
export function BreakdownCard({ breakdown }: BreakdownCardProps) {
  const visible = breakdown.buckets.filter((b) => b.key !== '—' && b.count > 0);
  if (visible.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{breakdown.fieldLabel}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-fg-dim">No data for this category yet.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{breakdown.fieldLabel}</CardTitle>
        <span className="text-2xs text-fg-dim">
          {visible.length} bucket{visible.length === 1 ? '' : 's'}
        </span>
      </CardHeader>
      <CardBody className="p-0">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto] gap-3 px-3 pt-2 pb-1.5 text-2xs uppercase tracking-wider text-fg-dim border-b border-line">
          <span>Bucket</span>
          <span className="text-right">Trades · WR · Avg R · Total R</span>
        </div>
        <div className="divide-y divide-line/70">
          {visible.map((b) => (
            <BucketRow key={b.key} bucket={b} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function BucketRow({ bucket }: { bucket: CategoryBucket }) {
  // Bar represents the win rate (0..100%) — quick at-a-glance quality indicator.
  const wrPct = bucket.winRate == null ? 0 : bucket.winRate * 100;
  const wrTone =
    bucket.winRate == null
      ? 'neutral'
      : bucket.winRate >= 0.6
        ? 'win'
        : bucket.winRate >= 0.4
          ? 'accent'
          : 'loss';

  const totalRTone = bucket.totalR > 0 ? 'win' : bucket.totalR < 0 ? 'loss' : 'be';

  return (
    <MetricRow
      label={bucket.label}
      value={`${bucket.count} · ${bucket.winRate == null ? '—' : formatPct(bucket.winRate)} · ${formatR(bucket.avgR)} · ${formatR(bucket.totalR)}`}
      tone={totalRTone}
      hint={`${bucket.wins}W · ${bucket.losses}L · ${bucket.bes}BE`}
      bar={{ pct: wrPct, tone: wrTone }}
    />
  );
}
