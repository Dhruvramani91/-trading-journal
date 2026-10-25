import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { TemplateField, TemplateFieldType } from '@/domain/models/trade';
import { createTemplateField, duplicateTemplateField, moveField, optionListFromPaste, renameTemplateField, type TemplateIssue } from '@/domain/templates/templateEditor';

const FIELD_TYPES: Array<{ value: TemplateFieldType; label: string }> = [
  { value: 'enum', label: 'Choice' }, { value: 'text', label: 'Text' }, { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Checkbox' }, { value: 'date', label: 'Date' },
];

const QUICK_ADD: Array<{ label: string; type: TemplateFieldType; options?: string[] }> = [
  { label: 'Trading session', type: 'enum', options: ['Asia', 'London', 'New York AM', 'New York PM', 'Other'] },
  { label: 'Higher-timeframe bias', type: 'enum', options: ['Bullish', 'Bearish', 'Neutral', 'Unclear'] },
  { label: 'Entry timeframe', type: 'enum', options: ['1 minute', '3 minutes', '5 minutes', '15 minutes', 'Other'] },
  { label: 'Followed the plan', type: 'boolean' },
];

export function TemplateFieldEditorList({
  fields, onChange, issues, expandedFieldKey, onExpandedChange, focusFieldKey, focusRequestId, onRemove,
}: {
  fields: readonly TemplateField[];
  onChange: (fields: TemplateField[]) => void;
  issues: readonly TemplateIssue[];
  expandedFieldKey: string | null;
  onExpandedChange: (fieldKey: string | null) => void;
  focusFieldKey?: string;
  focusRequestId?: number;
  onRemove: (field: TemplateField, index: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [optionDraft, setOptionDraft] = useState('');
  const labelRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusFieldKey) return;
    requestAnimationFrame(() => labelRefs.current.get(focusFieldKey)?.focus());
  }, [focusFieldKey, focusRequestId]);

  const update = (index: number, patch: Partial<TemplateField>) => onChange(fields.map((field, current) => {
    if (current !== index) return field;
    const { label, ...rest } = patch;
    return { ...field, ...rest, ...(label !== undefined ? renameTemplateField(field, label) : {}) };
  }));
  const usedQuickAdds = new Set(fields.map((field) => field.label.trim().toLocaleLowerCase()));
  const fieldErrors = (key: string) => issues.filter((issue) => issue.fieldKey === key);

  const addField = (type: TemplateFieldType, label?: string, options?: string[]) => {
    const field = createTemplateField(type, fields, label);
    if (options) field.options = [...options];
    onChange([...fields, field]);
    onExpandedChange(field.key);
    setOptionDraft('');
    requestAnimationFrame(() => labelRefs.current.get(field.key)?.focus());
  };

  const reorder = (from: number, to: number) => onChange(moveField(fields, from, to));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-semibold text-fg">Strategy fields</h2><p className="mt-1 text-sm text-fg-muted">Arrange these in the order traders should answer them.</p></div>
      <Badge tone="neutral">{fields.length} {fields.length === 1 ? 'field' : 'fields'}</Badge>
    </div>

    {fields.length === 0 ? <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center">
      <p className="text-sm font-medium text-fg">No strategy fields yet</p><p className="mt-1 text-sm text-fg-muted">Add a field or start with a quick suggestion.</p>
    </div> : <ol className="space-y-2" aria-label="Ordered strategy fields">
      {fields.map((field, index) => {
        const expanded = expandedFieldKey === field.key;
        const errors = fieldErrors(field.key);
        const typeLabel = FIELD_TYPES.find((type) => type.value === field.type)?.label ?? field.type;
        return <li key={`${field.key}-${index}`}>
          <article
            tabIndex={0}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
            onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (Number.isInteger(from)) reorder(from, index); setDragIndex(null); }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || !event.altKey) return;
              if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); reorder(index, index - 1); }
              if (event.key === 'ArrowDown' && index < fields.length - 1) { event.preventDefault(); reorder(index, index + 1); }
            }}
            className={`rounded-xl border bg-bg-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${expanded ? 'border-line-strong' : 'border-line'} ${dragIndex === index ? 'opacity-50' : ''}`}
          >
            <div className="flex min-h-14 items-center gap-2 px-3">
              <span draggable onDragStart={(event) => { event.stopPropagation(); setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }} onDragEnd={() => setDragIndex(null)} className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg text-fg-dim active:cursor-grabbing" aria-hidden="true" title="Drag to reorder"><GripVertical className="h-4 w-4" /></span>
              <button type="button" className="min-w-0 flex-1 truncate py-3 text-left text-sm font-medium text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60" onClick={() => onExpandedChange(expanded ? null : field.key)} aria-expanded={expanded}>
                {field.label || 'Untitled field'}
              </button>
              <Badge tone="neutral" className="shrink-0 normal-case tracking-normal">{typeLabel}{field.type === 'enum' ? ` · ${field.options?.length ?? 0}` : ''}</Badge>
              {errors.length > 0 && <Badge tone="loss" className="shrink-0">{errors.length} {errors.length === 1 ? 'issue' : 'issues'}</Badge>}
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label={`Move ${field.label || 'field'} up`} title="Alt + ↑" disabled={index === 0} onClick={() => reorder(index, index - 1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label={`Move ${field.label || 'field'} down`} title="Alt + ↓" disabled={index === fields.length - 1} onClick={() => reorder(index, index + 1)}><ArrowDown className="h-4 w-4" /></Button>
            </div>
            {expanded && <div className="space-y-4 border-t border-line p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-fg">Field label
                  <Input ref={(node) => { if (node) labelRefs.current.set(field.key, node); else labelRefs.current.delete(field.key); }} value={field.label} maxLength={80} aria-label={`Label for ${field.label || 'new field'}`} onChange={(event) => update(index, { label: event.target.value })} />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-fg">Field type
                  <Select aria-label={`Type for ${field.label || 'new field'}`} value={field.type} onChange={(event) => update(index, { type: event.target.value as TemplateFieldType, options: event.target.value === 'enum' ? field.options ?? [] : undefined })}>{FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select>
                </label>
              </div>
              {field.type === 'enum' && <div className="space-y-2">
                <label className="block space-y-1.5 text-xs font-medium text-fg">Choices <span className="font-normal text-fg-muted">· Enter to add, paste comma-separated choices</span>
                  <div className="flex gap-2"><Input className="min-h-10" aria-label={`Add a choice to ${field.label}`} value={optionDraft} onChange={(event) => setOptionDraft(event.target.value)} onPaste={(event) => { const text = event.clipboardData.getData('text'); if (text.includes(',')) { event.preventDefault(); update(index, { options: optionListFromPaste(field.options ?? [], text) }); setOptionDraft(''); } }} onKeyDown={(event) => { if (event.key === 'Enter' && optionDraft.trim()) { event.preventDefault(); update(index, { options: optionListFromPaste(field.options ?? [], optionDraft) }); setOptionDraft(''); } }} placeholder="Type a choice and press Enter" /><Button type="button" variant="secondary" size="icon" className="h-10 w-10 shrink-0" aria-label="Add choice" disabled={!optionDraft.trim()} onClick={() => { update(index, { options: optionListFromPaste(field.options ?? [], optionDraft) }); setOptionDraft(''); }}><Plus className="h-4 w-4" /></Button></div>
                </label>
                <div className="flex flex-wrap gap-2" role="list" aria-label={`${field.options?.length ?? 0} choices`}>
                  {(field.options ?? []).map((option, optionIndex) => <div key={`${option}-${optionIndex}`} draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/plain', String(optionIndex)); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => { event.stopPropagation(); event.preventDefault(); }} onDrop={(event) => { event.stopPropagation(); event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); update(index, { options: moveField(field.options ?? [], from, optionIndex) }); }} className="flex items-center gap-1 rounded-full border border-line bg-bg-3 pl-3 pr-1 py-1">
                    <span tabIndex={0} onKeyDown={(event) => { if (!event.altKey) return; const to = event.key === 'ArrowLeft' ? optionIndex - 1 : event.key === 'ArrowRight' ? optionIndex + 1 : optionIndex; if (to !== optionIndex && to >= 0 && to < (field.options?.length ?? 0)) { event.preventDefault(); update(index, { options: moveField(field.options ?? [], optionIndex, to) }); } }} title="Alt + ← / → to reorder" className="max-w-44 truncate text-xs text-fg">{option}</span>
                    <Button type="button" variant="ghost" size="icon-sm" className="h-10 w-10 shrink-0" aria-label={`Remove choice ${option}`} onClick={() => update(index, { options: (field.options ?? []).filter((_, i) => i !== optionIndex) })}><span aria-hidden="true">×</span></Button>
                  </div>)}
                </div>
              </div>}
              {field.type !== 'enum' && <p className="text-xs text-fg-muted">This field appears under <strong className="font-medium text-fg">{field.group}</strong> in the trade form.</p>}
              {errors.map((issue) => <p key={issue.message} className="text-xs text-loss">{issue.message}</p>)}
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button type="button" variant="secondary" size="sm" className="min-h-10" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => { const copy = duplicateTemplateField(field, fields); const next = [...fields]; next.splice(index + 1, 0, copy); onChange(next); onExpandedChange(copy.key); }}>Duplicate</Button>
                <Button type="button" variant="secondary" size="sm" className="min-h-10" disabled={index === 0} onClick={() => reorder(index, 0)}>Move to top</Button>
                <span className="flex-1" />
                <Button type="button" variant="danger" size="sm" className="min-h-10" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onRemove(field, index)}>Remove field</Button>
              </div>
            </div>}
          </article>
        </li>;
      })}
    </ol>}

    <section className="space-y-3 border-t border-line pt-4">
      <div><h3 className="text-sm font-semibold text-fg">Add a field</h3><p className="mt-1 text-xs text-fg-muted">New fields are included in the journal table and statistics by default.</p></div>
      <div className="flex flex-wrap gap-2">{FIELD_TYPES.map((type) => <Button key={type.value} type="button" variant="secondary" size="sm" className="min-h-10" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addField(type.value, type.value === 'enum' ? undefined : `${type.label} field`)}>{type.label}</Button>)}</div>
    </section>
    <section className="space-y-3">
      <div><h3 className="text-sm font-semibold text-fg">Quick add</h3><p className="mt-1 text-xs text-fg-muted">Common fields to get your template started.</p></div>
      <div className="flex flex-wrap gap-2">{QUICK_ADD.filter((item) => !usedQuickAdds.has(item.label.toLocaleLowerCase())).map((item) => <Button key={item.label} type="button" variant="outline" size="sm" className="min-h-10" onClick={() => addField(item.type, item.label, item.options)}>{item.label}</Button>)}</div>
    </section>
  </div>;
}
