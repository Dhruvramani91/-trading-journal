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
import { Loader } from '@/components/ui/Loader';

import { Card, CardBody } from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';

import { EmptyState } from '@/components/ui/EmptyState';

import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

import { ResultPill } from '@/components/ui/ResultPill';
import { InstrumentMark } from '@/components/trade/InstrumentMark';

import { DirectionPill } from '@/components/ui/DirectionPill';

import { useTradesStore, bootTradesStore } from '@/store/tradesStore';

import { formatDate, formatDuration, formatR, formatSignedMoney } from '@/lib/format';

import { cn } from '@/lib/cn';

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

  const tableFields = useMemo(
    () => template.fields.filter((field) => !['quarterOpen', 'driver', 'mistake'].includes(field.key)),
    [template],
  );



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
            <div className="flex flex-col gap-1 border-b border-line bg-bg-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="text-sm font-medium text-fg">Your trades</span>
              <span className="text-xs text-fg-muted">
                Scroll horizontally to see every trade field. Select a row for full details.
              </span>
            </div>
            <div data-lenis-prevent>
            <Table
              className="min-w-max table-fixed"
              containerClassName="journal-table-scroll max-h-[min(72vh,720px)] overflow-auto overscroll-contain"
            >
              <colgroup>
                <col className="w-[90px]" />
                <col className="w-[170px]" />
                <col className="w-[130px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
                <col className="w-[120px]" />
                <col className="w-[110px]" />
                {tableFields.map((field) => (
                  <col key={field.key} className="w-[185px]" />
                ))}
                <col className="w-[58px]" />
              </colgroup>
              <THead>
                <TR>
                  <TH className="sticky left-0 z-20 bg-bg-3 text-center">
                    <SortHeader
                      label="Trade #"
                      active={sortKey === 'number'}
                      dir={sortDir}
                      onClick={() => toggleSort('number')}
                    />
                  </TH>
                  <TH className="text-center">
                    <SortHeader
                      label="Date"
                      active={sortKey === 'openedAt'}
                      dir={sortDir}
                      onClick={() => toggleSort('openedAt')}
                    />
                  </TH>
                  <TH className="text-center">
                    <SortHeader
                      label="Instrument"
                      active={sortKey === 'instrument'}
                      dir={sortDir}
                      onClick={() => toggleSort('instrument')}
                    />
                  </TH>
                  <TH className="text-center">Direction</TH>
                  <TH className="text-center">
                    <SortHeader
                      label="Result"
                      active={sortKey === 'result'}
                      dir={sortDir}
                      onClick={() => toggleSort('result')}
                    />
                  </TH>
                  <TH align="center">Entry</TH>
                  <TH align="center">Exit</TH>
                  <TH align="center">
                    <SortHeader
                      label="Profit / loss (USD)"
                      active={sortKey === 'pnl'}
                      dir={sortDir}
                      onClick={() => toggleSort('pnl')}
                      align="left"
                    />
                  </TH>
                  <TH align="center">
                    <SortHeader
                      label="Realized R"
                      active={sortKey === 'r'}
                      dir={sortDir}
                      onClick={() => toggleSort('r')}
                      align="left"
                    />
                  </TH>
                  <TH align="center">
                    <SortHeader
                      label="Duration"
                      active={sortKey === 'durationMin'}
                      dir={sortDir}
                      onClick={() => toggleSort('durationMin')}
                      align="left"
                    />
                  </TH>
                  {tableFields.map((field) => (
                    <TH key={field.key} title={field.label} className="text-center">{field.label}</TH>
                  ))}
                  <TH aria-label="Open trade" align="center" />
                </TR>
              </THead>
              <TBody>
                {sorted.map((t) => (
                  <TR
                    key={t.id}
                    interactive
                    onClick={() => navigate(`/journal/${t.id}`)}
                    className="h-[64px] odd:bg-bg-2 even:bg-bg-3/35"
                  >
                    <TD align="center" className="sticky left-0 z-[5] whitespace-nowrap bg-bg-2 font-mono font-semibold text-fg group-even:bg-bg-3 group-hover:bg-bg-4">
                      {t.number != null ? `#${String(t.number).padStart(2, '0')}` : '—'}
                    </TD>
                    <TD align="center" className="whitespace-nowrap text-xs text-fg-muted" title={formatDate(t.openedAt)}>
                      {formatDate(t.openedAt)}
                    </TD>
                    <TD align="center">
                      <span className="inline-flex items-center gap-2 font-semibold text-fg">
                        <InstrumentMark instrument={t.instrument} className="h-7 w-7" />
                        {t.instrument}
                      </span>
                    </TD>
                    <TD align="center"><DirectionPill direction={t.direction} /></TD>
                    <TD align="center"><ResultPill result={t.result} /></TD>
                    <TD align="center" className="whitespace-nowrap font-mono num text-xs text-fg-muted">
                      {t.entry ?? '—'}
                    </TD>
                    <TD align="center" className="whitespace-nowrap font-mono num text-xs text-fg-muted">
                      {t.exit ?? '—'}
                    </TD>
                    <TD align="center" className="whitespace-nowrap">
                      {t.pnl == null ? (
                        <span className="font-mono text-sm text-fg-dim">—</span>
                      ) : (
                        <span className={t.pnl > 0 ? 'font-mono text-sm font-semibold text-win' : t.pnl < 0 ? 'font-mono text-sm font-semibold text-loss' : 'font-mono text-sm font-semibold text-be'}>
                          {formatSignedMoney(t.pnl)}
                        </span>
                      )}
                    </TD>
                    <TD align="center" className={cn('whitespace-nowrap font-mono text-sm font-semibold', t.r > 0 ? 'text-win' : t.r < 0 ? 'text-loss' : 'text-be')}>
                      {formatR(t.r)}
                    </TD>
                    <TD align="center" className="whitespace-nowrap font-mono num text-xs text-fg-muted">
                      {formatDuration(t.durationMin)}
                    </TD>
                    {tableFields.map((field) => {
                      const value = readFieldLabel(t, field.key);
                      return (
                        <TD key={field.key} align="center" className="max-w-[185px] truncate text-xs text-fg-muted" title={value}>
                          {value}
                        </TD>
                      );
                    })}
                    <TD align="center">
                      <button
                        type="button"
                        aria-label={`View trade ${t.number ?? ''} details`}
                        title="View full trade details"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/journal/${t.id}`);
                        }}
                        className="rounded-md p-2 text-fg-dim transition-colors hover:bg-accent/10 hover:text-accent"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            </div>

            </>

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

      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"

      role="presentation"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget) onClose();

      }}

    >

      <div

        id="journal-filter-modal"

        role="dialog"

        aria-modal="true"

        data-lenis-prevent

        aria-labelledby="journal-filter-title"

        className="flex max-h-[92dvh] w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-bg-2 shadow-2xl"

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



      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">

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

            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"

          >

            <RotateCcw className="h-3.5 w-3.5" />

            Clear all

          </button>



          <button

            type="button"

            onClick={onClose}

            className="min-h-10 rounded-lg bg-fg px-5 py-2 text-sm font-semibold text-fg-inverse transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"

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

        'flex min-h-10 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +

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

        className="h-10 w-full rounded-xl border border-line bg-bg-1 px-3 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"

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
