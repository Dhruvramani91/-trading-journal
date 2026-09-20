/**
 * FilterBar — a compact, horizontally-scrollable filter bar that drives
 * the global filter store. Renders core controls (date range, instrument,
 * direction, result) and dynamically generated field controls for the
 * active template's enum/boolean fields.
 *
 * Designed to scale: new template fields appear automatically without code changes.
 */
import { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select, Segmented } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useFilterStore } from '@/store/filterStore';
import { useTradesStore } from '@/store/tradesStore';
import { ACTIVE_TEMPLATE_ID, getTemplate } from '@/domain/templates/registry';
import { hasActiveFilters } from '@/analytics/filters';

import type { TemplateField, TradeDirection, TradeResult } from '@/domain/models/trade';

export function FilterBar() {
  const { filters, setFilter, setCoreFilter, resetFilters } = useFilterStore();
  const trades = useTradesStore((s) => s.trades);

  const templateFields = useMemo(() => getTemplate(ACTIVE_TEMPLATE_ID).fields, []);
  const filterableFields = useMemo(
    () => templateFields.filter((f) => (f.type === 'enum' || f.type === 'boolean')),
    [templateFields],
  );

  // Compute distinct instruments from trades
  const instruments = useMemo(
    () => Array.from(new Set(trades.map((t) => t.instrument))).sort(),
    [trades],
  );

  const { core, categorical } = filters;
  const activeCount = useMemo(() => {
    let count = 0;
    if (core.from || core.to || core.instrument || core.direction !== 'all' || core.result !== 'all') count++;
    count += Object.values(categorical).filter((v) => v !== '').length;
    return count;
  }, [core, categorical]);

  function clearAll() {
    resetFilters();
  }

  if (!hasActiveFilters(filters)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5 text-xs text-fg-dim">
        <Filter className="h-3 w-3" />
        <span>{activeCount} filter{activeCount === 1 ? '' : 's'} active</span>
      </div>

      {/* Core: Date range */}
      <div className="flex items-center gap-1">
        <Input
          type="date"
          size={12}
          value={core.from}
          onChange={(e) => setCoreFilter('from', e.target.value)}
          placeholder="From"
        />
        <Input
          type="date"
          size={12}
          value={core.to}
          onChange={(e) => setCoreFilter('to', e.target.value)}
          placeholder="To"
        />
      </div>

      {/* Core: Instrument */}
      <Select
        value={core.instrument}
        onChange={(e) => setCoreFilter('instrument', e.target.value)}
        className="w-32"
      >
        <option value="">All instruments</option>
        {instruments.map((instr) => (
          <option key={instr} value={instr}>{instr}</option>
        ))}
      </Select>

      {/* Core: Direction */}
      <Segmented
        value={core.direction as 'all' | TradeDirection}
        onChange={(v) => setCoreFilter('direction', v)}
        options={[
          { value: 'all', label: 'All' },
          { value: 'long', label: 'Long', tone: 'win' },
          { value: 'short', label: 'Short', tone: 'loss' },
        ]}
        size="sm"
      />

      {/* Core: Result */}
      <Segmented
        value={core.result as 'all' | TradeResult}
        onChange={(v) => setCoreFilter('result', v)}
        options={[
          { value: 'all', label: 'All' },
          { value: 'win', label: 'Win', tone: 'win' },
          { value: 'loss', label: 'Loss', tone: 'loss' },
          { value: 'be', label: 'BE', tone: 'neutral' },
        ]}
        size="sm"
      />

      {/* Template-driven categorical fields (selects with popover) */}
      {filterableFields.map((f) => {
        if (!hasActiveFilters({ core, categorical: { [f.key]: categorical[f.key] ?? '' } })) return null;
        const val = categorical[f.key] ?? '';
        return (
          <div key={f.key} className="flex items-center gap-1">
            <Select
              value={val}
              onChange={(e) => setFilter(f.key, e.target.value)}
              className="w-40"
            >
              <option value="">{f.label}</option>
              {renderOptions(f, val)}
            </Select>
            {val !== '' && (
              <Badge tone="accent" className="text-xs">
                {val}
              </Badge>
            )}
          </div>
        );
      })}

      {/* Clear all */}
      <Button
        size="sm"
        variant="ghost"
        onClick={clearAll}
        leftIcon={<X className="h-3 w-3" />}
      >
        Clear all
      </Button>
    </div>
  );
}

/** Render options for a select, with boolean fields showing YES/NO. */
function renderOptions(field: TemplateField, _selected: string) {
  if (field.type === 'boolean') {
    return (
      <>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </>
    );
  }
  if (field.options) {
    // Show "—" for empty/unset as an option only if there are trades with no value
    return field.options.map((opt) => (
      <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
    ));
  }
  return null;
}
