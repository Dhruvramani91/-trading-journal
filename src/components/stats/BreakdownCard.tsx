import type { CategoryBreakdown, CategoryBucket } from '@/analytics/core';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPct, formatR } from '@/lib/format';
import { cn } from '@/lib/cn';

interface BreakdownCardProps {
  breakdown: CategoryBreakdown;
}

/**
 * Renders every category breakdown using the same visual treatment
 * as the Instruments breakdown:
 * - category title and bucket count in the header
 * - bucket label and Total R on the top row
 * - trades, win rate and average R underneath
 * - W/L badges on the right
 * - centered performance bar using the same scale across rows
 *
 * Empty buckets and the placeholder "—" bucket are skipped.
 */
export function BreakdownCard({ breakdown }: BreakdownCardProps) {
  const visible = breakdown.buckets.filter(
    (b) => b.key !== '—' && b.count > 0,
  );

  if (visible.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
          <h2 className="text-base font-semibold text-fg">
            {breakdown.fieldLabel}
          </h2>
        </div>

        <p className="border-t border-line px-5 py-6 text-sm text-fg-dim">
          No data for this category yet.
        </p>
      </Card>
    );
  }

  const maxAbs = Math.max(
    1,
    ...visible.map((bucket) => Math.abs(bucket.totalR)),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
        <h2 className="text-base font-semibold text-fg">
          {breakdown.fieldLabel}
        </h2>

        <span className="text-xs text-fg-dim">
          {visible.length} bucket{visible.length === 1 ? '' : 's'}
        </span>
      </div>

      {visible.map((bucket) => (
        <BucketRow
          key={bucket.key}
          bucket={bucket}
          maxAbs={maxAbs}
        />
      ))}
    </Card>
  );
}

function BucketRow({
  bucket,
  maxAbs,
}: {
  bucket: CategoryBucket;
  maxAbs: number;
}) {
  const winPct =
    bucket.count > 0
      ? Math.round((bucket.wins / bucket.count) * 100)
      : 0;

  const tone =
    bucket.totalR > 0
      ? 'win'
      : bucket.totalR < 0
        ? 'loss'
        : undefined;

  const w = (Math.abs(bucket.totalR) / maxAbs) * 50;

  return (
    <div className="border-t border-line px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium text-fg">
          {bucket.label}
        </span>

        <span
          className={cn(
            'text-lg font-semibold tabular-nums tracking-tight',
            tone === 'win' && 'text-win',
            tone === 'loss' && 'text-loss',
            !tone && 'text-fg-muted',
          )}
        >
          {formatR(bucket.totalR)}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span className="flex flex-wrap gap-x-4">
          <span>
            {bucket.count} trade{bucket.count === 1 ? '' : 's'}
          </span>

          <span>{winPct}% win rate</span>

          <span>
            avg {formatR(bucket.count ? bucket.totalR / bucket.count : 0)}
          </span>
        </span>

        <span className="flex gap-1.5">
          {bucket.wins > 0 && (
            <Badge tone="win">{bucket.wins} W</Badge>
          )}

          {bucket.losses > 0 && (
            <Badge tone="loss">{bucket.losses} L</Badge>
          )}

          {bucket.bes > 0 && (
            <Badge tone="be">{bucket.bes} BE</Badge>
          )}
        </span>
      </div>

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
            bucket.totalR === 0
              ? { left: 'calc(50% - 3px)', width: 6 }
              : {
                  left: `${bucket.totalR > 0 ? 50 : 50 - w}%`,
                  width: `${w}%`,
                }
          }
        />
      </div>
    </div>
  );
}
