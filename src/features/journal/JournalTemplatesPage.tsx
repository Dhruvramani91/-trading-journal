import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Copy, Eye, Plus, Save, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AnimatedCheckBox } from '@/components/ui/animated-check-box';
import { Select, FormField, FormSection, Segmented } from '@/components/ui/Select';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import type { TemplateDefinition, TemplateField, TemplateFieldType } from '@/domain/models/trade';
import { listJournalTemplates, getDefaultTemplateId, saveDefaultTemplateId, saveCustomTemplate, archiveCustomTemplate } from '@/data/journalTemplateRepository';

const blankField = (n: number): TemplateField => ({ key: `customField${n}`, label: `New field ${n}`, group: 'Strategy details', type: 'enum', options: [], inStats: true });

export function JournalTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [defaultId, setDefaultId] = useState('default-ict-2026');
  const [draft, setDraft] = useState<TemplateDefinition | null>(null);
  const [preview, setPreview] = useState<TemplateDefinition | null>(null);
  const [formPreviewOpen, setFormPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [showBuilder, setShowBuilder] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [all, selected] = await Promise.all([listJournalTemplates(), getDefaultTemplateId()]);
    setTemplates(all); setDefaultId(selected);
  }
  useEffect(() => { void reload().catch((e) => setMessage(e.message)); }, []);
  useEffect(() => { setPreviewValues({}); }, [preview?.id, draft?.id, draft?.name]);

  async function selectDefault(id: string) {
    setBusy(true); setMessage('');
    try { await saveDefaultTemplateId(id); setDefaultId(id); setMessage('Default template saved. New trades will use it.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save the default.'); }
    finally { setBusy(false); }
  }

  function customize(source: TemplateDefinition) {
    setDraft({ ...structuredClone(source), id: '', name: `My ${source.name}`, description: `Customized from ${source.name}. ${source.description ?? ''}`.trim(), photoCount: source.photoCount ?? 3, fields: source.fields.filter((field) => field.key !== 'mistake').map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })) });
    setMessage('');
  }

  function editCustom(template: TemplateDefinition) {
    setDraft({ ...structuredClone(template), photoCount: template.photoCount ?? 3, fields: template.fields.filter((field) => field.key !== 'mistake').map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })) });
    setMessage('');
  }

  async function saveDraft(selectAfterSave: boolean) {
    if (!draft || !draft.name.trim()) return;
    setBusy(true); setMessage('');
    try {
      const saved = await saveCustomTemplate({ ...draft, name: draft.name.trim(), photoCount: Math.max(0, Math.min(10, draft.photoCount ?? 3)), fields: draft.fields.filter((field) => field.key !== 'mistake').map((f) => f.type === 'enum' ? { ...f, options: (f.options ?? []).filter(Boolean) } : f) });
      if (selectAfterSave) {
        await saveDefaultTemplateId(saved.id);
        setDefaultId(saved.id);
      }
      await reload(); setDraft({ ...saved, fields: saved.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })) });
      setMessage(selectAfterSave ? 'Saved and selected for new trades.' : 'Template saved. Your default template was not changed.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save template.'); }
    finally { setBusy(false); }
  }

  async function removeDraft() {
    if (!draft?.id.startsWith('custom:')) { setDraft(null); return; }
    setBusy(true);
    try {
      if (defaultId === draft.id) { await saveDefaultTemplateId('default-ict-2026'); setDefaultId('default-ict-2026'); }
      await archiveCustomTemplate(draft.id); setDraft(null); await reload(); setMessage('Custom template archived. Existing trades retain their saved template.');
    }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not archive template.'); }
    finally { setBusy(false); }
  }

  const editField = (index: number, patch: Partial<TemplateField>) => setDraft((current) => current ? ({ ...current, fields: current.fields.map((f, i) => i === index ? { ...f, ...patch, key: patch.label ? `${patch.label.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase()}` : f.key } : f) }) : null);

  return <div className="space-y-6">
    <PageHeader title={draft ? draft.name : 'Journal templates'} description={draft ? 'Customize your fields, then save to use this template for new trades.' : 'Choose the form used for new trades, customize a strategy, or build your own template.'} actions={<Button asChild variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}><Link to="/settings">Back to settings</Link></Button>} />
    {message && <p role="status" className="rounded-lg border border-line bg-bg-2 px-4 py-3 text-sm text-fg-muted">{message}</p>}
    <Card><CardHeader><CardTitle>Default for new trades</CardTitle></CardHeader><CardBody className="space-y-3">
      <FormField label="Your active template"><Select value={defaultId} onChange={(e) => void selectDefault(e.target.value)} disabled={busy} renderOptionAction={(option, closeMenu) => {
        const optionTemplate = templates.find((item) => item.id === option.value);
        return optionTemplate ? <Button type="button" variant="ghost" size="icon-sm" aria-label={`Preview ${option.label}`} title={`Preview ${option.label}`} onClick={(event) => { event.stopPropagation(); closeMenu(); setPreview(optionTemplate); }}><Eye className="h-4 w-4" /></Button> : null;
      }}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></FormField>
      <p className="text-sm text-fg-muted">This changes the fields on future trades. Each saved trade keeps its original template and answers.</p>
    </CardBody></Card>
    <Card><CardBody className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-fg">Customize a prebuilt template</h2><Button variant="secondary" onClick={() => { setShowBuilder((open) => !open); setDraft(null); }} leftIcon={<Plus className="h-4 w-4" />}>{showBuilder ? 'Close' : 'Create'}</Button></div>
      {showBuilder && <div className="divide-y divide-line rounded-xl border border-line">{templates.filter((item) => !item.id.startsWith('custom:')).map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-fg">{template.name}</h3>{template.id === defaultId && <span className="text-xs font-medium text-accent">Current default</span>}</div><p className="mt-1 text-xs text-fg-dim">{template.fields.length} fields · {template.fields.filter((f) => f.inStats).length} statistics breakdowns</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="secondary" onClick={() => setPreview(template)} leftIcon={<Eye className="h-4 w-4" />}>Preview</Button><Button size="sm" variant="secondary" onClick={() => { customize(template); setShowBuilder(false); }} leftIcon={<Copy className="h-4 w-4" />}>Customize template</Button></div></div>)}</div>}
    </CardBody></Card>
    {templates.some((item) => item.id.startsWith('custom:')) && <Card><CardHeader><CardTitle>Your templates</CardTitle></CardHeader><CardBody className="grid gap-4 md:grid-cols-2">{templates.filter((item) => item.id.startsWith('custom:')).map((template) => <div key={template.id} className="rounded-xl border border-line bg-bg-2 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-fg">{template.name}</h3>{template.id === defaultId && <span className="text-xs font-medium text-accent">Selected for new trades</span>}</div><p className="mt-2 text-sm text-fg-muted">{template.description}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setPreview(template)} leftIcon={<Eye className="h-4 w-4" />}>Preview</Button><Button variant="secondary" onClick={() => editCustom(template)} leftIcon={<Copy className="h-4 w-4" />}>Edit template</Button></div></div>)}</CardBody></Card>}
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{draft ? `Editing: ${draft.name}` : 'Create your own template'}</CardTitle>{!draft && <Button variant="secondary" onClick={() => { setDraft({ id: '', name: 'My custom strategy', description: 'Personal strategy journal fields.', photoCount: 3, fields: [blankField(1)] }); setShowBuilder(false); }} leftIcon={<Plus className="h-4 w-4" />}>Create from scratch</Button>}</div></CardHeader>
      {draft && <CardBody className="space-y-5"><div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-fg-muted">This personal template is based on <strong className="text-fg">{draft.description?.match(/^Customized from ([^.]+)/)?.[1] ?? 'your custom strategy'}</strong>. Shared basics, mistake tracking, notes, and images are included automatically.</div><div className="grid gap-4 sm:grid-cols-2"><FormField label="Template name" required><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} /></FormField><FormField label="Description"><Input value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></FormField></div>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-bg-2 p-4"><div><h3 className="text-sm font-semibold text-fg">Common image slots</h3><p className="mt-1 text-xs text-fg-muted">Images appear after basics, strategy fields, mistakes, and notes.</p></div><div className="flex items-center gap-2"><Button type="button" size="icon-sm" variant="secondary" aria-label="Remove an image slot" disabled={(draft.photoCount ?? 3) <= 0} onClick={() => setDraft({ ...draft, photoCount: Math.max(0, (draft.photoCount ?? 3) - 1) })}>−</Button><span className="min-w-20 text-center text-sm font-semibold text-fg">{draft.photoCount ?? 3} images</span><Button type="button" size="icon-sm" variant="secondary" aria-label="Add an image slot" disabled={(draft.photoCount ?? 3) >= 10} onClick={() => setDraft({ ...draft, photoCount: Math.min(10, (draft.photoCount ?? 3) + 1) })}>+</Button></div></div>
        <div className="space-y-3">{draft.fields.map((field, i) => <div key={`${i}-${field.key}`} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_160px_1fr_auto]"><FormField label="Field label"><Input value={field.label} onChange={(e) => editField(i, { label: e.target.value })} /></FormField><FormField label="Type"><Select value={field.type} onChange={(e) => editField(i, { type: e.target.value as TemplateFieldType, options: e.target.value === 'enum' ? field.options ?? [] : undefined })}>{['enum','text','number','boolean','date'].map((v) => <option key={v}>{v}</option>)}</Select></FormField><FormField label={field.type === 'enum' ? 'Choices (comma separated)' : 'Section'}><Input value={field.type === 'enum' ? (field.options ?? []).join(', ') : field.group} onChange={(e) => editField(i, field.type === 'enum' ? { options: e.target.value.split(',').map((v) => v.trim()) } : { group: e.target.value })} /></FormField><Button variant="ghost" size="icon" aria-label={`Remove ${field.label}`} onClick={() => setDraft({ ...draft, fields: draft.fields.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setDraft({ ...draft, fields: [...draft.fields, blankField(draft.fields.length + 1)] })} leftIcon={<Plus className="h-4 w-4" />}>Add field</Button><Button variant="secondary" onClick={() => setFormPreviewOpen(true)} leftIcon={<Eye className="h-4 w-4" />}>Preview form</Button><Button variant="secondary" onClick={() => void saveDraft(false)} disabled={busy || !draft.name.trim()} leftIcon={<Save className="h-4 w-4" />}>Save</Button><Button onClick={() => void saveDraft(true)} disabled={busy || !draft.name.trim()} leftIcon={<Save className="h-4 w-4" />}>Save and Select Template</Button>{draft.id && <Button variant="danger" onClick={() => void removeDraft()} disabled={busy}>Archive custom template</Button>}<Button variant="ghost" onClick={() => { setDraft(null); setFormPreviewOpen(false); }}>Cancel</Button></div>
      </CardBody>}
    </Card>
    {draft && <Dialog.Root open={formPreviewOpen} onOpenChange={setFormPreviewOpen} modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm motion-reduce:animate-none motion-reduce:backdrop-blur-none" />
        <Dialog.Content data-select-portal className="fixed bottom-3 left-1/2 z-[101] flex max-h-[88dvh] w-[min(1080px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-bg-1 shadow-pop focus:outline-none">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-bg-1 px-5 py-4">
            <div><Dialog.Title className="text-lg font-semibold text-fg">{draft.name} · Form preview</Dialog.Title><Dialog.Description className="mt-1 text-sm text-fg-muted">Try the controls below. Preview entries are temporary and won’t be saved.</Dialog.Description></div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close preview"><X className="h-5 w-5" /></Button></Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><TemplateFormPreview template={draft} values={previewValues} portalZIndex={120} onChange={(key, value) => setPreviewValues((current) => ({ ...current, [key]: value }))} /></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>}
    {preview && <Dialog.Root open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }} modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm motion-reduce:animate-none motion-reduce:backdrop-blur-none" />
        <Dialog.Content data-select-portal className="fixed left-1/2 top-1/2 z-[101] flex max-h-[92dvh] w-[min(960px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-visible rounded-2xl border border-line bg-bg-1 shadow-pop focus:outline-none">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-bg-1 px-5 py-4">
            <div><Dialog.Title className="text-lg font-semibold text-fg">{preview.name} · Form preview</Dialog.Title><Dialog.Description className="mt-1 text-sm text-fg-muted">Try the controls below. Preview entries are temporary and won’t be saved.</Dialog.Description></div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close preview"><X className="h-5 w-5" /></Button></Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><TemplateFormPreview template={preview} values={previewValues} portalZIndex={120} onChange={(key, value) => setPreviewValues((current) => ({ ...current, [key]: value }))} /></div>
          <footer className="flex shrink-0 justify-end gap-2 border-t border-line bg-bg-1 px-5 py-3"><Dialog.Close asChild><Button variant="ghost">Close</Button></Dialog.Close>{preview.id.startsWith('custom:') ? <Button onClick={() => { editCustom(preview); setPreview(null); }}>Edit this template</Button> : <Button onClick={() => { customize(preview); setShowBuilder(false); setPreview(null); }}>Customize this strategy</Button>}</footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>}
  </div>;
}

function groupFields(fields: readonly TemplateField[]) {
  const groups = new Map<string, TemplateField[]>();
  for (const field of fields) groups.set(field.group, [...(groups.get(field.group) ?? []), field]);
  return Array.from(groups.entries());
}

type PreviewControl = { key: string; label: string; type: 'datetime' | 'text' | 'number' | 'date' | 'enum' | 'boolean' | 'segment'; options?: readonly string[]; disabled?: boolean };

const COMMON_PREVIEW_GROUPS: { title: string; fields: PreviewControl[] }[] = [
  { title: 'Basics', fields: [
    { key: 'openedAt', label: 'Opened at', type: 'datetime' },
    { key: 'closedAt', label: 'Closed at', type: 'datetime' },
    { key: 'instrument', label: 'Instrument', type: 'enum', options: ['NQ', 'ES', 'YM', 'RTY', 'SI', 'Other'] },
    { key: 'direction', label: 'Direction', type: 'segment', options: ['Long', 'Short'] },
  ] },
  { title: 'Result', fields: [
    { key: 'grade', label: 'Trade grade', type: 'segment', options: ['A+', 'A', 'B', 'C'] },
    { key: 'result', label: 'Outcome', type: 'segment', options: ['Win', 'BE', 'Loss'] },
    { key: 'r', label: 'Realized R', type: 'number' },
    { key: 'entryPrice', label: 'Entry', type: 'number' },
    { key: 'exitPrice', label: 'Exit', type: 'number' },
    { key: 'pnl', label: 'P&L', type: 'number' },
    { key: 'duration', label: 'Duration (min)', type: 'number', disabled: true },
  ] },
];

const COMMON_MISTAKES = [
  'No mistake', 'Early entry', 'Late entry', 'Counter-trend', 'No plan',
  'Revenge trade', 'Oversize', 'Moved stop', 'Exited early', 'Held loser', 'FOMO', 'Other',
];

function TemplateFormPreview({ template, values, onChange, portalZIndex }: { template: TemplateDefinition; values: Record<string, string>; onChange: (key: string, value: string) => void; portalZIndex?: number }) {
  const common = COMMON_PREVIEW_GROUPS.map((group) => ({ title: group.title, fields: group.fields }));
  const strategy = groupFields(template.fields.filter((field) => field.key !== 'mistake')).map(([title, fields]) => ({ title, fields: fields.map((field) => ({ key: `strategy_${field.key}`, label: field.label, type: field.type, options: field.options })) }));
  return <div className="space-y-5"><div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5"><h3 className="mb-4 text-sm font-semibold text-fg">Common trade details</h3><div className="space-y-5">{common.map((group) => <FormSection key={group.title} title={group.title}>{group.fields.map((field) => <PreviewField key={field.key} field={field} value={values[field.key] ?? ''} portalZIndex={portalZIndex} onChange={(value) => onChange(field.key, value)} />)}</FormSection>)}</div></div><div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5"><h3 className="mb-4 text-sm font-semibold text-fg">{template.name} strategy details</h3><div className="space-y-5">{strategy.map((group) => <FormSection key={group.title} title={group.title}>{group.fields.map((field) => <PreviewField key={field.key} field={field} value={values[field.key] ?? ''} portalZIndex={portalZIndex} onChange={(value) => onChange(field.key, value)} />)}</FormSection>)}</div></div><div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5"><h3 className="mb-4 text-sm font-semibold text-fg">Mistakes</h3><FormSection title="Mistake / filter"><PreviewField field={{ key: 'mistake', label: 'Mistake / filter', type: 'enum', options: COMMON_MISTAKES }} value={values.mistake ?? ''} portalZIndex={portalZIndex} onChange={(value) => onChange('mistake', value)} /></FormSection></div><div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5"><h3 className="mb-4 text-sm font-semibold text-fg">Notes</h3><textarea aria-label="Notes" value={values.notes ?? ''} onChange={(event) => onChange('notes', event.target.value)} rows={3} placeholder="What did you observe? What did you learn?" className="w-full rounded-lg border border-line bg-bg-1 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-focus/40" /></div><div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-fg">Images</h3><span className="text-xs text-fg-dim">{template.photoCount ?? 3} slots</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: template.photoCount ?? 3 }, (_, index) => <div key={index} className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-line bg-bg-1 text-xs text-fg-dim">Image {index + 1} · screenshot slot</div>)}</div><p className="mt-2 text-xs text-fg-dim">Screenshots are uploaded when you create or edit a trade.</p></div></div>;
}

function PreviewField({ field, value, onChange, portalZIndex }: { field: PreviewControl; value: string; onChange: (value: string) => void; portalZIndex?: number }) {
  return <FormField label={field.label}>
    {field.type === 'datetime' ? <DateTimePicker value={value} onChange={onChange} placeholder="Select date and time" />
      : field.type === 'boolean' ? <AnimatedCheckBox aria-label={field.label} checked={value === 'YES' || value === 'true'} onChange={(event) => onChange(event.target.checked ? 'YES' : '')} />
      : field.type === 'segment' ? <Segmented<string> value={value} onChange={onChange} options={(field.options ?? []).map((option) => ({ value: option, label: option }))} fullWidth />
      : field.type === 'enum' ? <Select value={value} portalZIndex={portalZIndex} onChange={(event) => onChange(event.target.value)}><option value="">Select…</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</Select>
      : <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={value} disabled={field.disabled} onChange={(event) => onChange(event.target.value)} placeholder={field.disabled ? 'Calculated in a saved trade' : 'Enter value'} />}
  </FormField>;
}
