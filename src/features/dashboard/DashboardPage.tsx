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
import { summary, equityCurve, byCategory, byDay } from '@/analytics/core';
import type { Trade } from '@/domain/models/trade';
import { formatR, formatPct, formatDuration, formatDate, formatDateLong } from '@/lib/format';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import type { EquityPoint, DayPerformance } from '@/analytics/core';
import { cn } from '@/lib/cn';
import { FilterBar } from '@/components/filters/FilterBar';
import { useAuthStore } from '@/store/authStore';

interface WeekdayRow {
  label: string;
  count: number;
  totalR: number;
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
  const [chartR, setChartR] = useState<'cum' | 'daily'>('cum');

  useEffect(() => { bootTradesStore(); }, []);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);

  const tradesToUse = tradesToUseRaw;

  const s = useMemo(() => (loaded ? summary(tradesToUse) : null), [loaded, tradesToUse]);
  const curve = useMemo(() => (loaded ? equityCurve(tradesToUse) : [] as EquityPoint[]), [loaded, tradesToUse]);
  const daily = useMemo(() => (loaded ? byDay(tradesToUse) : [] as DayPerformance[]), [loaded, tradesToUse]);

  const weekdayRows: WeekdayRow[] = useMemo(() => {
    const map = new Map<string, WeekdayRow>();
    const labels: Record<string, string> = {
      Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
    };
    for (const t of tradesToUse) {
      const key = new Date(t.openedAt).toLocaleDateString('en-US', { weekday: 'long' });
      let row = map.get(key);
      if (!row) { row = { label: labels[key] ?? key, count: 0, totalR: 0, winRate: null }; map.set(key, row); }
      row.count++;
      row.totalR += t.r;
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

  const worstSetup = useMemo(() => {
    if (!loaded || tradesToUse.length === 0) return null;
    const breakdowns = byCategory(tradesToUse, 'dailyCandle', ACTIVE_TEMPLATE_ID);
    const nonEmpty = breakdowns.buckets.filter((b) => b.count > 0);
    if (nonEmpty.length === 0) return null;
    const seed = nonEmpty[0]!;
    return nonEmpty.reduce((min, b) => (b.avgR < min.avgR ? b : min), seed);
  }, [loaded, tradesToUse]);

  const bestSetup = useMemo(() => {
    if (!loaded || tradesToUse.length === 0) return null;
    const breakdowns = byCategory(tradesToUse, 'dailyCandle', ACTIVE_TEMPLATE_ID);
    const nonEmpty = breakdowns.buckets.filter((b) => b.count > 0);
    if (nonEmpty.length === 0) return null;
    const seed = nonEmpty[0]!;
    return nonEmpty.reduce((max, b) => (b.avgR > max.avgR ? b : max), seed);
  }, [loaded, tradesToUse]);

  const curveData = useMemo(() => curve.map((p) => ({ ...p, dateLabel: new Date(p.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })), [curve]);
  const dailyData = useMemo(() => daily.map((d) => ({ date: d.date, totalR: d.totalR, count: d.count })), [daily]);
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

          <Card>
            <CardHeader>
              <CardTitle>Equity curve</CardTitle>
              <div className="flex gap-1 bg-bg-3 p-1 rounded-lg border border-line">
                <button
                  type="button"
                  className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all', chartR === 'cum' ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  onClick={() => setChartR('cum')}
                >
                  Cumulative R
                </button>
                <button
                  type="button"
                  className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all', chartR === 'daily' ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  onClick={() => setChartR('daily')}
                >
                  Daily R
                </button>
              </div>
            </CardHeader>
            <CardBody className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartR === 'cum' ? (
                  <LineChart data={curveData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'var(--fg-dim)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--fg-dim)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}R`} width={45} />
                    <ReTooltip
                      contentStyle={{ background: 'rgb(var(--bg-2))', border: '1px solid var(--line)', borderRadius: '0.75rem', boxShadow: 'var(--shadow-pop)', color: 'rgb(var(--fg))', fontSize: '0.75rem' }}
                      formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
                        const p = item.payload as { dateLabel: string; r: number } | undefined;
                        if (!p) return ['—', 'Cumulative'];
                        const r = typeof value === 'number' ? value : 0;
                        return [`${formatR(r)} (${p.dateLabel})`, 'Cumulative'];
                      }}
                    />
                    <Line type="monotone" dataKey="cumR" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5, fill: 'var(--accent)' }} isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <LineChart data={dailyData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fg-dim)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--fg-dim)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}R`} width={45} />
                    <ReTooltip
                      contentStyle={{ background: 'rgb(var(--bg-2))', border: '1px solid var(--line)', borderRadius: '0.75rem', boxShadow: 'var(--shadow-pop)', color: 'rgb(var(--fg))', fontSize: '0.75rem' }}
                      formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
                        const p = item.payload as { date: string; count: number } | undefined;
                        if (!p) return ['—', 'Daily R'];
                        const r = typeof value === 'number' ? value : 0;
                        return [`${formatR(r)} (${p.count} trade${p.count === 1 ? '' : 's'})`, 'Daily R'];
                      }}
                    />
                    <Line type="monotone" dataKey="totalR" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5, fill: 'var(--accent)' }} isAnimationActive={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
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
                      <span className="font-bold text-win">{formatR(bestSetup.avgR)} avg R</span>
                    </div>
                    <div className="mt-2 text-xs text-fg-muted">
                      {bestSetup.count} trades · {formatR(bestSetup.totalR)} total R · {bestSetup.winRate == null ? '—' : formatPct(bestSetup.winRate)} win rate
                    </div>
                  </>
                ) : <div className="text-xs text-fg-dim">No data</div>}
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
                      <span className="font-bold text-loss">{formatR(worstSetup.avgR)} avg R</span>
                    </div>
                    <div className="mt-2 text-xs text-fg-muted">
                      {worstSetup.count} trades · {formatR(worstSetup.totalR)} total R · {worstSetup.winRate == null ? '—' : formatPct(worstSetup.winRate)} win rate
                    </div>
                  </>
                ) : <div className="text-xs text-fg-dim">No data</div>}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Weekdays</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-line">
                  {weekdayRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="font-medium text-fg">{row.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-fg-muted num">{row.count} trades</span>
                        <span className={cn('num font-bold text-sm', row.totalR > 0 ? 'text-win' : row.totalR < 0 ? 'text-loss' : 'text-be')}>
                          {formatR(row.totalR)}
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
