import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUp, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  pnlCount: number;
  winRate: number | null;
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
      if (!row) { row = { label: labels[key] ?? key, count: 0, totalR: 0, totalPnl: 0, pnlCount: 0, winRate: null }; map.set(key, row); }
      row.count++;
      row.totalR += t.r;
      if (typeof t.pnl === 'number' && Number.isFinite(t.pnl)) {
        row.totalPnl += t.pnl;
        row.pnlCount++;
      }
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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 lg:space-y-7">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight text-fg leading-tight">Dashboard</h1>
          <p className="mt-1 text-[13px] text-fg-muted">A focused view of your trading performance{user?.name ? `, ${user.name.split(/\s+/)[0]}` : ''}.</p>
          <p className="mt-1.5 text-[11px] text-fg-dim">
            {tradesToUse.length === 0
              ? 'Add your first trade to see your stats.'
              : `${tradesToUse.length} trade${tradesToUse.length === 1 ? '' : 's'} · ${formatDateLong(tradesToUse[0]?.openedAt ?? '')}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="primary" className="h-10 rounded-lg bg-accent px-4 text-xs font-semibold text-accent-fg shadow-none hover:bg-accent-hover" leftIcon={<TrendingUp className="h-4 w-4" />}>
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
          <section aria-label="Realized R statistics" className="space-y-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              Performance — R
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Card className="transition-colors hover:border-line-strong">
                <CardBody className="p-4 sm:p-5">
                  <Stat label="Total R" value={formatR(s?.totalR ?? 0)} tone={s && s.totalR > 0 ? 'win' : s && s.totalR < 0 ? 'loss' : 'default'} />
                </CardBody>
              </Card>
              <Card className="transition-colors hover:border-line-strong">
                <CardBody className="p-4 sm:p-5">
                  <Stat label="Win Rate" value={s?.winRate == null ? '—' : formatPct(s.winRate)} />
                </CardBody>
              </Card>
              <Card className="transition-colors hover:border-line-strong">
                <CardBody className="p-4 sm:p-5">
                  <Stat label="Avg R" value={s ? formatR(s.avgR) : '—'} />
                </CardBody>
              </Card>
              <Card className="transition-colors hover:border-line-strong">
                <CardBody className="p-4 sm:p-5">
                  <Stat label="Avg Duration" value={formatDuration(avgDuration)} />
                </CardBody>
              </Card>
            </div>
          </section>

          <Card className="overflow-hidden shadow-none">
            <CardHeader className="min-h-[76px] flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <CardTitle className="text-[15px]">Equity curve</CardTitle>
                <p className="mt-1 text-xs text-fg-muted">Cumulative performance across your trade history</p>
              </div>
              <div className="flex w-full gap-1 rounded-lg border border-line bg-bg-3 p-1 sm:w-auto">
                <button
                  type="button"
                  className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none', metric === 'r' ? 'bg-bg-1 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  onClick={() => setMetric('r')}
                >
                  Cumulative R
                </button>
                <button
                  type="button"
                  className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none', metric === 'pnl' ? 'bg-bg-1 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  onClick={() => setMetric('pnl')}
                >
                  Cumulative P&amp;L
                </button>
              </div>
            </CardHeader>
            <CardBody className="h-[300px] p-3 sm:h-[360px] sm:p-5">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-fg-muted">
                  {metric === 'r' ? 'No trades to chart yet.' : 'No P&L recorded on your trades yet.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, left: metric === 'r' ? -20 : 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardCurveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chart.accent} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={chart.accent} stopOpacity={0.015} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 5" stroke={chart.grid} vertical={false} />
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
                    <Area type="monotone" dataKey="cumulative" stroke={chart.accent} strokeWidth={2} fill="url(#dashboardCurveFill)" dot={false} activeDot={{ r: 4, fill: chart.accent, stroke: chart.tooltipBg, strokeWidth: 2 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          <section aria-label="Journal P&L statistics" className="space-y-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              Performance — P&amp;L
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Card><CardBody className="p-4 sm:p-5"><Stat label="Total P&amp;L" value={formatSignedMoney(pnlStats.total)} tone={pnlStats.total > 0 ? 'win' : pnlStats.total < 0 ? 'loss' : 'default'} /></CardBody></Card>
              <Card><CardBody className="p-4 sm:p-5"><Stat label="P&amp;L Win Rate" value={s?.winRate == null ? '—' : formatPct(s.winRate)} /></CardBody></Card>
              <Card><CardBody className="p-4 sm:p-5"><Stat label="Avg P&amp;L" value={formatSignedMoney(pnlStats.average)} tone={pnlStats.average > 0 ? 'win' : pnlStats.average < 0 ? 'loss' : 'default'} /></CardBody></Card>
              <Card><CardBody className="p-4 sm:p-5"><Stat label="Avg Duration" value={formatDuration(avgDuration)} /></CardBody></Card>
            </div>
          </section>

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
                        <span className="text-xs text-fg-muted num">
                          {row.count} trades · {row.pnlCount} with P&amp;L
                        </span>
                        <span className={cn('num font-bold text-sm', row.totalR > 0 ? 'text-win' : row.totalR < 0 ? 'text-loss' : 'text-be')}>
                          {formatR(row.totalR)}
                        </span>
                        <span className={cn('num text-xs font-semibold', row.totalPnl > 0 ? 'text-win' : row.totalPnl < 0 ? 'text-loss' : 'text-be')}>
                          {row.pnlCount > 0 ? formatSignedMoney(row.totalPnl) : '—'}
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
