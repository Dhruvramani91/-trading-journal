import { ImagePlus } from 'lucide-react';
import { FormField, FormSection, Segmented } from '@/components/ui/Select';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { ReactNode } from 'react';
import { TemplateFieldInput } from './TemplateFieldInput';
import type { TemplateDefinition, TemplateField } from '@/domain/models/trade';
import { groupTemplateFields } from '@/domain/templates/fieldOrder';

type PreviewValue = string | boolean;
const MISTAKES = ['No mistake', 'Early entry', 'Late entry', 'Counter-trend', 'No plan', 'Revenge trade', 'Oversize', 'Moved stop', 'Exited early', 'Held loser', 'FOMO', 'Other'];

export function TemplateLivePreview({
  template, values, onChange, onFocusField, showTemplateTitle = true,
}: {
  template: TemplateDefinition;
  values: Record<string, PreviewValue>;
  onChange: (key: string, value: PreviewValue) => void;
  onFocusField: (fieldKey: string) => void;
  showTemplateTitle?: boolean;
}) {
  const groups = groupTemplateFields(template.fields);
  const clickableLabel = (field: TemplateField) => <button type="button" className="text-left text-xs font-medium text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60" onClick={() => onFocusField(field.key)}>{field.label} <span className="text-fg-dim">· edit</span></button>;
  const commonInput = (key: string, label: string, control: ReactNode) => <FormField key={key} label={label}>{control}</FormField>;

  return <div className="space-y-4">
    <div className="rounded-xl border border-line bg-bg-2 p-4">
      <h3 className="mb-4 text-sm font-semibold text-fg">Basics</h3>
      <div className="space-y-5">
        <FormSection title="When & what">
          {commonInput('openedAt', 'Opened at', <DateTimePicker value={String(values.openedAt ?? '')} onChange={(value) => onChange('openedAt', value)} placeholder="Select date and time" />)}
          {commonInput('closedAt', 'Closed at', <DateTimePicker value={String(values.closedAt ?? '')} onChange={(value) => onChange('closedAt', value)} placeholder="Leave blank for open trades" />)}
          {commonInput('instrument', 'Instrument', <Input value={String(values.instrument ?? '')} onChange={(event) => onChange('instrument', event.target.value)} placeholder="e.g. ES" />)}
          {commonInput('direction', 'Direction', <Segmented value={String(values.direction ?? '')} onChange={(value) => onChange('direction', value)} options={[{ value: 'Long', label: 'Long' }, { value: 'Short', label: 'Short' }]} fullWidth />)}
        </FormSection>
        <FormSection title="Result">
          {commonInput('grade', 'Trade grade', <Segmented value={String(values.grade ?? '')} onChange={(value) => onChange('grade', value)} options={['A+', 'A', 'B', 'C'].map((value) => ({ value, label: value }))} fullWidth />)}
          {commonInput('result', 'Outcome', <Segmented value={String(values.result ?? '')} onChange={(value) => onChange('result', value)} options={[{ value: 'Win', label: 'Win' }, { value: 'BE', label: 'BE' }, { value: 'Loss', label: 'Loss' }]} fullWidth />)}
          {commonInput('r', 'Realized R', <Input type="number" value={String(values.r ?? '')} onChange={(event) => onChange('r', event.target.value)} placeholder="e.g. 2.5" />)}
          {commonInput('entry', 'Entry', <Input type="number" value={String(values.entry ?? '')} onChange={(event) => onChange('entry', event.target.value)} placeholder="e.g. 1.2345" />)}
          {commonInput('exit', 'Exit', <Input type="number" value={String(values.exit ?? '')} onChange={(event) => onChange('exit', event.target.value)} placeholder="e.g. 1.2345" />)}
          {commonInput('pnl', 'P&L', <Input type="number" value={String(values.pnl ?? '')} onChange={(event) => onChange('pnl', event.target.value)} placeholder="e.g. 50" />)}
          {commonInput('duration', 'Duration (min)', <Input disabled value={String(values.duration ?? '')} placeholder="Calculated in a saved trade" />)}
        </FormSection>
      </div>
    </div>

    <div className="rounded-xl border border-line bg-bg-2 p-4">
      {showTemplateTitle && <div className="mb-4"><h3 className="text-sm font-semibold text-fg">{template.name}</h3><p className="mt-1 text-xs text-fg-muted">Strategy fields appear in this same order in the trade form.</p></div>}
      {groups.length ? <div className="space-y-5">{groups.map(([group, fields]) => <FormSection key={`${group}-${fields[0]?.key}`} title={group}>{fields.map((field) => <FormField key={field.key} label={clickableLabel(field)}>
        <TemplateFieldInput field={field} value={values[`strategy:${field.key}`]} onChange={(value) => onChange(`strategy:${field.key}`, value)} portalZIndex={80} />
      </FormField>)}</FormSection>)}</div> : <p className="rounded-lg border border-dashed border-line px-3 py-5 text-sm text-fg-muted">Add strategy fields to see them here.</p>}
    </div>

    <div className="rounded-xl border border-line bg-bg-2 p-4">
      <h3 className="mb-4 text-sm font-semibold text-fg">Mistakes</h3>
      <FormSection title="Mistake / filter"><FormField label="Mistake / filter"><Select value={String(values.mistake ?? '')} onChange={(event) => onChange('mistake', event.target.value)}><option value="">Select…</option>{MISTAKES.map((mistake) => <option key={mistake} value={mistake}>{mistake}</option>)}</Select></FormField></FormSection>
    </div>

    <div className="rounded-xl border border-line bg-bg-2 p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-fg">Screenshots</h3><span className="text-xs text-fg-muted">{template.photoCount ?? 3} slots</span></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{Array.from({ length: template.photoCount ?? 3 }, (_, index) => <div key={index} className="flex aspect-video items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-bg-1 text-xs text-fg-muted"><ImagePlus className="h-4 w-4" /> Image {index + 1}</div>)}</div>
    </div>

    <div className="rounded-xl border border-line bg-bg-2 p-4">
      <h3 className="mb-3 text-sm font-semibold text-fg">Notes</h3>
      <textarea aria-label="Notes" value={String(values.notes ?? '')} onChange={(event) => onChange('notes', event.target.value)} rows={3} placeholder="What did you see? What worked, what didn’t?" className="w-full rounded-lg border border-line bg-bg-1 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-focus/60" />
    </div>
  </div>;
}
