import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUp, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  type TooltipPayloadEntry,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { ResultPill } from '@/components/ui/ResultPill';
import { DirectionPill } from '@/components/ui/DirectionPill';
import { Badge } from '@/components/ui/Badge';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { useFilteredTrades } from '@/store/filterStore';
import {
  summary,
  cumulativeCurve,
  metricSummary,
  extremeSetup,
} from '@/analytics/core';
import type { Trade } from '@/domain/models/trade';
import {
  formatR,
  formatPct,
  formatDuration,
  formatDate,
  formatDateLong,
  formatSignedMoney,
  formatMoneyCompact,
} from '@/lib/format';
import type { DashboardMetric, MetricPoint } from '@/analytics/core';
import { cn } from '@/lib/cn';
import { FilterBar } from '@/components/filters/FilterBar';
import { useChartTheme } from '@/lib/chartTheme';
import { useAuthStore } from '@/store/authStore';

interface WeekdayRow {
  label: string;
  count: number;
  totalR: number;
  totalPnl: number;
  winRate: number | null;
}

function greetingFirstName(name?: string, email?: string): string {
  if (name) {
    const first = name.trim().split(/\s+/)[0];
    if (first) return first;
  }
  if (email) {
    const local = email.split('@')[0];
    if (local) return local;
  }
  return 'Trader';
}

export function DashboardPage() {
  const { loaded, load } = useTradesStore();
  const { filtered } = useFilteredTrades();
  const { user } = useAuthStore();
  const tradesToUseRaw = loaded ? (filtered as Trade[]) : [];
  const navigate = useNavigate();
  const [metric, setMetric] = useState<DashboardMetric>('r');
  const chart = useChartTheme();

  useEffect(() => { bootTradesStore(); }, []);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);

  const tradesToUse = tradesToUseRaw;

  // Existing R analytics engine — unchanged.
  const s = useMemo(() => (loaded ? summary(tradesToUse) : null), [loaded, tradesToUse]);

  // Metric-aware cumulative curve: 'r' → cumulative R, 'pnl' → cumulative Journal P&L.
  const curvePoints = useMemo(
    () => (loaded ? cumulativeCurve(tradesToUse, metric) : [] as MetricPoint[]),
    [loaded, tradesToUse, metric],
  );

  // Journal P&L analytics — derived from Trade.pnl only (never account attachments).
  const pnlStats = useMemo(() => metricSummary(tradesToUse, 'pnl'), [tradesToUse]);

  const weekdayRows: WeekdayRow[] = useMemo(() => {
    const map = new Map<string, WeekdayRow>();
    const labels: Record<string, string> = {
      Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
    };
    for (const t of tradesToUse) {
      const key = new Date(t.openedAt).toLocaleDateString('en-US', { weekday: 'long' });
      let row = map.get(key);
      if (!row) { row = { label: labels[key] ?? key, count: 0, totalR: 0, totalPnl: 0, winRate: null }; map.set(key, row); }
      row.count++;
      row.totalR += t.r;
      if (typeof t.pnl === 'number' && Number.isFinite(t.pnl)) row.totalPnl += t.pnl;
    }
    const out: WeekdayRow[] = [];
    for (const k of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      const r = map.get(k);
      if (r && r.count > 0) {
        const matches = tradesToUse.filter((t) => new Date(t.openedAt).toLocaleDateString('en-US', { weekday: 'long' }) === k);
        const wins = matches.filter((m) => m.result === 'win').length;
        r.winRate = matches.length > 0 ? wins / matches.length : null;
        out.push(r);
      }
    }
    return out;
  }, [tradesToUse]);

  const recent = useMemo(() => {
    if (!loaded) return [];
    return [...tradesToUse].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()).slice(0, 8);
  }, [loaded, tradesToUse]);

  // Best/worst are metric-aware: the setup grouping is unchanged, only the metric
  // (R or P&L) that ranks the trades — and the value shown — changes.
  const bestSetup = useMemo(
    () => (loaded ? extremeSetup(tradesToUse, metric, 'best') : null),
    [loaded, tradesToUse, metric],
  );

  const worstSetup = useMemo(
    () => (loaded ? extremeSetup(tradesToUse, metric, 'worst') : null),
    [loaded, tradesToUse, metric],
  );

  const chartData = useMemo(
    () => curvePoints.map((p) => ({
      dateLabel: new Date(p.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cumulative: p.cumulative,
    })),
    [curvePoints],
  );

  const avgDuration = tradesToUse.length ? tradesToUse.reduce((a, t) => a + t.durationMin, 0) / tradesToUse.length : 0;

  if (!loaded) {
    return <div className="pt-20 text-center text-sm text-fg-muted">Loading trading data…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Personalized greeting */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg leading-tight">
            Welcome Back, <span className="text-accent">{greetingFirstName(user?.name, user?.email)}</span>
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Here's your trading performance overview.
          </p>
          <p className="mt-0.5 text-xs text-fg-dim">
            {tradesToUse.length === 0
              ? 'Add your first trade to see your stats.'
              : `${tradesToUse.length} trade${tradesToUse.length === 1 ? '' : 's'} · ${formatDateLong(tradesToUse[0]?.openedAt ?? '')}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="primary" leftIcon={<TrendingUp className="h-4 w-4" />}>
            <Link to="/journal/new">New trade</Link>
          </Button>
        </div>
      </header>

      <FilterBar />

      {tradesToUse.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title="No trades yet"
          description="Add your first trade to start tracking performance."
          action={
            <Button asChild variant="primary" leftIcon={<ArrowUp className="h-4 w-4" />}>
              <Link to="/journal/new">Add first trade</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Performance — R</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <Stat label="Total R" value={formatR(s?.totalR ?? 0)} tone={s && s.totalR > 0 ? 'win' : s && s.totalR < 0 ? 'loss' : 'default'} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Win Rate" value={s?.winRate == null ? '—' : formatPct(s.winRate)} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Avg R:R" value={s?.avgRR == null ? '—' : s.avgRR.toFixed(2)} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Avg Duration" value={formatDuration(avgDuration)} />
                </CardBody>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Performance — P&amp;L</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <Stat label="Total P&amp;L" value={formatSignedMoney(pnlStats.total)} tone={pnlStats.total > 0 ? 'win' : pnlStats.total < 0 ? 'loss' : 'default'} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Win Rate" value={s?.winRate == null ? '—' : formatPct(s.winRate)} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Avg P&amp;L" value={formatSignedMoney(pnlStats.average)} tone={pnlStats.average > 0 ? 'win' : pnlStats.average < 0 ? 'loss' : 'default'} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Avg Duration" value={formatDuration(avgDuration)} />
                </CardBody>
              </Card>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Equity curve</CardTitle>
              <div className="flex gap-1 bg-bg-3 p-1 rounded-lg border border-line">
                <button
                  type="button"
                  className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all', metric === 'r' ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  onClick={() => setMetric('r')}
                >
                  Cumulative R
                </button>
                <button
                  type="button"
                  className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all', metric === 'pnl' ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  onClick={() => setMetric('pnl')}
                >
                  Cumulative P&amp;L
                </button>
              </div>
            </CardHeader>
            <CardBody className="h-72">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-fg-muted">
                  {metric === 'r' ? 'No trades to chart yet.' : 'No P&L recorded on your trades yet.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: metric === 'r' ? -20 : 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: chart.axisText }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: chart.axisText }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (metric === 'r' ? `${v}R` : formatMoneyCompact(v))} width={metric === 'r' ? 45 : 64} />
                    <ReTooltip
                      contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '0.75rem', boxShadow: chart.tooltipShadow, color: chart.tooltipText, fontSize: '0.75rem' }}
                      formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
                        const p = item.payload as { dateLabel: string } | undefined;
                        const v = typeof value === 'number' ? value : 0;
                        const name = metric === 'r' ? 'Cumulative' : 'Cumulative P&L';
                        const formatted = metric === 'r' ? formatR(v) : formatSignedMoney(v);
                        return [p ? `${formatted} (${p.dateLabel})` : formatted, name];
                      }}
                    />
                    <Line type="monotone" dataKey="cumulative" stroke={chart.accent} strokeWidth={2.5} dot={{ r: 3, fill: chart.accent }} activeDot={{ r: 5, fill: chart.accent }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-win" /> Best setup</CardTitle>
              </CardHeader>
              <CardBody className="text-sm">
                {bestSetup ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Badge tone="accent">{bestSetup.label}</Badge>
                      <span className="font-bold text-win">
                        {metric === 'r' ? `${formatR(bestSetup.average)} avg R` : `${formatSignedMoney(bestSetup.average)} avg P&L`}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-fg-muted">
                      {bestSetup.count} trades · {metric === 'r' ? `${formatR(bestSetup.total)} total R` : `${formatSignedMoney(bestSetup.total)} total P&L`} · {bestSetup.winRate == null ? '—' : formatPct(bestSetup.winRate)} win rate
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-fg-dim">
                    <div className="text-xs text-fg-dim">Not enough data</div>
                    <div className="mt-1 text-xs text-fg-dim">Journal more trades to compare setups.</div>
                  </div>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-loss" /> Worst setup</CardTitle>
              </CardHeader>
              <CardBody className="text-sm">
                {worstSetup ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Badge tone="accent">{worstSetup.label}</Badge>
                      <span className="font-bold text-loss">
                        {metric === 'r' ? `${formatR(worstSetup.average)} avg R` : `${formatSignedMoney(worstSetup.average)} avg P&L`}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-fg-muted">
                      {worstSetup.count} trades · {metric === 'r' ? `${formatR(worstSetup.total)} total R` : `${formatSignedMoney(worstSetup.total)} total P&L`} · {worstSetup.winRate == null ? '—' : formatPct(worstSetup.winRate)} win rate
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-fg-dim">
                    <div className="text-xs text-fg-dim">Not enough data</div>
                    <div className="mt-1 text-xs text-fg-dim">Journal more trades to compare setups.</div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Weekdays</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-line">
                  {weekdayRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="font-medium text-fg">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-fg-muted num">{row.count} trades</span>
                        <span className={cn('num font-bold text-sm', row.totalR > 0 ? 'text-win' : row.totalR < 0 ? 'text-loss' : 'text-be')}>
                          {formatR(row.totalR)}
                        </span>
                        <span className={cn('num text-xs font-semibold', row.totalPnl > 0 ? 'text-win' : row.totalPnl < 0 ? 'text-loss' : 'text-be')}>
                          {formatSignedMoney(row.totalPnl)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Recent trades</CardTitle></CardHeader>
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-10 text-center">#</TH>
                      <TH>Date</TH>
                      <TH>Pair</TH>
                      <TH>L/S</TH>
                      <TH>Result</TH>
                      <TH className="text-right">R</TH>
                      <TH className="text-right">P&amp;L</TH>
                      <TH className="text-right">Duration</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {recent.map((t, i) => (
                      <TR key={t.id} interactive onClick={() => navigate(`/journal/${t.id}`)}>
                        <TD className="text-center text-fg-dim">{t.number ?? i + 1}</TD>
                        <TD className="whitespace-nowrap font-mono text-xs">{formatDate(t.openedAt)}</TD>
                        <TD><span className="font-semibold text-fg">{t.instrument}</span></TD>
                        <TD><DirectionPill direction={t.direction} /></TD>
                        <TD><ResultPill result={t.result} /></TD>
                        <TD align="right" className={cn('num font-bold', t.r > 0 ? 'text-win' : t.r < 0 ? 'text-loss' : 'text-be')}>
                          {formatR(t.r)}
                        </TD>
                        <TD align="right" className={cn('num font-semibold', typeof t.pnl === 'number' && t.pnl > 0 ? 'text-win' : typeof t.pnl === 'number' && t.pnl < 0 ? 'text-loss' : 'text-be')}>
                          {typeof t.pnl === 'number' && Number.isFinite(t.pnl) ? formatSignedMoney(t.pnl) : '—'}
                        </TD>
                        <TD align="right" className="text-xs text-fg-muted num">{formatDuration(t.durationMin)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}