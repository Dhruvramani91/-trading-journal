import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Trash2, X, Upload, ImageOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField, FormSection, Segmented, Select } from '@/components/ui/Select';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { getTemplate } from '@/domain/templates/registry';
import type { Trade, TemplateField, TradeDirection, TradeResult } from '@/domain/models/trade';
import { tradeRepository } from '@/data/localStorageRepository';
import { formatDateLong } from '@/lib/format';

interface FormState {
  openedAt: string;
  closedAt: string;
  instrument: string;
  direction: TradeDirection;
  result: TradeResult;
  r: number;
  plannedRR: string;
  durationMin: number;
  templateData: Record<string, string>;
  notes: string;
  photos: { htf: string; itf: string; ltf: string };
}

const DEFAULTS: FormState = {
  openedAt: nowLocalIso(),
  closedAt: '',
  instrument: 'ES',
  direction: 'long',
  result: 'win',
  r: 1,
  plannedRR: '2',
  durationMin: 30,
  templateData: {},
  notes: '',
  photos: { htf: '', itf: '', ltf: '' },
};

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function tradeToForm(t: Trade): FormState {
  return {
    openedAt: isoToLocal(t.openedAt),
    closedAt: isoToLocal(t.closedAt),
    instrument: t.instrument,
    direction: t.direction,
    result: t.result,
    r: t.r,
    plannedRR: t.plannedRR != null ? String(t.plannedRR) : '',
    durationMin: t.durationMin,
    templateData: Object.fromEntries(
      Object.entries(t.templateData).map(([k, v]) => [k, v == null ? '' : String(v)]),
    ),
    notes: t.notes ?? '',
    photos: {
      htf: t.photos?.htf ?? '',
      itf: t.photos?.itf ?? '',
      ltf: t.photos?.ltf ?? '',
    },
  };
}

function dayOfWeekFromLocal(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()] ?? '';
}

export function TradeFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { create, update, remove, refresh, trades } = useTradesStore();

  const template = useMemo(() => getTemplate(), []);

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Boot store on first mount.
  useEffect(() => {
    bootTradesStore();
  }, []);

  // Load the trade being edited.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isEdit || !id) return;
      const t = trades.find((x) => x.id === id) ?? (await tradeRepository.get(id));
      if (cancelled) return;
      if (t) setForm(tradeToForm(t));
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, trades]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function patchTemplate(key: string, value: string) {
    setForm((f) => ({ ...f, templateData: { ...f.templateData, [key]: value } }));
  }

  // Auto-derive Day from openedAt until user manually changes it.
  useEffect(() => {
    setForm((f) => {
      const day = dayOfWeekFromLocal(f.openedAt);
      if (!day) return f;
      if (f.templateData.dayOfWeek) return f;
      return { ...f, templateData: { ...f.templateData, dayOfWeek: day } };
    });
  }, [form.openedAt]);

  // Keep result and r consistent (rough).
  function setResult(next: TradeResult) {
    setForm((f) => {
      let r = f.r;
      if (next === 'win' && r <= 0) r = 1;
      if (next === 'loss' && r >= 0) r = -1;
      if (next === 'be') r = 0;
      return { ...f, result: next, r };
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        templateId: template.id,
        number: nextNumber(),
        openedAt: localToIso(form.openedAt),
        closedAt: form.closedAt ? localToIso(form.closedAt) : undefined,
        instrument: form.instrument.trim() || '—',
        direction: form.direction,
        result: form.result,
        r: Number(form.r) || 0,
        plannedRR: form.plannedRR ? Number(form.plannedRR) : undefined,
        durationMin: computeDurationMin(form.openedAt, form.closedAt) ?? (Number(form.durationMin) || 0),
        templateData: form.templateData,
        notes: form.notes.trim() || undefined,
        photos: {
          htf: form.photos.htf || undefined,
          itf: form.photos.itf || undefined,
          ltf: form.photos.ltf || undefined,
        },
      } satisfies Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;

      if (isEdit && id) {
        await update(id, payload);
        navigate(`/journal/${id}`);
      } else {
        const created = await create(payload);
        navigate(`/journal/${created.id}`);
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!isEdit || !id) return;
    if (!window.confirm('Delete this trade? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await remove(id);
      navigate('/journal');
    } finally {
      setDeleting(false);
    }
  }

  function nextNumber(): number {
    const max = trades.reduce((m, t) => Math.max(m, t.number ?? 0), 0);
    return isEdit ? trades.find((t) => t.id === id)?.number ?? max + 1 : max + 1;
  }

  const groups = useMemo(() => {
    const map = new Map<string, TemplateField[]>();
    for (const f of template.fields) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return Array.from(map.entries());
  }, [template]);

  return (
    <form onSubmit={onSave} className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit trade' : 'New trade'}
        description={
          isEdit
            ? `Editing ${formatDateLong(form.openedAt)} · ${form.instrument} ${form.direction}`
            : 'Capture the trade while it’s fresh.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" leftIcon={<X className="h-4 w-4" />}>
              <Link to="/journal">Cancel</Link>
            </Button>
            {isEdit ? (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={deleting}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={saving || loading}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add trade'}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-fg-muted">Loading trade…</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>When & what</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <FormSection title="Basics">
                <FormField label="Opened at" required>
                  <Input
                    type="datetime-local"
                    value={form.openedAt}
                    onChange={(e) => patch('openedAt', e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Closed at" hint="Leave blank for an open trade.">
                  <Input
                    type="datetime-local"
                    value={form.closedAt}
                    onChange={(e) => patch('closedAt', e.target.value)}
                  />
                </FormField>
                <FormField label="Instrument" required>
                  <Input
                    value={form.instrument}
                    onChange={(e) => patch('instrument', e.target.value.toUpperCase())}
                    list="instrument-suggestions"
                    placeholder="ES, NQ, YM, RB…"
                    required
                  />
                  <datalist id="instrument-suggestions">
                    {['ES', 'NQ', 'YM', 'RTY', 'GC', 'SI', 'CL', 'RB', 'HO'].map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </FormField>
                <FormField label="Direction">
                  <Segmented<TradeDirection>
                    value={form.direction}
                    onChange={(v) => patch('direction', v)}
                    options={[
                      { value: 'long', label: 'Long', tone: 'win' },
                      { value: 'short', label: 'Short', tone: 'loss' },
                    ]}
                    fullWidth
                  />
                </FormField>
              </FormSection>

              <FormSection title="Result">
                <FormField label="Outcome">
                  <Segmented<TradeResult>
                    value={form.result}
                    onChange={setResult}
                    options={[
                      { value: 'win', label: 'Win', tone: 'win' },
                      { value: 'be', label: 'BE', tone: 'neutral' },
                      { value: 'loss', label: 'Loss', tone: 'loss' },
                    ]}
                    fullWidth
                  />
                </FormField>
                <FormField label="Realized R" hint="Positive for wins, negative for losses, 0 for BE.">
                  <Input
                    type="number"
                    step="0.1"
                    value={form.r}
                    onChange={(e) => patch('r', Number(e.target.value))}
                  />
                </FormField>
                <FormField label="Planned R:R" hint="R-multiple the trade was sized for.">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.plannedRR}
                    onChange={(e) => patch('plannedRR', e.target.value)}
                    placeholder="e.g. 2"
                  />
                </FormField>
                <FormField label="Duration (min)" hint="Auto-calculated from opened/closed if both set.">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={form.durationMin}
                    onChange={(e) => patch('durationMin', Number(e.target.value))}
                  />
                </FormField>
              </FormSection>
            </CardBody>
          </Card>

          {groups.map(([group, fields]) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle>{group}</CardTitle>
              </CardHeader>
              <CardBody>
                <FormSection title={group}>
                  {fields.map((f) => (
                    <FormField key={f.key} label={f.label}>
                      {f.type === 'boolean' ? (
                        <Segmented
                          value={form.templateData[f.key] ?? 'NO'}
                          onChange={(v) => patchTemplate(f.key, v)}
                          options={[
                            { value: 'YES', label: 'YES', tone: 'win' },
                            { value: 'NO', label: 'NO' },
                          ]}
                          fullWidth
                        />
                      ) : f.type === 'enum' ? (
                        <Select
                          value={form.templateData[f.key] ?? ''}
                          onChange={(e) => patchTemplate(f.key, e.target.value)}
                        >
                          <option value="">—</option>
                          {(f.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      ) : f.type === 'number' ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={form.templateData[f.key] ?? ''}
                          onChange={(e) => patchTemplate(f.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          value={form.templateData[f.key] ?? ''}
                          onChange={(e) => patchTemplate(f.key, e.target.value)}
                        />
                      )}
                    </FormField>
                  ))}
                </FormSection>
              </CardBody>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Screenshots</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PhotoUploadSlot
                  label="HTF"
                  value={form.photos.htf}
                  onChange={(v) => patch('photos', { ...form.photos, htf: v })}
                />
                <PhotoUploadSlot
                  label="ITF"
                  value={form.photos.itf}
                  onChange={(v) => patch('photos', { ...form.photos, itf: v })}
                />
                <PhotoUploadSlot
                  label="LTF"
                  value={form.photos.ltf}
                  onChange={(v) => patch('photos', { ...form.photos, ltf: v })}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <textarea
                value={form.notes}
                onChange={(e) => patch('notes', e.target.value)}
                rows={4}
                placeholder="What did you see? What worked, what didn’t?"
                className="w-full rounded-md border border-line bg-bg-1 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent/40"
              />
            </CardBody>
          </Card>
        </div>
      )}
    </form>
  );
}

function computeDurationMin(openedLocal: string, closedLocal: string): number | null {
  if (!openedLocal || !closedLocal) return null;
  const a = new Date(openedLocal).getTime();
  const b = new Date(closedLocal).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

function PhotoUploadSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-fg-dim">{label}</span>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-line aspect-video bg-bg-1">
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-bg-0/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Upload className="h-3 w-3" />}
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              leftIcon={<ImageOff className="h-3 w-3" />}
              onClick={() => onChange('')}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-bg-1 aspect-video text-fg-dim hover:border-accent/50 hover:bg-bg-2 transition-colors cursor-pointer"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">Click or drag image</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
