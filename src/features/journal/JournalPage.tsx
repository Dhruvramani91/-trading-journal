import { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import {

  ArrowUpDown,

  Check,

  Eye,

  Filter,

  Plus,

  RotateCcw,

  ScrollText,

  X,

} from 'lucide-react';

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

import type { Trade, TemplateField } from '@/domain/models/trade';



type SortKey = 'number' | 'openedAt' | 'r' | 'pnl' | 'durationMin' | 'result' | 'instrument';



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



  const template = useMemo(() => getTemplate(ACTIVE_TEMPLATE_ID), []);



  const filterFields = useMemo(

    () =>

      template.fields.filter(

        (field) => field.key !== 'mistake' && (field.type === 'enum' || field.type === 'boolean'),

      ),

    [template],

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

  }, [filtered, sortKey, sortDir]);



  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);



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



  return (

    <div className="space-y-4 sm:space-y-6">

      <PageHeader

        title="Journal"

        description={

          activeFilterCount > 0

            ? `${filtered.length} of ${trades.length} trades`

            : `${trades.length} trade${trades.length === 1 ? '' : 's'} recorded`

        }

        actions={

          <div className="relative flex items-center gap-2">

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



            <Button

              variant="ghost"

              onClick={clearFilters}

              disabled={activeFilterCount === 0}

              className="px-3 text-fg-muted hover:text-fg"

            >

              Clear

            </Button>



            <Button asChild variant="primary" leftIcon={<Plus className="h-4 w-4" />}>

              <Link to="/journal/new">New trade</Link>

            </Button>



            {filterOpen ? (

              <JournalFilterPanel

                instruments={instruments}

                fields={filterFields}

                filters={filters}

                onChange={setFilters}

                onClear={clearFilters}

                onClose={() => setFilterOpen(false)}

              />

            ) : null}

          </div>

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
                  <TH className="text-right">Entry</TH>
                  <TH className="text-right">Exit</TH>
                  <TH className="text-right">
                    <SortHeader
                      label="P&L"
                      active={sortKey === 'pnl'}
                      dir={sortDir}
                      onClick={() => toggleSort('pnl')}
                      align="right"
                    />
                  </TH>

                  <TH>Daily Candle</TH>

                  <TH>Daily Profile</TH>

                  <TH>H4 Candle</TH>

                  <TH>H4 Profile</TH>

                  <TH>M90/H1/M30</TH>

                  <TH>Entry Model</TH>

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

                      label="Realized R"

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

                  <TR key={t.id} interactive onClick={() => navigate(`/journal/${t.id}`)}>

                    <TD className="text-fg-dim text-center">

                      {t.number ? String(t.number).padStart(2, '0') : '—'}

                    </TD>

                    <TD className="whitespace-nowrap font-mono">{formatDate(t.openedAt)}</TD>

                    <TD>{readFieldLabel(t, 'dayOfWeek')}</TD>

                    <TD>

                      <span className="font-semibold text-fg">{t.instrument}</span>

                    </TD>
                    <TD align="right" className="text-fg-muted font-mono num">
                      {t.entry != null ? t.entry : '—'}
                    </TD>
                    <TD align="right" className="text-fg-muted font-mono num">
                      {t.exit != null ? t.exit : '—'}
                    </TD>
                    <TD
                      align="right"
                      className={
                        t.pnl == null
                          ? 'text-fg-dim font-bold num'
                          : t.pnl > 0
                            ? 'text-win font-bold num'
                            : t.pnl < 0
                              ? 'text-loss font-bold num'
                              : 'text-be font-bold num'
                      }
                    >
                      {t.pnl == null ? '—' : `${t.pnl > 0 ? '+' : ''}${t.pnl}`}
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

    </div>

  );

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

      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"

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

        className="flex w-[min(52vw,760px)] min-w-0 max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-line bg-bg-2 shadow-2xl"

        onMouseDown={(event) => event.stopPropagation()}

      >

      <div className="flex items-center justify-between border-b border-line px-6 py-4">

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



      <div className="max-h-[78vh] overflow-y-auto px-6 py-4">

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



        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">

          <button

            type="button"

            onClick={onClear}

            className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted hover:text-fg"

          >

            <RotateCcw className="h-3.5 w-3.5" />

            Clear all

          </button>



          <button

            type="button"

            onClick={onClose}

            className="rounded-lg bg-fg px-4 py-2 text-xs font-semibold text-fg-inverse hover:opacity-90"

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

    <section className="border-b border-line py-3 first:pt-0 last:border-b-0">

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</div>

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

        'flex min-h-8 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ' +

        (checked

          ? 'border-accent/50 bg-accent/10 text-fg'

          : 'border-line bg-bg-1 text-fg-muted hover:border-line-strong hover:bg-bg-4 hover:text-fg')

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

    <label className="space-y-1">

      <span className="text-[11px] font-medium text-fg-muted">{label}</span>

      <input

        type="date"

        value={value}

        onChange={(event) => onChange(event.target.value)}

        className="h-9 w-full rounded-lg border border-line bg-bg-1 px-2 text-xs text-fg outline-none focus:border-accent"

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

        const value = trade.templateData[field.key];

        if (typeof value !== 'boolean' || !selected.includes(value)) return false;

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
