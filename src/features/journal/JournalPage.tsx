import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Eye, Plus, ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { ResultPill } from '@/components/ui/ResultPill';
import { DirectionPill } from '@/components/ui/DirectionPill';
import { Badge } from '@/components/ui/Badge';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { formatDate, formatDuration, formatR } from '@/lib/format';
import { readFieldLabel } from '@/domain/templates/resolve';
import { ACTIVE_TEMPLATE_ID, getTemplate } from '@/domain/templates/registry';
import type { Trade } from '@/domain/models/trade';

type SortKey = 'number' | 'openedAt' | 'r' | 'durationMin' | 'result' | 'instrument';

export function JournalPage() {
  const { trades, loaded, load } = useTradesStore();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('openedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    bootTradesStore();
  }, []);

  // First load
  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const sorted = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'openedAt':
          return (new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()) * dir;
        case 'r':
          return (a.r - b.r) * dir;
        case 'durationMin':
          return (a.durationMin - b.durationMin) * dir;
        case 'number':
          return ((a.number ?? 0) - (b.number ?? 0)) * dir;
        case 'result': {
          const order: Record<Trade['result'], number> = { win: 0, be: 1, loss: 2 };
          return (order[a.result] - order[b.result]) * dir;
        }
        case 'instrument':
          return a.instrument.localeCompare(b.instrument) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [trades, sortKey, sortDir]);

  const fields = useMemo(
    () => getTemplate(ACTIVE_TEMPLATE_ID).fields.filter((f) => f.inTable),
    [],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Journal"
        description={`${trades.length} trade${trades.length === 1 ? '' : 's'} recorded`}
        actions={
          <Button asChild variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            <Link to="/journal/new">New trade</Link>
          </Button>
        }
      />

      <Card>
        <CardBody className="p-0">
          {!loaded ? (
            <div className="p-6 text-sm text-fg-muted">Loading trades…</div>
          ) : sorted.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ScrollText className="h-6 w-6" />}
                title="No trades yet"
                description="Add your first trade to start tracking performance."
                action={
                  <Button asChild variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                    <Link to="/journal/new">Add first trade</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-12 text-center">#</TH>
                  <TH>
                    <SortHeader
                      label="Date"
                      active={sortKey === 'openedAt'}
                      dir={sortDir}
                      onClick={() => toggleSort('openedAt')}
                    />
                  </TH>
                  <TH>Day</TH>
                  <TH>Pair</TH>
                  <TH>Daily Candle</TH>
                  <TH>Daily Profile</TH>
                  <TH>H4 Candle</TH>
                  <TH>H4 Profile</TH>
                  <TH>M90/H1/M30</TH>
                  <TH>Entry</TH>
                  <TH>Alignment</TH>
                  <TH>Module</TH>
                  <TH>Confluence</TH>
                  <TH>Trade Type</TH>
                  <TH>L/S</TH>
                  <TH>
                    <SortHeader
                      label="W/L"
                      active={sortKey === 'result'}
                      dir={sortDir}
                      onClick={() => toggleSort('result')}
                    />
                  </TH>
                  <TH className="text-right">
                    <SortHeader
                      label="R:R"
                      active={sortKey === 'r'}
                      dir={sortDir}
                      onClick={() => toggleSort('r')}
                      align="right"
                    />
                  </TH>
                  <TH className="text-right">
                    <SortHeader
                      label="Duration"
                      active={sortKey === 'durationMin'}
                      dir={sortDir}
                      onClick={() => toggleSort('durationMin')}
                      align="right"
                    />
                  </TH>
                  <TH>Q Open</TH>
                  <TH>Driver</TH>
                  <TH>Mistake</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {sorted.map((t) => (
                  <TR
                    key={t.id}
                    interactive
                    onClick={() => navigate(`/journal/${t.id}`)}
                  >
                    <TD className="text-fg-dim text-center">
                      {t.number ? String(t.number).padStart(2, '0') : '—'}
                    </TD>
                    <TD className="whitespace-nowrap font-mono">{formatDate(t.openedAt)}</TD>
                    <TD>{readFieldLabel(t, 'dayOfWeek')}</TD>
                    <TD>
                      <span className="font-semibold text-fg">{t.instrument}</span>
                    </TD>
                    <TD>{readFieldLabel(t, 'dailyCandle')}</TD>
                    <TD>{readFieldLabel(t, 'dailyProfile')}</TD>
                    <TD>
                      <Badge tone="accent">{readFieldLabel(t, 'h4Candle')}</Badge>
                    </TD>
                    <TD>{readFieldLabel(t, 'h4Profile')}</TD>
                    <TD>{readFieldLabel(t, 'itf')}</TD>
                    <TD>
                      <Badge tone="accent">{readFieldLabel(t, 'entry')}</Badge>
                    </TD>
                    <TD>{readFieldLabel(t, 'alignment')}</TD>
                    <TD>{readFieldLabel(t, 'module')}</TD>
                    <TD>
                      <Badge tone="accent">{readFieldLabel(t, 'confluence')}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={readFieldLabel(t, 'tradeType') === 'Reversal' ? 'accent' : 'neutral'}>
                        {readFieldLabel(t, 'tradeType')}
                      </Badge>
                    </TD>
                    <TD>
                      <DirectionPill direction={t.direction} />
                    </TD>
                    <TD>
                      <ResultPill result={t.result} />
                    </TD>
                    <TD
                      align="right"
                      className={
                        t.r > 0
                          ? 'text-win font-bold num'
                          : t.r < 0
                            ? 'text-loss font-bold num'
                            : 'text-be font-bold num'
                      }
                    >
                      {formatR(t.r)}
                    </TD>
                    <TD align="right" className="text-fg-muted num">
                      {formatDuration(t.durationMin)}
                    </TD>
                    <TD>{readFieldLabel(t, 'quarterOpen')}</TD>
                    <TD>{readFieldLabel(t, 'driver')}</TD>
                    <TD className="max-w-[10rem] truncate text-fg-muted">
                      {readFieldLabel(t, 'mistake')}
                    </TD>
                    <TD align="center" className="text-fg-dim">
                      <Eye className="h-4 w-4" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {fields.length === 0 ? null : null}
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1 font-semibold hover:text-fg transition-colors ' +
        (align === 'right' ? 'flex-row-reverse' : '')
      }
    >
      <span>{label}</span>
      <ArrowUpDown
        className={
          'h-3 w-3 ' + (active ? 'text-accent' : 'text-fg-dim')
        }
      />
      {active ? (
        <span className="sr-only">{dir === 'asc' ? 'ascending' : 'descending'}</span>
      ) : null}
    </button>
  );
}
