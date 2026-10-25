import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { TemplateField, TemplateFieldType } from '@/domain/models/trade';
import { createTemplateField, duplicateTemplateField, moveField, optionListFromPaste, renameTemplateField, type TemplateIssue } from '@/domain/templates/templateEditor';
import { groupTemplateFields } from '@/domain/templates/fieldOrder';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const FIELD_TYPES: Array<{ value: TemplateFieldType; label: string }> = [
  { value: 'enum', label: 'Dropdown' }, { value: 'text', label: 'Text' }, { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Checkbox' },
];

export function TemplateFieldEditorList({
  fields, onChange, issues, expandedFieldKey, onExpandedChange, focusFieldKey, focusRequestId, onRemove, footer,
}: {
  fields: readonly TemplateField[];
  onChange: (fields: TemplateField[]) => void;
  issues: readonly TemplateIssue[];
  expandedFieldKey: string | null;
  onExpandedChange: (fieldKey: string | null) => void;
  focusFieldKey?: string;
  focusRequestId?: number;
  onRemove: (field: TemplateField, index: number) => void;
  footer?: ReactNode;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [optionDraft, setOptionDraft] = useState('');
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [sectionToDelete, setSectionToDelete] = useState<{ name: string; fieldKeys: string[] } | null>(null);
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

  const renameSection = (sectionFields: readonly TemplateField[]) => {
    const nextName = sectionNameDraft.trim();
    if (!nextName) { setSectionError('Section name is required.'); return; }
    const sectionKeys = new Set(sectionFields.map((field) => field.key));
    const duplicate = groupTemplateFields(fields, true).some(([name, grouped]) => name.toLocaleLowerCase() === nextName.toLocaleLowerCase() && !grouped.some((field) => sectionKeys.has(field.key)));
    if (duplicate) { setSectionError('A section with this name already exists.'); return; }
    onChange(fields.map((field) => sectionKeys.has(field.key) ? { ...field, group: nextName } : field));
    setEditingSectionKey(null);
    setSectionError('');
  };

  const addSection = () => {
    const name = newSectionName.trim();
    if (!name) { setSectionError('Section name is required.'); return; }
    if (groupTemplateFields(fields, true).some(([group]) => group.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setSectionError('A section with this name already exists.');
      return;
    }
    const field = createTemplateField('text', fields, 'New field');
    field.group = name;
    onChange([...fields, field]);
    onExpandedChange(field.key);
    setNewSectionName('');
    setShowAddSection(false);
    setSectionError('');
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-semibold text-fg">Strategy fields</h2><p className="mt-1 text-sm text-fg-muted">Arrange these in the order traders should answer them.</p></div>
      <Badge tone="neutral">{fields.length} {fields.length === 1 ? 'field' : 'fields'}</Badge>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg-2 px-3 py-2.5">
      <p className="text-sm text-fg-muted">Organize questions into form sections.</p>
      <Button type="button" variant="secondary" size="sm" className="min-h-10" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setShowAddSection((open) => !open); setSectionError(''); }}>Add section</Button>
    </div>

    {showAddSection && <form className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-3" onSubmit={(event) => { event.preventDefault(); addSection(); }}>
      <label className="min-w-52 flex-1 space-y-1.5 text-xs font-medium text-fg">Section name
        <Input autoFocus value={newSectionName} maxLength={60} aria-label="New section name" onChange={(event) => { setNewSectionName(event.target.value); setSectionError(''); }} placeholder="e.g. Entry" />
      </label>
      <Button type="submit" className="min-h-10" disabled={!newSectionName.trim()} leftIcon={<Plus className="h-4 w-4" />}>Create section</Button>
      <Button type="button" variant="ghost" className="min-h-10" onClick={() => { setShowAddSection(false); setSectionError(''); }} leftIcon={<X className="h-4 w-4" />}>Cancel</Button>
      {sectionError && <p className="w-full text-sm text-loss" role="alert">{sectionError}</p>}
      <p className="w-full text-xs text-fg-muted">A new text field will be added so the section is ready to edit.</p>
    </form>}

    {fields.length === 0 ? <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center">
      <p className="text-sm font-medium text-fg">No strategy fields yet</p><p className="mt-1 text-sm text-fg-muted">Add a field to start building this section.</p>
    </div> : <div aria-label="Ordered strategy fields" className="space-y-5">
      {groupTemplateFields(fields, true).map(([group, groupFields]) => {
        const sectionKey = groupFields[0]?.key ?? group;
        const editing = editingSectionKey === sectionKey;
        return <section key={sectionKey} className="space-y-2" aria-label={`${group} fields`}>
        <div className="flex min-h-10 items-center gap-2 border-b border-line pb-2">
          {editing ? <>
            <Input autoFocus value={sectionNameDraft} maxLength={60} aria-label={`Section name for ${group}`} onChange={(event) => { setSectionNameDraft(event.target.value); setSectionError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); renameSection(groupFields); } if (event.key === 'Escape') { setEditingSectionKey(null); setSectionError(''); } }} />
            <Button type="button" variant="secondary" size="icon" aria-label={`Save ${group} section name`} title="Save section name" onClick={() => renameSection(groupFields)}><Check className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Cancel section rename" title="Cancel" onClick={() => { setEditingSectionKey(null); setSectionError(''); }}><X className="h-4 w-4" /></Button>
          </> : <>
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{group}</h3>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Rename ${group} section`} title="Rename section" onClick={() => { setEditingSectionKey(sectionKey); setSectionNameDraft(group); setSectionError(''); }}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${group} section`} title="Delete section" onClick={() => setSectionToDelete({ name: group, fieldKeys: groupFields.map((field) => field.key) })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </>}
        </div>
        {editing && sectionError && <p className="text-sm text-loss" role="alert">{sectionError}</p>}
        <ol className="space-y-2">
      {groupFields.map((field) => {
        const index = fields.indexOf(field);
        const expanded = expandedFieldKey === field.key;
        const errors = fieldErrors(field.key);
        const typeLabel = FIELD_TYPES.find((type) => type.value === field.type)?.label ?? (field.type === 'date' ? 'Date (existing)' : field.type);
        const fieldTypes = field.type === 'date' ? [...FIELD_TYPES, { value: 'date' as const, label: 'Date (existing)' }] : FIELD_TYPES;
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
                  <Select aria-label={`Type for ${field.label || 'new field'}`} value={field.type} onChange={(event) => update(index, { type: event.target.value as TemplateFieldType, options: event.target.value === 'enum' ? field.options ?? [] : undefined })}>{fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select>
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
        </ol>
      </section>;
      })}
    </div>}

    <section className="space-y-3 border-t border-line pt-4">
      <div><h3 className="text-sm font-semibold text-fg">Add a field</h3><p className="mt-1 text-xs text-fg-muted">New fields are included in the journal table and statistics by default.</p></div>
      <div className="flex flex-wrap gap-2">{FIELD_TYPES.map((type) => <Button key={type.value} type="button" variant="secondary" size="sm" className="min-h-10" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addField(type.value, type.value === 'enum' ? undefined : `${type.label} field`)}>{type.label}</Button>)}</div>
    </section>
    {footer}
    <ConfirmDialog open={Boolean(sectionToDelete)} onOpenChange={(open) => { if (!open) setSectionToDelete(null); }} title={`Delete ${sectionToDelete?.name ?? ''} section?`} description="This removes its fields from this template. Existing trades and their saved answers will remain unchanged." confirmLabel="Delete section" cancelLabel="Keep section" onConfirm={() => {
      if (!sectionToDelete) return;
      const keys = new Set(sectionToDelete.fieldKeys);
      onChange(fields.filter((field) => !keys.has(field.key)));
      if (expandedFieldKey && keys.has(expandedFieldKey)) onExpandedChange(null);
      setSectionToDelete(null);
    }} />
  </div>;
}
