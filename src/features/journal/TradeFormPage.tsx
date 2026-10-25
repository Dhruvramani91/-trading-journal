import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Trash2, X, Upload, ImageOff } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AnimatedCheckBox } from '@/components/ui/animated-check-box';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import {
  FormField,
  FormSection,
  Segmented,
  Select,
} from '@/components/ui/Select';
import { useFormFieldContext } from '@/components/ui/FormFieldContext';

import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { getTemplate } from '@/domain/templates/registry';
import { groupTemplateFields } from '@/domain/templates/fieldOrder';
import type { TemplateDefinition } from '@/domain/models/trade';
import { getDefaultTemplateId, listJournalTemplates } from '@/data/journalTemplateRepository';
import type {
  Trade,
  TradeGrade,
  TradeDirection,
  TradeResult,
} from '@/domain/models/trade';

import { tradeRepository } from '@/data/supabaseTradeRepository';
import { formatDateLong } from '@/lib/format';
import {
  persistEditedTradePhotos,
  persistTradePhotos,
  resolveTradePhotoUrl,
  type TradePhotos,
} from '@/lib/tradePhotos';

interface FormState {
  openedAt: string;
  closedAt: string;
  instrument: string;
  direction: TradeDirection | '';
  result: TradeResult | '';
  grade: TradeGrade | '';
  entry: string;
  exit: string;
  pnl: string;
  r: string;
  durationMin: string;
  templateData: Record<string, string | boolean>;
  notes: string;
  photos: TradePhotos;
}

type FieldErrors = Partial<
  Record<
    | 'openedAt'
    | 'instrument'
    | 'direction'
    | 'result'
    | 'entry'
    | 'exit'
    | 'pnl'
    | 'r'
    | 'setup'
    | 'closedAt',
    string
  >
>;

const DEFAULTS: FormState = {
  openedAt: nowLocalIso(),
  closedAt: '',
  instrument: '',
  direction: '',
  result: '',
  grade: '',
  entry: '',
  exit: '',
  pnl: '',
  r: '',
  durationMin: '',
  templateData: {},
  notes: '',
  photos: {},
};

const COMMON_MISTAKES = ['No mistake', 'Early entry', 'Late entry', 'Counter-trend', 'No plan', 'Revenge trade', 'Oversize', 'Moved stop', 'Exited early', 'Held loser', 'FOMO', 'Other'];

function photoAt(photos: TradePhotos, index: number): string {
  if (index === 0) return photos.htf ?? '';
  if (index === 1) return photos.itf ?? '';
  if (index === 2) return photos.ltf ?? '';
  return photos.additional?.[index - 3] ?? '';
}

function withPhoto(photos: TradePhotos, index: number, value: string): TradePhotos {
  if (index === 0) return { ...photos, htf: value };
  if (index === 1) return { ...photos, itf: value };
  if (index === 2) return { ...photos, ltf: value };
  const additional = [...(photos.additional ?? [])];
  additional[index - 3] = value;
  return { ...photos, additional };
}

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(
    d.getMonth() + 1,
  )}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function isoToLocal(iso?: string): string {
  if (!iso) return '';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(
    d.getMonth() + 1,
  )}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
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
    grade: t.grade ?? '',
    entry: t.entry != null ? String(t.entry) : '',
    exit: t.exit != null ? String(t.exit) : '',
    pnl: t.pnl != null ? String(t.pnl) : '',
    r: String(t.r),
    durationMin: String(t.durationMin),

    templateData: Object.fromEntries(
      Object.entries(t.templateData).map(([key, value]) => [
        key,
        value == null ? '' : typeof value === 'boolean' ? value : String(value),
      ]),
    ),

    notes: t.notes ?? '',

    photos: { ...t.photos, additional: t.photos?.additional ? [...t.photos.additional] : [] },
  };
}

function dayOfWeekFromLocal(local: string): string {
  const d = new Date(local);

  if (Number.isNaN(d.getTime())) return '';

  return (
    [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ][d.getDay()] ?? ''
  );
}

/*
 * Keeps Realized R consistent with the selected outcome.
 *
 * Win  -> positive
 * Loss -> negative
 * BE   -> 0
 *
 * Empty values are preserved while the user is typing.
 */
function normalizeRForResult(
  result: TradeResult | '',
  raw: string,
): string {
  if (result === 'be') {
    return '0';
  }

  if (raw === '' || raw === '-') {
    return raw;
  }

  const num = Number(raw);

  if (Number.isNaN(num)) {
    return raw;
  }

  if (result === 'win') {
    return String(Math.abs(num));
  }

  if (result === 'loss') {
    return String(-Math.abs(num));
  }

  return raw;
}

export function TradeFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const navigate = useNavigate();

  const {
    create,
    update,
    remove,
    refresh,
    trades,
  } = useTradesStore();

  const [template, setTemplate] = useState<TemplateDefinition>(() => getTemplate());

  const [form, setForm] =
    useState<FormState>(DEFAULTS);
  const [originalPhotos, setOriginalPhotos] =
    useState<TradePhotos>({});

  const [loading, setLoading] =
    useState(isEdit);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  /*
   * Boot store on first mount.
   */
  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isEdit) return;
    void Promise.all([getDefaultTemplateId(), listJournalTemplates()]).then(([defaultId, templates]) => {
      if (!cancelled) setTemplate(templates.find((item) => item.id === defaultId) ?? getTemplate());
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load your journal template.'); });
    return () => { cancelled = true; };
  }, [isEdit]);

  /*
   * Load existing trade in edit mode.
   *
   * Existing trades are loaded exactly as saved.
   * New-trade defaults are never applied to edit mode.
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isEdit || !id) return;

      const trade =
        trades.find((item) => item.id === id) ??
        (await tradeRepository.get(id));

      if (cancelled) return;

      if (trade) {
        const definitions = await listJournalTemplates().catch(() => []);
        const definition = trade.templateSnapshot ?? definitions.find((item) => item.id === trade.templateId) ?? getTemplate();
        setTemplate(definition);
        setForm(tradeToForm(trade));
        setOriginalPhotos(trade.photos ?? {});
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, trades]);

  function patch<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    clearFieldError(key as keyof FieldErrors);
  }

  function patchTemplate(
    key: string,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      templateData: {
        ...current.templateData,
        [key]: value,
      },
    }));

    if (key === 'entry') {
      clearFieldError('setup');
    }
  }

  function clearFieldError(
    field: keyof FieldErrors,
  ) {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const next = {
        ...current,
      };

      delete next[field];

      return next;
    });
  }

  /*
   * Outcome controls Realized R:
   *
   * Win  -> positive R
   * Loss -> negative R
   * BE   -> automatically 0 and locked
   */
  function handleResultChange(
    next: TradeResult | '',
  ) {
    setForm((current) => {
      let nextR = current.r;

      if (next === 'be') {
        nextR = '0';
      } else if (current.result === 'be') {
        nextR = '';
      } else {
        nextR = normalizeRForResult(
          next,
          current.r,
        );
      }

      return {
        ...current,
        result: next,
        r: nextR,
      };
    });

    clearFieldError('result');
    clearFieldError('r');
  }

  function handleRChange(value: string) {
    setForm((current) => ({
      ...current,
      r: normalizeRForResult(
        current.result,
        value,
      ),
    }));

    clearFieldError('r');
  }

  /*
   * Automatically keep Day synchronized with Opened At.
   */
  useEffect(() => {
    setForm((current) => {
      const day = dayOfWeekFromLocal(
        current.openedAt,
      );

      if (!day) return current;

      return {
        ...current,
        templateData: {
          ...current.templateData,
          dayOfWeek: day,
        },
      };
    });
  }, [form.openedAt]);

  /*
   * Validate all required fields.
   *
   * Errors are stored per field so they can be displayed
   * directly underneath the field that needs attention.
   */
  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};

    if (!form.openedAt) {
      errors.openedAt =
        'Opened at is required.';
    }

    if (!form.instrument.trim()) {
      errors.instrument =
        'Please select an instrument.';
    }

    if (!form.direction) {
      errors.direction =
        'Please select Long or Short.';
    }

    if (!form.result) {
      errors.result =
        'Please select the trade outcome.';
    }

    if (form.r === '') {
      errors.r =
        'Realized R is required.';
    } else {
      const rValue = Number(form.r);

      if (Number.isNaN(rValue)) {
        errors.r =
          'Enter a valid Realized R.';
      } else if (
        form.result === 'win' &&
        rValue <= 0
      ) {
        errors.r =
          'A winning trade must have positive Realized R.';
      } else if (
        form.result === 'loss' &&
        rValue >= 0
      ) {
        errors.r =
          'A losing trade must have negative Realized R.';
      } else if (
        form.result === 'be' &&
        rValue !== 0
      ) {
        errors.r =
          'A break-even trade must have Realized R of 0.';
      }
    }

    if (form.pnl === '' || Number.isNaN(Number(form.pnl))) {
      errors.pnl = 'P&L is required.';
    }

    if (
      template.fields.some((field) => field.key === 'entry') &&
      (typeof form.templateData.entry !== 'string' || form.templateData.entry.trim() === '')
    ) {
      errors.setup =
        'Setup is required.';
    }

    if (
      form.closedAt &&
      form.openedAt &&
      form.closedAt < form.openedAt
    ) {
      errors.closedAt =
        'Closed at cannot be earlier than Opened at.';
    }

    return errors;
  }

  async function onSave(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError(null);

    const errors = validateForm();

    setFieldErrors(errors);

    /*
     * Stop immediately if validation failed.
     *
     * The errors are already shown next to their fields.
     */
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    /*
     * At this point TypeScript can safely narrow these
     * values because validation above has confirmed them.
     */
    const direction = form.direction;
    const result = form.result;

    if (!direction || !result) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        templateId: template.id,
        templateSnapshot: template,

        number: nextNumber(),

        openedAt: localToIso(
          form.openedAt,
        ),

        closedAt: form.closedAt
          ? localToIso(form.closedAt)
          : undefined,

        instrument:
          form.instrument.trim(),

        direction,

        result,

        grade: form.grade || undefined,

        entry:
          form.entry === ''
            ? undefined
            : Number(form.entry),

        exit:
          form.exit === ''
            ? undefined
            : Number(form.exit),

        pnl:
          form.pnl === ''
            ? undefined
            : Number(form.pnl),

        r: Number(form.r),

        durationMin:
          computeDurationMin(
            form.openedAt,
            form.closedAt,
          ) ??
          (form.durationMin === ''
            ? 0
            : Number(form.durationMin)),

        templateData:
          form.templateData,

        notes:
          form.notes.trim() ||
          undefined,

      } satisfies Omit<
        Trade,
        'id' | 'createdAt' | 'updatedAt'
      >;

      if (isEdit && id) {
        await persistEditedTradePhotos(
          id,
          originalPhotos,
          form.photos,
          async (photos) => {
            await update(id, {
              ...payload,
              photos,
            });
          },
        );

        navigate(
          `/journal/${id}`,
        );
      } else {
        const created = await create({
          ...payload,
          photos: undefined,
        });

        const persistedPhotos =
          await persistTradePhotos(created.id, form.photos);

        await update(created.id, {
          photos: persistedPhotos,
        });

        navigate(
          `/journal/${created.id}`,
        );
      }

      await refresh();
    } catch (err) {
      setError(
        (err as Error).message,
      );
    } finally {
      setSaving(false);
    }
  }

  function focusField(key: string) {
    const field = formRef.current?.querySelector<HTMLElement>(`[data-field-key="${CSS.escape(key)}"]`);
    if (!field) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    field.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    const control = field.querySelector<HTMLElement>('input:not([disabled]), button[role="combobox"], [role="radiogroup"] button:not([disabled]), textarea');
    control?.focus({ preventScroll: true });
  }

  async function onDelete() {
    if (!isEdit || !id) return;

    if (
      !window.confirm(
        'Delete this trade? This cannot be undone.',
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      await remove(id);
      navigate('/journal');
    } finally {
      setDeleting(false);
    }
  }

  function nextNumber(): number {
    const max = trades.reduce(
      (maximum, trade) =>
        Math.max(
          maximum,
          trade.number ?? 0,
        ),
      0,
    );

    return isEdit
      ? trades.find(
          (trade) => trade.id === id,
        )?.number ?? max + 1
      : max + 1;
  }

  const groups = useMemo(() => {
    return groupTemplateFields(template.fields);
  }, [template]);

  const photoSlotCount = Math.max(template.photoCount ?? 3, (form.photos.additional?.length ?? 0) + ((form.photos.additional?.length ?? 0) > 0 ? 3 : 0));

  return (
    <form
      ref={formRef}
      onSubmit={onSave}
      className="space-y-6"
      noValidate
    >
      <PageHeader
        title={
          isEdit
            ? 'Edit trade'
            : 'New trade'
        }
        description={
          isEdit
            ? `Editing ${formatDateLong(
                form.openedAt,
              )} · ${
                form.instrument || 'Trade'
              } ${
                form.direction || ''
              }`
            : 'Capture the trade while it’s fresh.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              leftIcon={
                <X className="h-4 w-4" />
              }
            >
              <Link to="/journal">
                Cancel
              </Link>
            </Button>

            {isEdit ? (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={deleting}
                leftIcon={
                  <Trash2 className="h-4 w-4" />
                }
              >
                {deleting
                  ? 'Deleting…'
                  : 'Delete'}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div role="alert" className="rounded-md border border-line bg-bg-3 px-3 py-2 text-sm text-fg">
          {error}
        </div>
      ) : null}

      {Object.keys(fieldErrors).length > 0 && !error ? (
        <div ref={errorSummaryRef} role="alert" aria-live="assertive" aria-labelledby="trade-error-summary-title" tabIndex={-1} className="rounded-xl border border-line bg-bg-3 px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-focus/50">
          <h2 id="trade-error-summary-title" className="font-semibold text-fg">Review {Object.keys(fieldErrors).length} field{Object.keys(fieldErrors).length === 1 ? '' : 's'} before saving</h2>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
            {Object.entries(fieldErrors).map(([key, message]) => <li key={key}><button type="button" onClick={() => focusField(key)} className="text-left text-fg-muted underline decoration-line-strong underline-offset-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50">{message}</button></li>)}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <Loader size="sm" title="Loading trade…" className="min-h-40" />
      ) : (
        <div className="space-y-6 pb-6">
          {/* =========================
              WHEN & WHAT
          ========================== */}
          <Card>
            <CardHeader>
              <CardTitle>
                When & what
              </CardTitle>
            </CardHeader>

            <CardBody className="space-y-4">
              <FormSection title="Basics">
                <FormField
                  label="Opened at"
                  required
                  fieldKey="openedAt"
                  invalid={Boolean(fieldErrors.openedAt)}
                >
                  <DateTimePicker
                    value={form.openedAt}
                    onChange={(value) => patch('openedAt', value)}
                    aria-label="Opened at"
                  />

                  <FieldError
                    message={
                      fieldErrors.openedAt
                    }
                  />
                </FormField>

                <FormField
                  label="Closed at"
                  hint="Leave blank for an open trade."
                  fieldKey="closedAt"
                  invalid={Boolean(fieldErrors.closedAt)}
                >
                  <DateTimePicker
                    value={form.closedAt}
                    onChange={(value) => patch('closedAt', value)}
                    placeholder="Leave blank"
                    aria-label="Closed at"
                    clearable
                  />

                  <FieldError
                    message={
                      fieldErrors.closedAt
                    }
                  />
                </FormField>

                <FormField
                  label="Instrument"
                  required
                  fieldKey="instrument"
                  invalid={Boolean(fieldErrors.instrument)}
                >
                  <Select
                    value={form.instrument}
                    onChange={(e) =>
                      patch(
                        'instrument',
                        e.target.value,
                      )
                    }
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select instrument
                    </option>

                    <option value="GC">
                      GC
                    </option>

                    <option value="SI">
                      SI
                    </option>

                    <option value="NQ">
                      NQ
                    </option>

                    <option value="ES">
                      ES
                    </option>

                    <option value="YM">
                      YM
                    </option>

                    <option value="CL">
                      CL
                    </option>

                    <option value="RB">
                      RB
                    </option>

                    <option value="HO">
                      HO
                    </option>

                    <option value="EURUSD">
                      EURUSD
                    </option>

                    <option value="GBPUSD">
                      GBPUSD
                    </option>
                  </Select>

                  <FieldError
                    message={
                      fieldErrors.instrument
                    }
                  />
                </FormField>

                <FormField
                  label="Direction"
                  required
                  fieldKey="direction"
                  invalid={Boolean(fieldErrors.direction)}
                >
                  <Segmented<TradeDirection | ''>
                    value={form.direction}
                    onChange={(value) =>
                      patch(
                        'direction',
                        value,
                      )
                    }
                    options={[
                      {
                        value: 'long',
                        label: 'Long',
                        tone: 'win',
                      },
                      {
                        value: 'short',
                        label: 'Short',
                        tone: 'loss',
                      },
                    ]}
                    fullWidth
                  />

                  <FieldError
                    message={
                      fieldErrors.direction
                    }
                  />
                </FormField>
              </FormSection>

              {/* =========================
                  RESULT
              ========================== */}
              <FormSection title="Result">
                <FormField
                  label="Trade grade"
                  hint="Optional. Rate execution quality, regardless of whether the trade won or lost."
                >
                  <Segmented<TradeGrade | ''>
                    value={form.grade}
                    onChange={(grade) => patch('grade', grade)}
                    options={[
                      { value: 'A+', label: 'A+' },
                      { value: 'A', label: 'A' },
                      { value: 'B', label: 'B' },
                      { value: 'C', label: 'C' },
                    ]}
                    fullWidth
                  />
                </FormField>

                <FormField
                  label="Outcome"
                  required
                  fieldKey="result"
                  invalid={Boolean(fieldErrors.result)}
                >
                  <Segmented<TradeResult | ''>
                    value={form.result}
                    onChange={
                      handleResultChange
                    }
                    options={[
                      {
                        value: 'win',
                        label: 'Win',
                        tone: 'win',
                      },
                      {
                        value: 'be',
                        label: 'BE',
                        tone: 'neutral',
                      },
                      {
                        value: 'loss',
                        label: 'Loss',
                        tone: 'loss',
                      },
                    ]}
                    fullWidth
                  />

                  <FieldError
                    message={
                      fieldErrors.result
                    }
                  />
                </FormField>

                <FormField
                  label="Realized R"
                  required
                  fieldKey="r"
                  invalid={Boolean(fieldErrors.r)}
                  hint={
                    form.result === 'be'
                      ? 'Automatically set to 0 for break-even trades.'
                      : form.result === 'win'
                      ? 'Must be positive for a winning trade.'
                      : form.result === 'loss'
                      ? 'Must be negative for a losing trade.'
                      : 'Enter the actual realized R.'
                  }
                >
                  <Input
                    type="number"
                    step="0.1"
                    value={form.r}
                    onChange={(e) =>
                      handleRChange(
                        e.target.value,
                      )
                    }
                    disabled={
                      form.result === 'be'
                    }
                    readOnly={
                      form.result === 'be'
                    }
                    placeholder={
                      form.result === 'be'
                        ? '0'
                        : 'e.g. 2.5'
                    }
                  />

                  <FieldError
                    message={
                      fieldErrors.r
                    }
                  />
                </FormField>

                <FormField
                  label="Entry"
                  hint="Actual price at which the trade was opened."
                  required
                  fieldKey="entry"
                  invalid={Boolean(fieldErrors.entry)}
                >
                  <Input
                    type="number"
                    step="any"
                    value={form.entry}
                    onChange={(e) =>
                      patch(
                        'entry',
                        e.target.value,
                      )
                    }
                    placeholder="e.g. 1.2345"
                  />

                  <FieldError message={fieldErrors.entry} />

                </FormField>

                 <FormField
                  label="Exit"
                  hint="Actual price at which the trade was closed."
                  required
                  fieldKey="exit"
                  invalid={Boolean(fieldErrors.exit)}
                >
                  <Input
                    type="number"
                    step="any"
                    value={form.exit}
                    onChange={(e) =>
                      patch(
                        'exit',
                        e.target.value,
                      )
                    }
                    placeholder="e.g. 1.2345"
                  />

                  <FieldError message={fieldErrors.exit} />

                </FormField>

                <FormField
                  label="P&L"
                  hint="Profit or loss from the trade."
                  required
                  fieldKey="pnl"
                  invalid={Boolean(fieldErrors.pnl)}
                >
                  <Input
                    type="number"
                    step="any"
                    value={form.pnl}
                    onChange={(e) =>
                      patch(
                        'pnl',
                        e.target.value,
                      )
                    }
                    placeholder="e.g. 50$"
                  />

                  <FieldError message={fieldErrors.pnl} />

                </FormField>

                <FormField
                  label="Duration (min)"
                  hint="Auto-calculated from opened/closed if both are set."
                >
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={form.durationMin}
                    onChange={(e) =>
                      patch(
                        'durationMin',
                        e.target.value,
                      )
                    }
                  />
                </FormField>
              </FormSection>
            </CardBody>
          </Card>

          {/* =========================
              TEMPLATE / SETUP
          ========================== */}
          {groups.map(([group, fields]) => {
            const booleanFields = fields.filter((field) => field.type === 'boolean');
            const standardFields = fields.filter((field) => field.type !== 'boolean');
            const renderField = (field: (typeof fields)[number]) => {
              const isSetup = field.key === 'entry';

              return (
                <FormField
                  key={field.key}
                  label={field.label}
                  required={isSetup}
                  fieldKey={isSetup ? 'setup' : undefined}
                  invalid={isSetup && Boolean(fieldErrors.setup)}
                >
                  {field.type === 'enum' ? (
                    <Select
                      value={String(form.templateData[field.key] ?? '')}
                      onChange={(event) => patchTemplate(field.key, event.target.value)}
                    >
                      <option value="">—</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </Select>
                  ) : field.type === 'number' ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={String(form.templateData[field.key] ?? '')}
                      onChange={(event) => patchTemplate(field.key, event.target.value)}
                    />
                  ) : (
                    <Input
                      value={String(form.templateData[field.key] ?? '')}
                      onChange={(event) => patchTemplate(field.key, event.target.value)}
                    />
                  )}

                  {isSetup && <FieldError message={fieldErrors.setup} />}
                </FormField>
              );
            };

            return (
              <Card key={group}>
                <CardHeader>
                  <CardTitle>{group}</CardTitle>
                </CardHeader>

                <CardBody>
                  <FormSection title={group}>
                    {standardFields.map(renderField)}
                  </FormSection>
                  {booleanFields.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {booleanFields.map((field) => (
                        <FormField key={field.key} label={field.label}>
                          <AnimatedCheckBox
                            aria-label={field.label}
                            checked={form.templateData[field.key] === true || form.templateData[field.key] === 'YES' || form.templateData[field.key] === 'true'}
                            onChange={(event) => patchTemplate(field.key, event.target.checked)}
                          />
                        </FormField>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}

          <Card>
            <CardHeader><CardTitle>Mistakes</CardTitle></CardHeader>
            <CardBody><FormSection title="Mistake / filter"><FormField label="Mistake / filter" hint="Track execution mistakes consistently across every strategy.">
              <Select value={String(form.templateData.mistake ?? '')} onChange={(event) => patchTemplate('mistake', event.target.value)}>
                <option value="">Select…</option>
                {COMMON_MISTAKES.map((mistake) => <option key={mistake} value={mistake}>{mistake}</option>)}
              </Select>
            </FormField></FormSection></CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardBody><textarea aria-label="Notes" value={form.notes} onChange={(e) => patch('notes', e.target.value)} rows={4} placeholder="What did you see? What worked, what didn’t?" className="w-full rounded-md border border-line bg-bg-1 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-focus/60" /></CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Images</CardTitle></CardHeader>
            <CardBody><div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: photoSlotCount }, (_, index) => <PhotoUploadSlot key={index} label={`Image ${index + 1}`} value={photoAt(form.photos, index)} onChange={(value) => patch('photos', withPhoto(form.photos, index, value))} />)}
            </div></CardBody>
          </Card>

          {/* =========================
              BOTTOM ACTIONS
          ========================== */}
          <div className="-mx-4 flex justify-end gap-3 border-t border-line bg-bg-0 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <Button
              asChild
              variant="ghost"
              leftIcon={
                <X className="h-4 w-4" />
              }
            >
              <Link to="/journal">
                Cancel
              </Link>
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={
                saving || loading
              }
              leftIcon={
                <Save className="h-4 w-4" />
              }
            >
              {saving
                ? 'Saving…'
                : isEdit
                ? 'Save changes'
                : 'Add trade'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

/* =========================================
   INLINE FIELD ERROR
========================================= */

function FieldError({
  message,
}: {
  message?: string;
}) {
  const field = useFormFieldContext();
  if (!message) return null;

  return (
    <p id={field?.errorId} aria-live="polite" className="mt-1.5 text-xs font-medium text-fg-muted">
      {message}
    </p>
  );
}

/* =========================================
   DURATION
========================================= */

function computeDurationMin(
  openedLocal: string,
  closedLocal: string,
): number | null {
  if (!openedLocal || !closedLocal) {
    return null;
  }

  const opened =
    new Date(openedLocal).getTime();

  const closed =
    new Date(closedLocal).getTime();

  if (
    !Number.isFinite(opened) ||
    !Number.isFinite(closed) ||
    closed < opened
  ) {
    return null;
  }

  return Math.round(
    (closed - opened) / 60000,
  );
}

/* =========================================
   PHOTO UPLOAD
========================================= */

function PhotoUploadSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef =
    useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function resolvePreview() {
      if (!value) {
        setPreviewUrl(undefined);
        return;
      }

      setPreviewUrl(undefined);

      try {
        const resolved =
          await resolveTradePhotoUrl(value);

        if (!cancelled) {
          setPreviewUrl(resolved);
        }
      } catch (error) {
        console.error(
          `Unable to resolve ${label} trade screenshot preview:`,
          error,
        );

        if (!cancelled) {
          setPreviewUrl(undefined);
        }
      }
    }

    void resolvePreview();

    return () => {
      cancelled = true;
    };
  }, [value, label]);

  function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () =>
      onChange(
        reader.result as string,
      );

    reader.readAsDataURL(file);
  }

  function handleDrop(
    e: React.DragEvent,
  ) {
    e.preventDefault();

    const file =
      e.dataTransfer.files?.[0];

    if (
      !file ||
      !file.type.startsWith('image/')
    ) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () =>
      onChange(
        reader.result as string,
      );

    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
        {label}
      </span>

      {value ? (
        <div className="group relative aspect-video overflow-hidden rounded-lg border border-line bg-bg-1">
          <img
            src={previewUrl}
            alt={label}
            className="h-full w-full object-contain"
          />

          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg-0/70 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={
                <Upload className="h-3 w-3" />
              }
              onClick={() =>
                inputRef.current?.click()
              }
            >
              Replace
            </Button>

            <Button
              type="button"
              size="sm"
              variant="danger"
              leftIcon={
                <ImageOff className="h-3 w-3" />
              }
              onClick={() =>
                onChange('')
              }
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            inputRef.current?.click()
          }
          onDragOver={(e) =>
            e.preventDefault()
          }
          onDrop={handleDrop}
          className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-bg-1 text-fg-dim transition-colors hover:border-accent/50 hover:bg-bg-2"
        >
          <Upload className="h-5 w-5" />

          <span className="text-xs">
            Click or drag image
          </span>
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
