import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Check, Eye, Plus, Save, Trash2, Undo2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Select, FormField } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { TemplateDefinition, TemplateField } from '@/domain/models/trade';
import { listJournalTemplates, getDefaultTemplateId, saveDefaultTemplateId, saveCustomTemplate, archiveCustomTemplate } from '@/data/journalTemplateRepository';
import { validateTemplate } from '@/domain/templates/templateEditor';
import { TemplateFieldEditorList } from './TemplateFieldEditorList';
import { TemplateLivePreview } from './TemplateLivePreview';

type RemovedField = { field: TemplateField; index: number };
const DEFAULT_TEMPLATE_ID = 'default-ict-2026';
const cloneTemplate = (template: TemplateDefinition): TemplateDefinition => ({ ...structuredClone(template), photoCount: template.photoCount ?? 3, fields: template.fields.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })) });
const freshTemplate = (): TemplateDefinition => ({ id: '', name: 'My custom strategy', description: 'Personal strategy journal fields.', photoCount: 3, fields: [] });

export function JournalTemplatesEditorPage() {
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [defaultId, setDefaultId] = useState(DEFAULT_TEMPLATE_ID);
  const [draft, setDraft] = useState<TemplateDefinition | null>(null);
  const [baseline, setBaseline] = useState('');
  const [preview, setPreview] = useState<TemplateDefinition | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string | boolean>>({});
  const [showBuilder, setShowBuilder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'status' | 'error'>('status');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);
  const [focusFieldKey, setFocusFieldKey] = useState<string>();
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [removedField, setRemovedField] = useState<RemovedField | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const issues = useMemo(() => draft ? validateTemplate(draft.name, draft.fields) : [], [draft]);
  const dirty = Boolean(draft && JSON.stringify(draft) !== baseline);

  async function reload() {
    const [all, selected] = await Promise.all([listJournalTemplates(), getDefaultTemplateId()]);
    setTemplates(all);
    setDefaultId(selected);
  }
  useEffect(() => {
    void reload().catch((error) => { setMessage(error instanceof Error ? error.message : 'Could not load templates.'); setMessageTone('error'); }).finally(() => setLoading(false));
    return () => window.clearTimeout(toastTimer.current);
  }, []);
  const showMessage = (text: string, tone: 'status' | 'error' = 'status') => { setMessage(text); setMessageTone(tone); };

  async function selectDefault(id: string) {
    setBusy(true); showMessage('');
    try { await saveDefaultTemplateId(id); setDefaultId(id); showMessage('Default template saved. New trades will use it.'); }
    catch (error) { showMessage(error instanceof Error ? error.message : 'Could not save the default template.', 'error'); }
    finally { setBusy(false); }
  }

  function startDraft(template: TemplateDefinition) {
    const source = cloneTemplate(template);
    const next = { ...source, id: '', name: `My ${source.name}`, description: `Customized from ${source.name}. ${source.description ?? ''}`.trim(), fields: source.fields.filter((field) => field.key !== 'mistake') };
    setDraft(next); setBaseline(''); setShowBuilder(false); setPreviewValues({}); setExpandedFieldKey(null); setFocusFieldKey(undefined); showMessage('');
  }

  function startCustomEdit(template: TemplateDefinition) {
    const copy = cloneTemplate(template);
    const next = { ...copy, fields: copy.fields.filter((field) => field.key !== 'mistake') };
    setDraft(next); setBaseline(JSON.stringify(next)); setPreviewValues({}); setExpandedFieldKey(null); setFocusFieldKey(undefined); showMessage('');
  }

  function startFromScratch() {
    setDraft(freshTemplate()); setBaseline(''); setShowBuilder(false); setPreviewValues({}); setExpandedFieldKey(null); setFocusFieldKey(undefined); showMessage('');
  }

  function closeEditor() {
    if (dirty) setDiscardOpen(true);
    else { setDraft(null); setFocusFieldKey(undefined); showMessage(''); }
  }

  async function saveDraft(selectAfterSave: boolean) {
    if (!draft) return;
    if (issues.length) {
      showMessage(`${issues.length} ${issues.length === 1 ? 'thing' : 'things'} to fix before saving.`, 'error');
      const first = issues.find((issue) => issue.fieldKey);
      if (first?.fieldKey) {
        setExpandedFieldKey(first.fieldKey);
        setFocusFieldKey(first.fieldKey);
        setFocusRequestId((requestId) => requestId + 1);
      }
      else document.getElementById('template-name')?.focus();
      return;
    }
    setBusy(true); showMessage('');
    let saved: TemplateDefinition;
    try {
      saved = await saveCustomTemplate({ ...draft, name: draft.name.trim(), description: draft.description?.trim() || '', photoCount: Math.max(0, Math.min(10, draft.photoCount ?? 3)), fields: draft.fields.map((field) => field.type === 'enum' ? { ...field, options: (field.options ?? []).map((option) => option.trim()).filter(Boolean) } : field) });
      const savedCopy = cloneTemplate(saved);
      setDraft(savedCopy); setBaseline(JSON.stringify(savedCopy));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Could not save template. Your edits are still here.', 'error');
      setBusy(false);
      return;
    }

    let refreshError: string | undefined;
    try { await reload(); }
    catch (error) { refreshError = error instanceof Error ? error.message : 'please reload the page.'; }

    if (selectAfterSave) {
      try {
        await saveDefaultTemplateId(saved.id);
        setDefaultId(saved.id);
        showMessage(refreshError
          ? `Saved and selected. New trades will use this form; saved trades are unchanged. The template list could not refresh: ${refreshError}`
          : 'Saved and selected. New trades will use this form; saved trades are unchanged.', refreshError ? 'error' : 'status');
      } catch (error) {
        showMessage(`Template saved, but it could not be selected: ${error instanceof Error ? error.message : 'please try again.'}`, 'error');
      }
    } else showMessage(refreshError
      ? `Template saved. Your default template was not changed. The template list could not refresh: ${refreshError}`
      : 'Template saved. Your default template was not changed.', refreshError ? 'error' : 'status');
    setBusy(false);
  }

  async function archiveDraft() {
    if (!draft?.id.startsWith('custom:')) return;
    setBusy(true); showMessage('');
    try {
      if (defaultId === draft.id) { await saveDefaultTemplateId(DEFAULT_TEMPLATE_ID); setDefaultId(DEFAULT_TEMPLATE_ID); }
      await archiveCustomTemplate(draft.id); setDraft(null); setBaseline(''); await reload(); showMessage('Custom template archived. Existing trades retain their saved template.');
    } catch (error) { showMessage(error instanceof Error ? error.message : 'Could not archive template.', 'error'); }
    finally { setBusy(false); }
  }

  function removeField(field: TemplateField, index: number) {
    if (!draft) return;
    setDraft({ ...draft, fields: draft.fields.filter((_, fieldIndex) => fieldIndex !== index) });
    setRemovedField({ field, index }); setToast('Field removed. Saved trades keep their answers.');
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => { setToast(''); setRemovedField(null); }, 7000);
  }

  function undoRemove() {
    if (!draft || !removedField) return;
    const fields = [...draft.fields]; fields.splice(Math.min(removedField.index, fields.length), 0, removedField.field);
    setDraft({ ...draft, fields }); setRemovedField(null); setToast('Field restored.'); window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 4000);
  }

  const focusPreviewField = (key: string) => {
    if (draft?.fields.some((field) => field.key === key)) {
      setExpandedFieldKey(key);
      setFocusFieldKey(key);
      setFocusRequestId((requestId) => requestId + 1);
    }
  };

  return <div className="space-y-6 pb-28">
    <PageHeader title={draft ? draft.name || 'Untitled template' : 'Journal templates'} description={draft ? 'Customize the fields traders will use on future trades.' : 'Choose the form used for new trades, customize a strategy, or build your own template.'} actions={draft ? <Button type="button" variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={closeEditor}>Back to templates</Button> : <Button asChild variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}><Link to="/settings">Back to settings</Link></Button>} />

    {message && <p role={messageTone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${messageTone === 'error' ? 'border-loss/30 bg-loss-fill/10 text-loss' : 'border-line bg-bg-2 text-fg-muted'}`}>{message}</p>}

    {!draft ? <>
      <Card><CardHeader><CardTitle>Default for new trades</CardTitle></CardHeader><CardBody className="space-y-3">
        <FormField label="Your active template"><Select value={defaultId} onChange={(event) => void selectDefault(event.target.value)} disabled={busy || loading} renderOptionAction={(option, closeMenu) => {
          const item = templates.find((template) => template.id === option.value);
          return item ? <Button type="button" variant="ghost" size="icon-sm" aria-label={`Preview ${option.label}`} title={`Preview ${option.label}`} onClick={(event) => { event.stopPropagation(); closeMenu(); setPreview(item); }}><Eye className="h-4 w-4" /></Button> : null;
        }}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></FormField>
        <p className="text-sm text-fg-muted">Switching only affects future trades. Past trades keep the form they were saved with.</p>
      </CardBody></Card>

      <Card><CardBody className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-fg">Customize a prebuilt template</h2><p className="mt-1 text-sm text-fg-muted">Choose a strategy to make a personal copy.</p></div><Button variant="secondary" onClick={() => setShowBuilder((open) => !open)} leftIcon={<Plus className="h-4 w-4" />}>{showBuilder ? 'Close list' : 'Create'}</Button></div>
        {showBuilder && <div className="divide-y divide-line rounded-xl border border-line">{templates.filter((item) => !item.id.startsWith('custom:')).map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-fg">{template.name}</h3>{template.id === defaultId && <Badge tone="neutral">Current default</Badge>}</div><p className="mt-1 text-xs text-fg-muted">{template.fields.length} fields · {template.fields.filter((field) => field.inStats).length} statistics breakdowns</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="secondary" onClick={() => setPreview(template)} leftIcon={<Eye className="h-4 w-4" />}>Preview</Button><Button size="sm" onClick={() => startDraft(template)} leftIcon={<Plus className="h-4 w-4" />}>Customize template</Button></div></div>)}</div>}
      </CardBody></Card>

      {templates.some((item) => item.id.startsWith('custom:')) && <Card><CardHeader><CardTitle>Your templates</CardTitle></CardHeader><CardBody className="grid gap-3 md:grid-cols-2">{templates.filter((item) => item.id.startsWith('custom:')).map((template) => <div key={template.id} className="rounded-xl border border-line bg-bg-1 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-fg">{template.name}</h3><p className="mt-1 text-sm text-fg-muted">{template.description}</p></div>{template.id === defaultId && <Badge tone="neutral" className="shrink-0">Default</Badge>}</div><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setPreview(template)} leftIcon={<Eye className="h-4 w-4" />}>Preview</Button><Button variant="secondary" onClick={() => startCustomEdit(template)}>Edit template</Button></div></div>)}</CardBody></Card>}
      <Card><CardBody className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"><div><h2 className="font-semibold text-fg">Create your own template</h2><p className="mt-1 text-sm text-fg-muted">Start with an empty set of strategy fields.</p></div><Button variant="secondary" onClick={startFromScratch} leftIcon={<Plus className="h-4 w-4" />}>Create from scratch</Button></CardBody></Card>
    </> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-fg">Editing: {draft.name || 'Untitled template'}</h2><Badge tone={dirty ? 'outline' : 'neutral'}>{dirty ? 'Unsaved changes' : 'All changes saved'}</Badge></div>{draft.id.startsWith('custom:') && <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} disabled={busy} onClick={() => void archiveDraft()}>Archive template</Button>}</div>
      <Card><CardHeader><CardTitle>Default for new trades</CardTitle></CardHeader><CardBody className="space-y-3"><FormField label="New trades use"><Select value={defaultId} onChange={(event) => void selectDefault(event.target.value)} disabled={busy}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></FormField><p className="text-sm text-fg-muted">Switching only affects future trades. Past trades keep the form they were saved with.</p></CardBody></Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card><CardHeader><CardTitle>About this template</CardTitle></CardHeader><CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><FormField label="Template name" required><Input id="template-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={80} aria-invalid={!draft.name.trim()} /></FormField><FormField label="Description"><Input value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={240} placeholder="What is this strategy for?" /></FormField></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><div><h3 className="text-sm font-semibold text-fg">Screenshot slots</h3><p className="mt-1 text-xs text-fg-muted">Shared across every template. Choose from 0 to 10.</p></div><div className="flex items-center gap-2"><Button type="button" size="icon" className="h-10 w-10" variant="secondary" aria-label="Remove a screenshot slot" disabled={(draft.photoCount ?? 3) <= 0} onClick={() => setDraft({ ...draft, photoCount: Math.max(0, (draft.photoCount ?? 3) - 1) })}>−</Button><span className="min-w-20 text-center text-sm font-semibold text-fg">{draft.photoCount ?? 3} slots</span><Button type="button" size="icon" className="h-10 w-10" variant="secondary" aria-label="Add a screenshot slot" disabled={(draft.photoCount ?? 3) >= 10} onClick={() => setDraft({ ...draft, photoCount: Math.min(10, (draft.photoCount ?? 3) + 1) })}>+</Button></div></div>
          </CardBody></Card>
          <Card><CardBody className="space-y-5 p-4 sm:p-5"><TemplateFieldEditorList fields={draft.fields} onChange={(fields) => setDraft({ ...draft, fields })} issues={issues} expandedFieldKey={expandedFieldKey} onExpandedChange={setExpandedFieldKey} focusFieldKey={focusFieldKey} focusRequestId={focusRequestId} onRemove={removeField} /></CardBody></Card>
        </div>

        <Card className="min-w-0 lg:sticky lg:top-4"><CardHeader><div><CardTitle>Live preview</CardTitle><p className="mt-1 text-xs text-fg-muted">This is how your trade form will look. Nothing here is saved.</p></div><Eye className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" /></CardHeader><CardBody className="max-h-[70dvh] overflow-y-auto p-3 sm:p-4 lg:max-h-[calc(100dvh-12rem)]"><TemplateLivePreview template={draft} values={previewValues} onChange={(key, value) => setPreviewValues((current) => ({ ...current, [key]: value }))} onFocusField={focusPreviewField} /></CardBody></Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-1/95 px-4 py-3 backdrop-blur-sm sm:px-6"><div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1" role="status" aria-live="polite">{issues.length === 0 ? <span className="flex items-center gap-2 text-sm text-fg-muted"><Check className="h-4 w-4" />Ready to save</span> : <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="text-loss">{issues.length} {issues.length === 1 ? 'thing' : 'things'} to fix</span>{issues.map((issue, index) => <button key={`${issue.fieldKey ?? 'name'}-${index}`} type="button" className="text-fg-muted underline underline-offset-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60" onClick={() => { if (issue.fieldKey) { setExpandedFieldKey(issue.fieldKey); setFocusFieldKey(issue.fieldKey); setFocusRequestId((requestId) => requestId + 1); } else document.getElementById('template-name')?.focus(); }}>{issue.message}</button>)}</div>}</div>
        <Button type="button" variant="ghost" disabled={busy} onClick={closeEditor}>Discard changes</Button><Button type="button" variant="secondary" disabled={busy || issues.length > 0} leftIcon={<Save className="h-4 w-4" />} onClick={() => void saveDraft(false)}>{busy ? 'Saving…' : 'Save'}</Button><Button type="button" disabled={busy || issues.length > 0} leftIcon={<Save className="h-4 w-4" />} onClick={() => void saveDraft(true)}>{busy ? 'Saving…' : 'Save & use for new trades'}</Button>
      </div></div>
    </>}

    {loading && <p role="status" aria-live="polite" className="text-sm text-fg-muted">Loading templates…</p>}
    {toast && <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-bg-2 px-4 py-3 text-sm text-fg shadow-pop"><span>{toast}</span>{removedField && <Button type="button" variant="secondary" size="sm" leftIcon={<Undo2 className="h-4 w-4" />} onClick={undoRemove}>Undo</Button>}<Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss notification" onClick={() => { setToast(''); setRemovedField(null); window.clearTimeout(toastTimer.current); }}><X className="h-4 w-4" /></Button></div>}
    {preview && <TemplatePreviewDialog template={preview} onClose={() => setPreview(null)} onCustomize={() => { startDraft(preview); setPreview(null); }} />}
    <ConfirmDialog open={discardOpen} onOpenChange={setDiscardOpen} title="Discard unsaved changes?" description="Your edits to this template will be lost. Saved trades and their answers won’t change." confirmLabel="Discard changes" cancelLabel="Keep editing" onConfirm={() => { setDraft(null); setBaseline(''); setFocusFieldKey(undefined); showMessage(''); }} />
  </div>;
}

function TemplatePreviewDialog({ template, onClose, onCustomize }: { template: TemplateDefinition; onClose: () => void; onCustomize: () => void }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }} modal>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm motion-reduce:animate-none" /><Dialog.Content data-select-portal className="fixed left-1/2 top-1/2 z-[101] flex max-h-[92dvh] w-[min(960px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-bg-1 shadow-pop focus:outline-none">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4"><div><Dialog.Title className="text-lg font-semibold text-fg">{template.name} · Form preview</Dialog.Title><Dialog.Description className="mt-1 text-sm text-fg-muted">Try these controls. Preview entries are temporary and won’t be saved.</Dialog.Description></div><Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close preview"><X className="h-5 w-5" /></Button></Dialog.Close></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><TemplateLivePreview template={template} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} onFocusField={() => undefined} /></div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3"><Button type="button" variant="ghost" onClick={onClose}>Close</Button><Button type="button" onClick={onCustomize}>Customize this strategy</Button></footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
