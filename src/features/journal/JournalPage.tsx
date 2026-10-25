import { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import * as Dialog from '@radix-ui/react-dialog';

import {

  ArrowUpDown,

  Check,

  Eye,

  Filter,

  Pencil,

  Plus,

  RotateCcw,

  ScrollText,

  Trash2,

  X,

} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';

import { Card, CardBody } from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { EmptyState } from '@/components/ui/EmptyState';

import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

import { ResultPill } from '@/components/ui/ResultPill';
import { InstrumentMark } from '@/components/trade/InstrumentMark';
import { TradeGradeBadge } from '@/components/trade/TradeGradeBadge';

import { DirectionPill } from '@/components/ui/DirectionPill';

import { useTradesStore, bootTradesStore } from '@/store/tradesStore';

import { formatDate, formatDuration, formatPct, formatR, formatSignedMoney } from '@/lib/format';

import { summary } from '@/analytics/core/summary';

import { cn } from '@/lib/cn';

import { readFieldLabel } from '@/domain/templates/resolve';

import { getTemplate, listTemplates } from '@/domain/templates/registry';
import { orderTemplateFieldsForForm } from '@/domain/templates/fieldOrder';
import { listJournalTemplates, getDefaultTemplateId } from '@/data/journalTemplateRepository';

import type { Trade, TemplateDefinition, TemplateField } from '@/domain/models/trade';



type SortKey = 'number' | 'openedAt' | 'r' | 'pnl' | 'durationMin' | 'result' | 'instrument' | 'grade';



type DatePreset =

  | 'all'

  | 'today'

  | 'yesterday'

  | 'this-week'

  | 'last-week'

  | 'this-month'

  | 'last-month'

  | 'last-7'

  | 'last-30'

  | 'last-90'

  | 'custom';



interface JournalFilters {

  datePreset: DatePreset;

  from: string;

  to: string;

  instruments: string[];

  directions: Trade['direction'][];

  results: Trade['result'][];

  templateValues: Record<string, string[]>;

  templateBooleans: Record<string, boolean[]>;

}



const EMPTY_FILTERS: JournalFilters = {

  datePreset: 'all',

  from: '',

  to: '',

  instruments: [],

  directions: [],

  results: [],

  templateValues: {},

  templateBooleans: {},

};



const DATE_OPTIONS: { value: DatePreset; label: string }[] = [

  { value: 'all', label: 'All time' },

  { value: 'today', label: 'Today' },

  { value: 'yesterday', label: 'Yesterday' },

  { value: 'this-week', label: 'This week' },

  { value: 'last-week', label: 'Last week' },

  { value: 'this-month', label: 'This month' },

  { value: 'last-month', label: 'Last month' },

  { value: 'last-7', label: 'Last 7 days' },

  { value: 'last-30', label: 'Last 30 days' },

  { value: 'last-90', label: 'Last 90 days' },

  { value: 'custom', label: 'Custom range' },

];



export function JournalPage() {

  const { trades, loaded, load } = useTradesStore();

  const navigate = useNavigate();



  const [sortKey, setSortKey] = useState<SortKey>('openedAt');

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<JournalFilters>(EMPTY_FILTERS);

  const [filterOpen, setFilterOpen] = useState(false);

  const [sortOpen, setSortOpen] = useState(false);

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const removeTrade = useTradesStore((state) => state.remove);



  useEffect(() => {

    bootTradesStore();

  }, []);



  useEffect(() => {

    if (!loaded) void load();

  }, [loaded, load]);



  useEffect(() => {

    if (!filterOpen) return;



    const handleKeyDown = (event: KeyboardEvent) => {

      if (event.key === 'Escape') setFilterOpen(false);

    };



    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);

  }, [filterOpen]);



  const [templateFields, setTemplateFields] = useState<TemplateField[]>(() => listTemplates().flatMap((item) => [...item.fields]));
  const [templateOptions, setTemplateOptions] = useState<TemplateDefinition[]>(() => listTemplates());
  useEffect(() => {
    let cancelled = false;
    void Promise.all([listJournalTemplates(), getDefaultTemplateId()]).then(([items, defaultId]) => {
      if (cancelled) return;
      const selected = items.find((item) => item.id === defaultId) ?? getTemplate();
      setTemplateOptions(items);
      const union = [...items.flatMap((item) => [...item.fields])];
      const unique = new Map<string, TemplateField>();
      for (const field of union) unique.set(field.key, field);
      // Selected strategy fields appear first in the journal controls.
      setTemplateFields([...selected.fields, ...Array.from(unique.values()).filter((field) => !selected.fields.some((active) => active.key === field.key))]);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const journalFields = useMemo(() => {
    const unique = new Map<string, TemplateField>();
    for (const field of [...templateFields, ...trades.flatMap((trade) => [...(trade.templateSnapshot?.fields ?? [])])]) unique.set(field.key, field);
    return Array.from(unique.values());
  }, [templateFields, trades]);

  const filterFields = useMemo(

    () =>

        journalFields.filter(

        (field) => field.key !== 'mistake' && (field.type === 'enum' || field.type === 'boolean'),

      ),

    [journalFields],

  );



  const instruments = useMemo(

    () => Array.from(new Set(trades.map((trade) => trade.instrument).filter(Boolean))).sort(),

    [trades],

  );



  const filtered = useMemo(

    () => trades.filter((trade) => matchesFilters(trade, filters, filterFields)),

    [trades, filters, filterFields],

  );



  const sorted = useMemo(() => {

    const arr = [...filtered];



    arr.sort((a, b) => {

      const dir = sortDir === 'asc' ? 1 : -1;



      switch (sortKey) {

        case 'openedAt':

          return (new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()) * dir;

        case 'r':

          return (a.r - b.r) * dir;

        case 'pnl': {
          if (a.pnl == null && b.pnl == null) return 0;
          if (a.pnl == null) return 1;
          if (b.pnl == null) return -1;
          return (a.pnl - b.pnl) * dir;
        }

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

        case 'grade': {
          const order: Record<NonNullable<Trade['grade']>, number> = { 'A+': 0, A: 1, B: 2, C: 3 };
          return ((a.grade ? order[a.grade] : 4) - (b.grade ? order[b.grade] : 4)) * dir;
        }

        default:

          return 0;

      }

    });



    return arr;

  }, [filtered, sortKey, sortDir]);

  const journalSections = useMemo(() => {
    const byTemplate = new Map<string, Trade[]>();
    for (const trade of sorted) byTemplate.set(trade.templateId, [...(byTemplate.get(trade.templateId) ?? []), trade]);
    const definitions = new Map(templateOptions.map((template) => [template.id, template]));
    for (const trade of sorted) if (trade.templateSnapshot) {
      const snapshot = trade.templateSnapshot;
      const current = definitions.get(trade.templateId);
      if (!current) {
        definitions.set(trade.templateId, snapshot);
        continue;
      }
      const fields = new Map(current.fields.map((field) => [field.key, field]));
      for (const field of snapshot.fields) if (!fields.has(field.key)) fields.set(field.key, field);
      definitions.set(trade.templateId, { ...current, fields: orderTemplateFieldsForForm(Array.from(fields.values())) });
    }
    return Array.from(byTemplate, ([templateId, sectionTrades]) => {
      const template = definitions.get(templateId) ?? sectionTrades[0]?.templateSnapshot ?? getTemplate();
      return {
        id: templateId,
        template,
        trades: sectionTrades,
        fields: orderTemplateFieldsForForm(template.fields).filter((field) => !['quarterOpen', 'driver', 'mistake'].includes(field.key)),
      };
    });
  }, [sorted, templateOptions]);



  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const filteredSummary = useMemo(() => summary(filtered), [filtered]);

  const selectedTrade = useMemo(() => trades.find((trade) => trade.id === selectedTradeId) ?? null, [trades, selectedTradeId]);



  function toggleSort(key: SortKey) {

    if (sortKey === key) {

      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));

    } else {

      setSortKey(key);

      setSortDir('desc');

    }

  }



  function clearFilters() {

    setFilters({

      datePreset: 'all',

      from: '',

      to: '',

      instruments: [],

      directions: [],

      results: [],

      templateValues: {},

      templateBooleans: {},

    });

  }

  function removeFilterChip(key: string, value?: string | boolean) {
    if (key === 'datePreset') {
      setFilters((current) => ({ ...current, datePreset: 'all', from: '', to: '' }));
    } else if (key === 'from' || key === 'to') {
      setFilters((current) => ({ ...current, [key]: '' }));
    } else if (key === 'instrument' && typeof value === 'string') {
      setFilters((current) => ({ ...current, instruments: current.instruments.filter((item) => item !== value) }));
    } else if (key === 'direction' && typeof value === 'string') {
      setFilters((current) => ({ ...current, directions: current.directions.filter((item) => item !== value) }));
    } else if (key === 'result' && typeof value === 'string') {
      setFilters((current) => ({ ...current, results: current.results.filter((item) => item !== value) }));
    } else if (key.startsWith('field:') && typeof value === 'string') {
      const fieldKey = key.slice(6);
      setFilters((current) => ({ ...current, templateValues: { ...current.templateValues, [fieldKey]: (current.templateValues[fieldKey] ?? []).filter((item) => item !== value) } }));
    } else if (key.startsWith('boolean:') && typeof value === 'boolean') {
      const fieldKey = key.slice(8);
      setFilters((current) => ({ ...current, templateBooleans: { ...current.templateBooleans, [fieldKey]: (current.templateBooleans[fieldKey] ?? []).filter((item) => item !== value) } }));
    }
  }

  async function confirmDeleteTrade() {
    if (!deleteTarget) return;
    try {
      await removeTrade(deleteTarget.id, deleteTarget);
      setDeleteTarget(null);
      setSelectedTradeId(null);
      setDeleteError(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this trade. Try again.');
      setDeleteTarget(null);
    }
  }



  return (

    <div className="space-y-4 sm:space-y-6">

      <PageHeader

        title="Journal"

        description={`${filtered.length} of ${trades.length} trades · ${formatR(filteredSummary.totalR)} · ${filteredSummary.winRate == null ? '—' : formatPct(filteredSummary.winRate)} win rate`}

        actions={

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">

            <Button

              variant={activeFilterCount > 0 ? 'outline' : 'secondary'}

              leftIcon={<Filter className="h-4 w-4" />}

              rightIcon={

                activeFilterCount > 0 ? (

                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">

                    {activeFilterCount}

                  </span>

                ) : undefined

              }

              onClick={() => setFilterOpen((open) => !open)}

              aria-expanded={filterOpen}

              aria-controls="journal-filter-modal"

            >

              Filters

            </Button>



            <Button variant="secondary" leftIcon={<ArrowUpDown className="h-4 w-4" />} onClick={() => setSortOpen(true)}>Sort</Button>



            <Button asChild variant="primary" leftIcon={<Plus className="h-4 w-4" />}>

              <Link to="/journal/new">New trade</Link>

            </Button>



          </div>

        }

      />

      <p className="-mt-3 text-sm text-fg-muted" aria-live="polite">{filtered.length} of {trades.length} trades · {formatR(filteredSummary.totalR)} · {filteredSummary.winRate == null ? '—' : formatPct(filteredSummary.winRate)} win rate</p>

      {activeFilterCount > 0 ? <ActiveFilterChips filters={filters} fields={filterFields} onRemove={removeFilterChip} onClear={clearFilters} /> : null}

      {filterOpen ? <JournalFilterPanel instruments={instruments} fields={filterFields} filters={filters} onChange={setFilters} onClear={clearFilters} onClose={() => setFilterOpen(false)} /> : null}

      <JournalSortSheet open={sortOpen} sortKey={sortKey} sortDir={sortDir} onSelect={(key) => { if (sortKey !== key) setSortDir('desc'); setSortKey(key); }} onDirectionChange={setSortDir} onReset={() => { setSortKey('openedAt'); setSortDir('desc'); }} onClose={() => setSortOpen(false)} />

      <TradeDetailSheet trade={selectedTrade} onClose={() => setSelectedTradeId(null)} onEdit={(id) => { setSelectedTradeId(null); navigate(`/journal/${id}/edit`); }} onDelete={(trade) => { setSelectedTradeId(null); setDeleteTarget(trade); }} />

      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="Delete trade?" description={`Trade #${deleteTarget?.number ?? '—'} will be permanently deleted. This action cannot be undone.`} confirmLabel="Delete trade" onConfirm={confirmDeleteTrade} />

      {deleteError ? <div role="alert" className="fixed inset-x-4 bottom-4 z-[120] mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border border-loss/40 bg-bg-2 px-4 py-3 text-sm text-loss shadow-lg"><span>{deleteError}</span><button type="button" className="rounded-lg p-2 text-fg-muted hover:bg-bg-3" onClick={() => setDeleteError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div> : null}



      <Card>

        <CardBody className="p-0">

          {!loaded ? (

            <Loader size="sm" title="Loading trades…" className="min-h-40" />

          ) : sorted.length === 0 ? (

            <div className="p-6">

              <EmptyState

                icon={<ScrollText className="h-6 w-6" />}

                title={trades.length > 0 ? 'No trades match your filters' : 'No trades yet'}

                description={

                  trades.length > 0

                    ? 'Try changing your filters or clear them to see all trades.'

                    : 'Add your first trade to start tracking performance.'

                }

                action={

                  trades.length > 0 ? (

                    <Button

                      variant="secondary"

                      leftIcon={<RotateCcw className="h-4 w-4" />}

                      onClick={clearFilters}

                    >

                      Clear filters

                    </Button>

                  ) : (

                    <Button asChild variant="primary" leftIcon={<Plus className="h-4 w-4" />}>

                      <Link to="/journal/new">Add first trade</Link>

                    </Button>

                  )

                }

              />

            </div>

          ) : (
            <>
            <div className="space-y-5">
              {journalSections.map((section) => (
                <section key={section.id} aria-label={`${section.template.name} trades`}>
                  <div className="flex flex-col gap-1 border-b border-line bg-bg-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <span className="text-sm font-medium text-fg">{journalSections.length === 1 ? 'Your trades' : `${section.template.name} trades`}</span>
                    <span className="text-xs text-fg-muted">{section.trades.length} trade{section.trades.length === 1 ? '' : 's'} · Strategy fields shown for this template. Select a row for full details.</span>
                  </div>
                  <JournalTradeTable trades={section.trades} fields={section.fields} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} onOpen={(id) => navigate(`/journal/${id}`)} onSelect={(trade) => setSelectedTradeId(trade.id)} />
                </section>
              ))}
            </div>

            </>

          )}

        </CardBody>

      </Card>

    </div>

  );

}



function JournalTradeTable({
  trades,
  fields,
  sortKey,
  sortDir,
  toggleSort,
  onOpen,
  onSelect,
}: {
  trades: Trade[];
  fields: TemplateField[];
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  toggleSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
  onSelect: (trade: Trade) => void;
}) {
  return (
    <>
    <div className="space-y-2 p-3 lg:hidden" aria-label="Trade list">
      {trades.map((trade) => <MobileTradeCard key={trade.id} trade={trade} onOpen={() => onSelect(trade)} />)}
    </div>
    <div className="hidden lg:block">
    <Table className="min-w-max table-fixed" containerClassName="journal-table-scroll max-h-[min(72vh,720px)] overflow-auto overscroll-contain">
      <colgroup>
        <col className="w-[90px]" /><col className="w-[170px]" /><col className="w-[130px]" />
        <col className="w-[110px]" /><col className="w-[120px]" /><col className="w-[110px]" />
        <col className="w-[110px]" /><col className="w-[120px]" /><col className="w-[140px]" />
        <col className="w-[120px]" /><col className="w-[110px]" />
        {fields.map((field) => <col key={field.key} className="w-[200px]" />)}
        <col className="w-[58px]" />
      </colgroup>
      <THead><TR>
        <TH className="sticky left-0 z-20 bg-bg-3 text-center"><SortHeader label="Trade #" active={sortKey === 'number'} dir={sortDir} onClick={() => toggleSort('number')} /></TH>
        <TH className="text-center"><SortHeader label="Date" active={sortKey === 'openedAt'} dir={sortDir} onClick={() => toggleSort('openedAt')} /></TH>
        <TH className="text-center"><SortHeader label="Instrument" active={sortKey === 'instrument'} dir={sortDir} onClick={() => toggleSort('instrument')} /></TH>
        <TH className="text-center">Direction</TH>
        <TH className="text-center"><SortHeader label="Grade" active={sortKey === 'grade'} dir={sortDir} onClick={() => toggleSort('grade')} /></TH>
        <TH className="text-center"><SortHeader label="Result" active={sortKey === 'result'} dir={sortDir} onClick={() => toggleSort('result')} /></TH>
        <TH align="center"><SortHeader label="Realized R" active={sortKey === 'r'} dir={sortDir} onClick={() => toggleSort('r')} align="left" /></TH>
        <TH align="center">Entry</TH><TH align="center">Exit</TH>
        <TH align="center"><SortHeader label="Profit / loss (USD)" active={sortKey === 'pnl'} dir={sortDir} onClick={() => toggleSort('pnl')} align="left" /></TH>
        <TH align="center"><SortHeader label="Duration" active={sortKey === 'durationMin'} dir={sortDir} onClick={() => toggleSort('durationMin')} align="left" /></TH>
        {fields.map((field) => <TH key={field.key} title={field.label} className="w-[200px] min-w-[200px] whitespace-normal text-center">{field.label}</TH>)}
        <TH aria-label="Open trade" align="center" className="w-[58px]" />
      </TR></THead>
      <TBody>{trades.map((trade) => (
        <TR key={trade.id} interactive onClick={() => onOpen(trade.id)} className="h-[64px] odd:bg-bg-2 even:bg-bg-3/35">
          <TD align="center" className="sticky left-0 z-[5] whitespace-nowrap bg-bg-2 font-mono font-semibold text-fg group-even:bg-bg-3 group-hover:bg-bg-4">{trade.number != null ? `#${String(trade.number).padStart(2, '0')}` : '—'}</TD>
          <TD align="center" className="whitespace-nowrap text-xs text-fg-muted" title={formatDate(trade.openedAt)}>{formatDate(trade.openedAt)}</TD>
          <TD align="center"><span className="inline-flex items-center gap-2 font-semibold text-fg"><InstrumentMark instrument={trade.instrument} className="h-7 w-7" />{trade.instrument}</span></TD>
          <TD align="center"><DirectionPill direction={trade.direction} /></TD>
          <TD align="center"><TradeGradeBadge grade={trade.grade} /></TD>
          <TD align="center"><ResultPill result={trade.result} /></TD>
          <TD align="center" className={cn('whitespace-nowrap font-mono text-sm font-semibold', trade.r > 0 ? 'text-win' : trade.r < 0 ? 'text-loss' : 'text-be')}>{formatR(trade.r)}</TD>
          <TD align="center" className="whitespace-nowrap font-mono num text-xs text-fg-muted">{trade.entry ?? '—'}</TD>
          <TD align="center" className="whitespace-nowrap font-mono num text-xs text-fg-muted">{trade.exit ?? '—'}</TD>
          <TD align="center" className="whitespace-nowrap">{trade.pnl == null ? <span className="font-mono text-sm text-fg-dim">—</span> : <span className={trade.pnl > 0 ? 'font-mono text-sm font-semibold text-win' : trade.pnl < 0 ? 'font-mono text-sm font-semibold text-loss' : 'font-mono text-sm font-semibold text-be'}>{formatSignedMoney(trade.pnl)}</span>}</TD>
          <TD align="center" className="whitespace-nowrap font-mono num text-xs text-fg-muted">{formatDuration(trade.durationMin)}</TD>
          {fields.map((field) => { const value = readFieldLabel(trade, field.key); return <TD key={field.key} align="center" className="w-[200px] min-w-[200px] max-w-[240px] whitespace-normal break-words text-xs text-fg-muted" title={value}>{value}</TD>; })}
          <TD align="center" className="w-[58px]"><button type="button" aria-label={`View trade ${trade.number ?? ''} details`} title="View full trade details" onClick={(event) => { event.stopPropagation(); onOpen(trade.id); }} className="rounded-md p-2 text-fg-dim transition-colors hover:bg-accent/10 hover:text-accent"><Eye className="h-4 w-4" /></button></TD>
        </TR>
      ))}</TBody>
    </Table>
    </div>
    </>
  );
}

function MobileTradeCard({ trade, onOpen }: { trade: Trade; onOpen: () => void }) {
  const resultLabel: Record<Trade['result'], string> = { win: 'Win', loss: 'Loss', be: 'Break even' };
  const resultTone: Record<Trade['result'], string> = { win: 'text-win', loss: 'text-loss', be: 'text-be' };
  const strategyFields = orderTemplateFieldsForForm([...(trade.templateSnapshot?.fields ?? [])])
    .filter((field) => field.inTable)
    .map((field) => ({ field, value: readFieldLabel(trade, field.key, '') }))
    .filter(({ value }) => value !== '');
  const duration = trade.durationMin > 0 && Number.isFinite(trade.durationMin) ? formatDuration(trade.durationMin) : '—';

  return (
    <button type="button" onClick={onOpen} className="w-full min-w-0 rounded-xl border border-line bg-bg-1 p-4 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 motion-reduce:transition-none">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 pt-1">
          <InstrumentMark instrument={trade.instrument} className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-fg">{trade.instrument}</span><DirectionPill direction={trade.direction} /></div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn('font-mono text-xl font-semibold leading-tight tabular-nums', resultTone[trade.result])}>{formatR(trade.r)}</div>
          <div className={cn('mt-1 text-xs font-medium', resultTone[trade.result])}>{resultLabel[trade.result]}</div>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span>{formatDate(trade.openedAt)}</span><span aria-hidden="true">·</span><span>{trade.number != null ? `#${String(trade.number).padStart(2, '0')}` : 'Unnumbered'}</span><span aria-hidden="true">·</span><TradeGradeBadge grade={trade.grade} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <div className="min-w-0"><span className="mr-1.5 text-xs text-fg-dim">P&L</span><span className={cn('font-mono font-medium tabular-nums', trade.pnl == null ? 'text-fg-muted' : trade.pnl > 0 ? 'text-win' : trade.pnl < 0 ? 'text-loss' : 'text-be')}>{trade.pnl == null ? '—' : formatSignedMoney(trade.pnl)}</span></div>
        <div className="shrink-0 text-right"><span className="mr-1.5 text-xs text-fg-dim">Duration</span><span className="font-mono text-fg-muted tabular-nums">{duration}</span></div>
      </div>

      {strategyFields.length > 0 ? <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-line pt-3">
        {strategyFields.slice(0, 3).map(({ field, value }) => <span key={field.key} title={`${field.label}: ${value}`} className="max-w-full truncate rounded-md border border-line bg-bg-2 px-2 py-1 text-xs text-fg-muted">{field.label}: {value}</span>)}
        {strategyFields.length > 3 ? <span className="text-xs text-fg-dim">+{strategyFields.length - 3} more · tap to view</span> : null}
      </div> : null}
    </button>
  );
}

function TradeDetailSheet({ trade, onClose, onEdit, onDelete }: { trade: Trade | null; onClose: () => void; onEdit: (id: string) => void; onDelete: (trade: Trade) => void }) {
  const fields = trade?.templateSnapshot?.fields ?? [];
  const duration = trade && trade.durationMin > 0 && Number.isFinite(trade.durationMin) ? formatDuration(trade.durationMin) : '—';
  const tone = trade?.result === 'win' ? 'text-win' : trade?.result === 'loss' ? 'text-loss' : 'text-be';
  return <Dialog.Root open={Boolean(trade)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/60" />
      <Dialog.Content aria-describedby="trade-detail-description" className="fixed inset-x-0 bottom-0 z-[111] mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-bg-2 shadow-2xl focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[86dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        {trade ? <>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-bg-1 px-4 py-4 sm:px-6">
            <div className="min-w-0"><Dialog.Title className="flex flex-wrap items-center gap-2 text-lg font-semibold text-fg"><InstrumentMark instrument={trade.instrument} className="h-8 w-8" />{trade.instrument}<DirectionPill direction={trade.direction} /></Dialog.Title><Dialog.Description id="trade-detail-description" className="mt-1 text-sm text-fg-muted">{formatDate(trade.openedAt)} · Trade {trade.number != null ? `#${String(trade.number).padStart(2, '0')}` : '—'}</Dialog.Description></div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-fg-muted hover:bg-bg-4 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50" aria-label="Close trade details"><X className="h-5 w-5" /></button>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              <TradeDetailMetric label="Realized R" value={formatR(trade.r)} className={tone} />
              <TradeDetailMetric label="P&L" value={trade.pnl == null ? '—' : formatSignedMoney(trade.pnl)} className={trade.pnl == null ? 'text-fg-muted' : trade.pnl > 0 ? 'text-win' : trade.pnl < 0 ? 'text-loss' : 'text-be'} />
              <TradeDetailMetric label="Duration" value={duration} />
              <div className="rounded-xl border border-line bg-bg-1 p-3"><div className="text-xs text-fg-dim">Grade</div><div className="mt-1"><TradeGradeBadge grade={trade.grade} /></div></div>
            </div>
            <section>
              <h3 className="mb-3 text-sm font-semibold text-fg">Strategy answers</h3>
              {fields.length > 0 ? <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {fields.map((field) => <div key={field.key} className="min-w-0 border-b border-line pb-3"><dt className="text-xs text-fg-dim">{field.label}</dt><dd className="mt-1 break-words text-sm text-fg">{readFieldLabel(trade, field.key)}</dd></div>)}
              </dl> : <p className="text-sm text-fg-muted">No saved strategy answers for this trade.</p>}
            </section>
            {trade.notes ? <section><h3 className="mb-2 text-sm font-semibold text-fg">Notes</h3><p className="whitespace-pre-wrap break-words text-sm text-fg-muted">{trade.notes}</p></section> : null}
          </div>
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-bg-1 p-4 sm:px-6">
            <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(trade)}>Delete</Button>
            <Button variant="primary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(trade.id)}>Edit trade</Button>
          </footer>
        </> : null}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function TradeDetailMetric({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className="min-w-0 rounded-xl border border-line bg-bg-1 p-3"><div className="text-xs text-fg-dim">{label}</div><div className={cn('mt-1 truncate font-mono text-sm font-semibold tabular-nums text-fg', className)}>{value}</div></div>;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'openedAt', label: 'Date' }, { key: 'number', label: 'Trade number' }, { key: 'r', label: 'Realized R' },
  { key: 'pnl', label: 'P&L' }, { key: 'durationMin', label: 'Duration' }, { key: 'result', label: 'Result' },
  { key: 'instrument', label: 'Instrument' }, { key: 'grade', label: 'Grade' },
];

function JournalSortSheet({ open, sortKey, sortDir, onSelect, onDirectionChange, onReset, onClose }: { open: boolean; sortKey: SortKey; sortDir: 'asc' | 'desc'; onSelect: (key: SortKey) => void; onDirectionChange: (dir: 'asc' | 'desc') => void; onReset: () => void; onClose: () => void }) {
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60" />
      <Dialog.Content aria-describedby="journal-sort-description" className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-line bg-bg-2 shadow-2xl focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <header className="flex items-start justify-between border-b border-line px-4 py-4 sm:px-6"><div><Dialog.Title className="text-base font-semibold text-fg">Sort trades</Dialog.Title><Dialog.Description id="journal-sort-description" className="mt-1 text-sm text-fg-muted">Choose how trades are ordered.</Dialog.Description></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-fg-muted hover:bg-bg-4 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50" aria-label="Close sort"><X className="h-5 w-5" /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-dim">Sort by</p><div className="grid grid-cols-2 gap-2">{SORT_OPTIONS.map((option) => <button key={option.key} type="button" aria-pressed={sortKey === option.key} onClick={() => onSelect(option.key)} className={cn('flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50', sortKey === option.key ? 'border-line-strong bg-bg-4 text-fg' : 'border-line bg-bg-1 text-fg-muted hover:bg-bg-3 hover:text-fg')}>{option.label}{sortKey === option.key ? <Check className="h-4 w-4" /> : null}</button>)}</div>
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-fg-dim">Direction</p><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={sortDir === 'desc'} onClick={() => onDirectionChange('desc')} className={cn('min-h-11 rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50', sortDir === 'desc' ? 'border-line-strong bg-bg-4 text-fg' : 'border-line bg-bg-1 text-fg-muted hover:bg-bg-3')}>Descending</button><button type="button" aria-pressed={sortDir === 'asc'} onClick={() => onDirectionChange('asc')} className={cn('min-h-11 rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50', sortDir === 'asc' ? 'border-line-strong bg-bg-4 text-fg' : 'border-line bg-bg-1 text-fg-muted hover:bg-bg-3')}>Ascending</button></div>
        </div><footer className="flex justify-between border-t border-line bg-bg-1 p-4 sm:px-6"><Button variant="ghost" onClick={onReset}>Reset sort</Button><Button variant="primary" onClick={onClose}>Done</Button></footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ActiveFilterChips({ filters, fields, onRemove, onClear }: { filters: JournalFilters; fields: TemplateField[]; onRemove: (key: string, value?: string | boolean) => void; onClear: () => void }) {
  const chips: { id: string; label: string; key: string; value?: string | boolean }[] = [];
  if (filters.datePreset !== 'all') chips.push({ id: 'date', key: 'datePreset', label: DATE_OPTIONS.find((option) => option.value === filters.datePreset)?.label ?? 'Date' });
  if (filters.from) chips.push({ id: 'from', key: 'from', label: `From ${filters.from}` });
  if (filters.to) chips.push({ id: 'to', key: 'to', label: `To ${filters.to}` });
  filters.instruments.forEach((value) => chips.push({ id: `instrument:${value}`, key: 'instrument', value, label: value }));
  filters.directions.forEach((value) => chips.push({ id: `direction:${value}`, key: 'direction', value, label: value === 'long' ? 'Long' : 'Short' }));
  filters.results.forEach((value) => chips.push({ id: `result:${value}`, key: 'result', value, label: value === 'be' ? 'Breakeven' : value === 'win' ? 'Win' : 'Loss' }));
  for (const field of fields) {
    (filters.templateValues[field.key] ?? []).forEach((value) => chips.push({ id: `field:${field.key}:${value}`, key: `field:${field.key}`, value, label: `${field.label}: ${value}` }));
    (filters.templateBooleans[field.key] ?? []).forEach((value) => chips.push({ id: `boolean:${field.key}:${value}`, key: `boolean:${field.key}`, value, label: `${field.label}: ${value ? 'Yes' : 'No'}` }));
  }
  if (!chips.length) return null;
  return <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Active filters">{chips.map((chip) => <button key={chip.id} type="button" onClick={() => onRemove(chip.key, chip.value)} className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-line bg-bg-2 px-3 text-xs text-fg-muted hover:bg-bg-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"><span className="max-w-[15rem] truncate">{chip.label}</span><X className="h-3.5 w-3.5 shrink-0" /></button>)}<button type="button" onClick={onClear} className="min-h-10 rounded-lg px-3 text-sm font-medium text-fg-muted underline underline-offset-4 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50">Clear all</button></div>;
}

function JournalFilterPanel({

  instruments,

  fields,

  filters,

  onChange,

  onClear,

  onClose,

}: {

  instruments: string[];

  fields: TemplateField[];

  filters: JournalFilters;

  onChange: (filters: JournalFilters) => void;

  onClear: () => void;

  onClose: () => void;

}) {

  const enumFields = fields.filter((field) => field.type === 'enum' && field.options?.length);

  const booleanFields = fields.filter((field) => field.type === 'boolean');



  const setDatePreset = (datePreset: DatePreset) => {

    onChange({ ...filters, datePreset, ...(datePreset !== 'custom' ? { from: '', to: '' } : {}) });

  };



  const toggleString = (

    key: 'instruments' | 'directions' | 'results',

    value: string,

  ) => {

    const current = filters[key] as string[];

    const next = current.includes(value)

      ? current.filter((item) => item !== value)

      : [...current, value];



    onChange({ ...filters, [key]: next });

  };



  const toggleTemplateValue = (fieldKey: string, value: string) => {

    const current = filters.templateValues[fieldKey] ?? [];

    const next = current.includes(value)

      ? current.filter((item) => item !== value)

      : [...current, value];



    onChange({

      ...filters,

      templateValues: { ...filters.templateValues, [fieldKey]: next },

    });

  };



  const toggleTemplateBoolean = (fieldKey: string, value: boolean) => {

    const current = filters.templateBooleans[fieldKey] ?? [];

    const next = current.includes(value)

      ? current.filter((item) => item !== value)

      : [...current, value];



    onChange({

      ...filters,

      templateBooleans: { ...filters.templateBooleans, [fieldKey]: next },

    });

  };



  return (

    <div

      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"

      role="presentation"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget) onClose();

      }}

    >

      <div

        id="journal-filter-modal"

        role="dialog"

        aria-modal="true"



        aria-labelledby="journal-filter-title"

        className="flex max-h-[90dvh] w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-line bg-bg-2 shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"

        onMouseDown={(event) => event.stopPropagation()}

      >

      <div className="flex shrink-0 items-center justify-between border-b border-line bg-bg-1 px-4 py-4 sm:px-6">

        <div>

          <div id="journal-filter-title" className="text-base font-semibold text-fg">Filter trades</div>

          <div className="mt-0.5 text-xs text-fg-muted">Combine filters to narrow your journal.</div>

        </div>

        <button

          type="button"

          onClick={onClose}

          className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-4 hover:text-fg"

          aria-label="Close filters"

        >

          <X className="h-4 w-4" />

        </button>

      </div>



      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">

        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">

        <FilterSection title="Date">

          <div className="grid grid-cols-2 gap-1.5">

            {DATE_OPTIONS.map((option) => (

              <CheckOption

                key={option.value}

                label={option.label}

                checked={filters.datePreset === option.value}

                onChange={() => setDatePreset(option.value)}

              />

            ))}

          </div>



          {filters.datePreset === 'custom' ? (

            <div className="mt-3 grid grid-cols-2 gap-2">

              <DateInput

                label="From"

                value={filters.from}

                onChange={(from) => onChange({ ...filters, from })}

              />

              <DateInput

                label="To"

                value={filters.to}

                onChange={(to) => onChange({ ...filters, to })}

              />

            </div>

          ) : null}

        </FilterSection>



        <FilterSection title="Instrument">

          <div className="grid grid-cols-2 gap-1.5">

            {instruments.map((instrument) => (

              <CheckOption

                key={instrument}

                label={instrument}

                checked={filters.instruments.includes(instrument)}

                onChange={() => toggleString('instruments', instrument)}

              />

            ))}

          </div>

        </FilterSection>



        <FilterSection title="Direction">

          <div className="grid grid-cols-2 gap-1.5">

            <CheckOption

              label="Long"

              checked={filters.directions.includes('long')}

              onChange={() => toggleString('directions', 'long')}

            />

            <CheckOption

              label="Short"

              checked={filters.directions.includes('short')}

              onChange={() => toggleString('directions', 'short')}

            />

          </div>

        </FilterSection>



        <FilterSection title="Result">

          <div className="grid grid-cols-3 gap-1.5">

            <CheckOption

              label="Win"

              checked={filters.results.includes('win')}

              onChange={() => toggleString('results', 'win')}

            />

            <CheckOption

              label="Loss"

              checked={filters.results.includes('loss')}

              onChange={() => toggleString('results', 'loss')}

            />

            <CheckOption

              label="Breakeven"

              checked={filters.results.includes('be')}

              onChange={() => toggleString('results', 'be')}

            />

          </div>

        </FilterSection>



        {enumFields.map((field) => (

          <FilterSection key={field.key} title={field.label}>

            <div className="grid grid-cols-2 gap-1.5">

              {field.options!.map((option) => (

                <CheckOption

                  key={option}

                  label={option}

                  checked={(filters.templateValues[field.key] ?? []).includes(option)}

                  onChange={() => toggleTemplateValue(field.key, option)}

                />

              ))}

            </div>

          </FilterSection>

        ))}



        {booleanFields.map((field) => (

          <FilterSection key={field.key} title={field.label}>

            <div className="grid grid-cols-2 gap-1.5">

              <CheckOption

                label="Yes"

                checked={(filters.templateBooleans[field.key] ?? []).includes(true)}

                onChange={() => toggleTemplateBoolean(field.key, true)}

              />

              <CheckOption

                label="No"

                checked={(filters.templateBooleans[field.key] ?? []).includes(false)}

                onChange={() => toggleTemplateBoolean(field.key, false)}

              />

            </div>

          </FilterSection>

        ))}



        </div>

        <div className="sticky bottom-0 mt-2 flex items-center justify-between border-t border-line bg-bg-2 px-1 py-3">

          <button

            type="button"

            onClick={onClear}

            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"

          >

            <RotateCcw className="h-3.5 w-3.5" />

            Clear all

          </button>



          <button

            type="button"

            onClick={onClose}

            className="min-h-10 rounded-lg bg-fg px-5 py-2 text-sm font-semibold text-fg-inverse transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"

          >

            Done

          </button>

        </div>

      </div>

      </div>

    </div>

  );

}



function FilterSection({

  title,

  children,

}: {

  title: string;

  children: React.ReactNode;

}) {

  return (

    <section className="border-b border-line py-4 first:pt-2 last:border-b-0">

      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-dim">{title}</div>

      {children}

    </section>

  );

}



function CheckOption({

  label,

  checked,

  onChange,

}: {

  label: string;

  checked: boolean;

  onChange: () => void;

}) {

  return (

    <button

      type="button"

      onClick={onChange}

      className={

        'flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 ' +

        (checked

          ? 'border-accent/40 bg-accent/10 text-fg shadow-sm'

          : 'border-line bg-bg-1 text-fg-muted hover:border-line-strong hover:bg-bg-3 hover:text-fg')

      }

    >

      <span

        className={

          'flex h-4 w-4 shrink-0 items-center justify-center rounded border ' +

          (checked ? 'border-accent bg-accent text-white' : 'border-line-strong')

        }

      >

        {checked ? <Check className="h-3 w-3" /> : null}

      </span>

      <span className="truncate">{label}</span>

    </button>

  );

}



function DateInput({

  label,

  value,

  onChange,

}: {

  label: string;

  value: string;

  onChange: (value: string) => void;

}) {

  return (

    <label className="block min-w-0 space-y-1.5">

      <span className="text-[11px] font-medium text-fg-muted">{label}</span>

      <input

        type="date"

        value={value}

        onChange={(event) => onChange(event.target.value)}

        className="h-10 w-full rounded-xl border border-line bg-bg-1 px-3 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-focus/15"

      />

    </label>

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

        'inline-flex items-center gap-1 font-semibold transition-colors hover:text-fg ' +

        (align === 'right' ? 'flex-row-reverse' : '')

      }

    >

      <span>{label}</span>

      <ArrowUpDown className={'h-3 w-3 ' + (active ? 'text-accent' : 'text-fg-dim')} />

      {active ? <span className="sr-only">{dir === 'asc' ? 'ascending' : 'descending'}</span> : null}

    </button>

  );

}



function matchesFilters(

  trade: Trade,

  filters: JournalFilters,

  fields: TemplateField[],

): boolean {

  if (!matchesDate(trade.openedAt, filters)) return false;



  if (filters.instruments.length > 0 && !filters.instruments.includes(trade.instrument)) {

    return false;

  }



  if (filters.directions.length > 0 && !filters.directions.includes(trade.direction)) {

    return false;

  }



  if (filters.results.length > 0 && !filters.results.includes(trade.result)) {

    return false;

  }



  for (const field of fields) {

    if (field.type === 'enum') {

      const selected = filters.templateValues[field.key] ?? [];

      if (selected.length > 0) {

        const value = trade.templateData[field.key];

        if (typeof value !== 'string' || !selected.includes(value)) return false;

      }

    }



    if (field.type === 'boolean') {

      const selected = filters.templateBooleans[field.key] ?? [];

      if (selected.length > 0) {

        const rawValue = trade.templateData[field.key];
        const value = typeof rawValue === 'boolean'
          ? rawValue
          : rawValue === 'YES' || rawValue === 'true'
            ? true
            : rawValue === 'NO' || rawValue === 'false'
              ? false
              : null;
        if (value === null || !selected.includes(value)) return false;

      }

    }

  }



  return true;

}



function matchesDate(openedAt: string, filters: JournalFilters): boolean {

  if (filters.datePreset === 'all') return true;



  const date = new Date(openedAt);

  if (Number.isNaN(date.getTime())) return false;



  const now = new Date();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());



  const days = (dateOnly.getTime() - startOfDay.getTime()) / 86400000;



  switch (filters.datePreset) {

    case 'today':

      return days === 0;

    case 'yesterday':

      return days === -1;

    case 'last-7':

      return days >= -6 && days <= 0;

    case 'last-30':

      return days >= -29 && days <= 0;

    case 'last-90':

      return days >= -89 && days <= 0;

    case 'this-week': {

      const day = startOfDay.getDay();

      const mondayOffset = day === 0 ? 6 : day - 1;

      const monday = new Date(startOfDay);

      monday.setDate(startOfDay.getDate() - mondayOffset);

      return dateOnly >= monday && dateOnly <= startOfDay;

    }

    case 'last-week': {

      const day = startOfDay.getDay();

      const mondayOffset = day === 0 ? 6 : day - 1;

      const thisMonday = new Date(startOfDay);

      thisMonday.setDate(startOfDay.getDate() - mondayOffset);

      const lastMonday = new Date(thisMonday);

      lastMonday.setDate(thisMonday.getDate() - 7);

      const lastSunday = new Date(thisMonday);

      lastSunday.setDate(thisMonday.getDate() - 1);

      return dateOnly >= lastMonday && dateOnly <= lastSunday;

    }

    case 'this-month':

      return dateOnly.getFullYear() === startOfDay.getFullYear() && dateOnly.getMonth() === startOfDay.getMonth();

    case 'last-month': {

      const lastMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth() - 1, 1);

      const nextMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

      return dateOnly >= lastMonth && dateOnly < nextMonth;

    }

    case 'custom': {

      const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;

      const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;

      if (from && date < from) return false;

      if (to && date > to) return false;

      return true;

    }

    default:

      return true;

  }

}



function countActiveFilters(filters: JournalFilters): number {

  let count = 0;



  if (filters.datePreset !== 'all') count += 1;

  if (filters.instruments.length) count += 1;

  if (filters.directions.length) count += 1;

  if (filters.results.length) count += 1;



  count += Object.values(filters.templateValues).filter((values) => values.length > 0).length;

  count += Object.values(filters.templateBooleans).filter((values) => values.length > 0).length;



  return count;

}
