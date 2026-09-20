import { useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { WinRateRing } from '@/components/stats/WinRateRing';
import { BreakdownCard } from '@/components/stats/BreakdownCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary, allBreakdowns } from '@/analytics/core';
import { formatPct, formatR } from '@/lib/format';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import type { CategoryBreakdown } from '@/analytics/core';

export function StatisticsPage() {
  const { trades, loaded, load } = useTradesStore();

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const s = useMemo(() => (loaded ? summary(trades) : null), [loaded, trades]);

  const templates = useMemo(
    () => (loaded ? allBreakdowns(trades, ACTIVE_TEMPLATE_ID) : [] as CategoryBreakdown[]),
    [loaded, trades],
  );

  // Side cards: instrument + direction (core fields) as quick extra stats
  const instruments = useMemo(() => {
    const m = new Map<string, { count: number; totalR: number; wins: number; losses: number }>();
    for (const t of trades) {
      let row = m.get(t.instrument);
      if (!row) { row = { count: 0, totalR: 0, wins: 0, losses: 0 }; m.set(t.instrument, row); }
      row.count++;
      row.totalR += t.r;
      if (t.result === 'win') row.wins++;
      else if (t.result === 'loss') row.losses++;
    }
    return Array.from(m.entries()).sort((a, b) => b[1].totalR - a[1].totalR);
  }, [trades]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics"
        description="Breakdowns across every category — from daily candle to mistake type."
      />

      {!loaded ? (
        <div className="text-sm text-fg-muted">Loading statistics…</div>
      ) : trades.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No trades to analyze"
          description="Add trades from the journal to generate statistics."
        />
      ) : (
        <>
          {/* Hero stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <Stat label="Total R" value={formatR(s?.totalR ?? 0)} tone="accent" />
                  </div>
                  <WinRateRing rate={s?.winRate ?? 0} size={48} />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Trades" value={String(s?.count ?? 0)} />
                <div className="mt-2 flex gap-2 text-2xs text-fg-muted">
                  <Badge tone="win">{s?.wins ?? 0} W</Badge>
                  <Badge tone="loss">{s?.losses ?? 0} L</Badge>
                  <Badge tone="be">{s?.bes ?? 0} BE</Badge>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Win Rate" value={s?.winRate == null ? '—' : formatPct(s.winRate)} />
                <div className="mt-1 text-2xs text-fg-dim">Avg R{formatR(s?.avgR ?? 0)}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Expectancy" value={formatR(s?.expectancy ?? 0)} />
                <div className="mt-1 text-2xs text-fg-dim">Avg R:R {s?.avgRR == null ? '—' : s.avgRR.toFixed(2)}</div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Best / Worst</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-fg-muted">Best</span><span className="text-win font-semibold">{formatR(s?.bestR ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-fg-muted">Worst</span><span className="text-loss font-semibold">{formatR(s?.worstR ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-fg-muted">Streak W</span><span className="font-semibold">{s?.longestWinStreak ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-fg-muted">Streak L</span><span className="font-semibold">{s?.longestLossStreak ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-fg-muted">Max DD</span><span className="text-loss font-semibold">{formatR(s?.maxDrawdownR ?? 0)}</span></div>
              </CardBody>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Instrument performance</CardTitle>
                <span className="text-2xs text-fg-dim">Top by Total R</span>
              </CardHeader>
              <CardBody className="space-y-2">
                {instruments.length === 0 ? (
                  <p className="text-sm text-fg-dim">No instrument data.</p>
                ) : (
                  instruments.slice(0, 6).map(([instr, stats]) => (
                    <div key={instr} className="flex items-center gap-3 text-sm">
                      <Badge tone="accent">{instr}</Badge>
                      <div className="flex-1 h-1.5 bg-bg-1 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, (stats.totalR / Math.max(...instruments.map(([,s]) => s.totalR))) * 100))}%` }}
                        />
                      </div>
                      <span className="font-medium text-xs">{stats.count} trades · {formatR(stats.totalR)}</span>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>

          {/* Template-driven breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {templates.map((b) => (
              <BreakdownCard key={b.fieldKey} breakdown={b} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
