import { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Hash,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Cell,
  type TooltipPayloadEntry,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { byCategory } from '@/analytics/core';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { CategoryBucket } from '@/analytics/core';

/** Color for a bucket based on its avgR. */
function barColor(avgR: number): string {
  if (avgR > 0) return '#39bd9a'; // win
  if (avgR < 0) return '#d95d65'; // loss
  return '#a2a4a7'; // be
}

export function MistakesPage() {
  const { trades, loaded, load } = useTradesStore();

  useEffect(() => { bootTradesStore(); }, []);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);

  const breakdown = useMemo(() => {
    if (!loaded || trades.length === 0) return null;
    return byCategory(trades, 'mistake', ACTIVE_TEMPLATE_ID);
  }, [loaded, trades]);

  // Separate "No mistake" from actual mistakes
  const noMistakeBucket = useMemo(
    () => breakdown?.buckets.find((b) => b.key === 'No mistake') ?? null,
    [breakdown],
  );

  const mistakeBuckets = useMemo(
    () => breakdown?.buckets.filter((b) => b.key !== 'No mistake' && b.key !== '—') ?? [],
    [breakdown],
  );

  // Sort by total R (ascending = worst first)
  const sortedByImpact = useMemo(
    () => [...mistakeBuckets].sort((a, b) => a.totalR - b.totalR),
    [mistakeBuckets],
  );

  // Top 3 costliest
  const costliest = useMemo(
    () => sortedByImpact.filter((b) => b.totalR < 0).slice(0, 3),
    [sortedByImpact],
  );

  // Chart data — all mistake types by R impact
  const chartData = useMemo(
    () =>
      sortedByImpact.map((b) => ({
        name: b.label.length > 14 ? b.label.slice(0, 12) + '…' : b.label,
        fullName: b.label,
        totalR: Number(b.totalR.toFixed(2)),
        count: b.count,
        avgR: Number(b.avgR.toFixed(2)),
      })),
    [sortedByImpact],
  );

  // Aggregate stats
  const totalMistakeTrades = mistakeBuckets.reduce((s, b) => s + b.count, 0);
  const totalRLost = mistakeBuckets.reduce((s, b) => s + b.totalR, 0);
  const mostCommon = mistakeBuckets.length > 0
    ? [...mistakeBuckets].sort((a, b) => b.count - a.count)[0]
    : null;

  if (!loaded) {
    return <div className="pt-20 text-center text-sm text-fg-muted">Loading mistakes data…</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mistakes & Filters"
        description="Track recurring mistakes and rule violations — frequency, R impact, and win/loss correlation."
      />

      {trades.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No trades to analyze"
          description="Add trades from the journal to generate mistake analytics."
        />
      ) : mistakeBuckets.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="No mistakes recorded"
              description="All your trades are marked 'No mistake'. Keep up the discipline!"
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Hero stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardBody>
                <Stat
                  label="Trades with mistakes"
                  value={String(totalMistakeTrades)}
                />
                <div className="mt-1 text-2xs text-fg-dim">
                  {trades.length > 0
                    ? formatPct(totalMistakeTrades / trades.length)
                    : '—'}{' '}
                  of all trades
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  label="R lost to mistakes"
                  value={formatR(totalRLost)}
                  tone={totalRLost < 0 ? 'loss' : 'default'}
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  label="Most common"
                  value={mostCommon?.label ?? '—'}
                />
                <div className="mt-1 text-2xs text-fg-dim">
                  {mostCommon ? `${mostCommon.count} occurrence${mostCommon.count === 1 ? '' : 's'}` : '—'}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  label="Clean trades"
                  value={String(noMistakeBucket?.count ?? 0)}
                />
                <div className="mt-1 text-2xs text-fg-dim">
                  {noMistakeBucket
                    ? `${formatR(noMistakeBucket.totalR)} total R`
                    : '—'}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Top 3 costliest mistakes */}
          {costliest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {costliest.map((b, i) => (
                <Card key={b.key}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-loss" />
                      #{i + 1} Costliest
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <Badge tone="loss">{b.label}</Badge>
                      <span className="text-lg font-bold text-loss tabular-nums">
                        {formatR(b.totalR)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-fg-muted">
                      <div>
                        <span className="block text-2xs text-fg-dim uppercase">Count</span>
                        <span className="font-medium text-fg">{b.count}</span>
                      </div>
                      <div>
                        <span className="block text-2xs text-fg-dim uppercase">Avg R</span>
                        <span className={cn('font-medium', b.avgR < 0 ? 'text-loss' : 'text-win')}>
                          {formatR(b.avgR)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-2xs text-fg-dim uppercase">Win Rate</span>
                        <span className="font-medium text-fg">
                          {b.winRate == null ? '—' : formatPct(b.winRate)}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* R Impact bar chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  R Impact by Mistake Type
                </CardTitle>
              </CardHeader>
              <CardBody className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0f1"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#a2a4a7' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}R`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />
                    <ReTooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #eef0f1',
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        color: '#101014',
                        fontSize: '0.75rem',
                      }}
                      formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
                        const p = item.payload as { fullName: string; count: number; avgR: number } | undefined;
                        if (!p) return ['—', 'Total R'];
                        const r = typeof value === 'number' ? value : 0;
                        return [
                          `${formatR(r)} total · ${p.count} trades · ${formatR(p.avgR)} avg`,
                          p.fullName,
                        ];
                      }}
                    />
                    <Bar dataKey="totalR" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={barColor(entry.totalR)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Detailed table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-accent" />
                Full Breakdown
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-4 py-2.5 text-left text-2xs uppercase tracking-wider text-fg-dim font-medium">
                        Mistake
                      </th>
                      <th className="px-4 py-2.5 text-right text-2xs uppercase tracking-wider text-fg-dim font-medium">
                        Count
                      </th>
                      <th className="px-4 py-2.5 text-right text-2xs uppercase tracking-wider text-fg-dim font-medium">
                        Total R
                      </th>
                      <th className="px-4 py-2.5 text-right text-2xs uppercase tracking-wider text-fg-dim font-medium">
                        Avg R
                      </th>
                      <th className="px-4 py-2.5 text-right text-2xs uppercase tracking-wider text-fg-dim font-medium">
                        Win Rate
                      </th>
                      <th className="px-4 py-2.5 text-right text-2xs uppercase tracking-wider text-fg-dim font-medium">
                        W / L / BE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {/* Clean trades first, de-emphasized */}
                    {noMistakeBucket && (
                      <MistakeRow bucket={noMistakeBucket} muted />
                    )}
                    {/* Actual mistakes, sorted by R impact ascending */}
                    {sortedByImpact.map((b) => (
                      <MistakeRow key={b.key} bucket={b} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Insight callout */}
          {costliest.length > 0 && (
            <Card>
              <CardBody>
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-fg">Focus area</p>
                    <p className="mt-1 text-sm text-fg-muted">
                      Your costliest mistake is{' '}
                      <span className="text-loss font-semibold">{costliest[0]!.label}</span>,
                      costing you{' '}
                      <span className="text-loss font-semibold tabular-nums">
                        {formatR(costliest[0]!.totalR)}
                      </span>{' '}
                      across {costliest[0]!.count} trade{costliest[0]!.count === 1 ? '' : 's'}.
                      {costliest[0]!.winRate != null && costliest[0]!.winRate < 0.5 && (
                        <> With a win rate of only{' '}
                          <span className="text-loss font-semibold">
                            {formatPct(costliest[0]!.winRate)}
                          </span>
                          , eliminating this mistake should be your top priority.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MistakeRow({ bucket, muted }: { bucket: CategoryBucket; muted?: boolean }) {
  return (
    <tr className={cn('transition-colors hover:bg-bg-4', muted && 'opacity-50')}>
      <td className="px-4 py-2.5">
        <Badge tone={muted ? 'accent' : bucket.totalR < 0 ? 'loss' : bucket.totalR > 0 ? 'win' : 'be'}>
          {bucket.label}
        </Badge>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-fg-muted">
        {bucket.count}
      </td>
      <td className={cn(
        'px-4 py-2.5 text-right tabular-nums font-semibold',
        bucket.totalR > 0 ? 'text-win' : bucket.totalR < 0 ? 'text-loss' : 'text-be',
      )}>
        {formatR(bucket.totalR)}
      </td>
      <td className={cn(
        'px-4 py-2.5 text-right tabular-nums',
        bucket.avgR > 0 ? 'text-win' : bucket.avgR < 0 ? 'text-loss' : 'text-be',
      )}>
        {formatR(bucket.avgR)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-fg-muted">
        {bucket.winRate == null ? '—' : formatPct(bucket.winRate)}
      </td>
      <td className="px-4 py-2.5 text-right text-xs text-fg-dim">
        {bucket.wins}W / {bucket.losses}L / {bucket.bes}BE
      </td>
    </tr>
  );
}
