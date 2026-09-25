import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Trash2, X, Upload, ImageOff } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  FormField,
  FormSection,
  Segmented,
  Select,
} from '@/components/ui/Select';

import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { getTemplate } from '@/domain/templates/registry';
import type {
  Trade,
  TemplateField,
  TradeDirection,
  TradeResult,
} from '@/domain/models/trade';

import { tradeRepository } from '@/data/supabaseTradeRepository';
import { formatDateLong } from '@/lib/format';

interface FormState {
  openedAt: string;
  closedAt: string;
  instrument: string;
  direction: TradeDirection | '';
  result: TradeResult | '';
  r: string;
  plannedRR: string;
  durationMin: string;
  templateData: Record<string, string>;
  notes: string;
  photos: {
    htf: string;
    itf: string;
    ltf: string;
  };
}

type FieldErrors = Partial<
  Record<
    | 'openedAt'
    | 'instrument'
    | 'direction'
    | 'result'
    | 'r'
    | 'setup'
    | 'plannedRR'
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
  r: '',
  plannedRR: '',
  durationMin: '',
  templateData: {},
  notes: '',
  photos: {
    htf: '',
    itf: '',
    ltf: '',
  },
};

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
    r: String(t.r),
    plannedRR:
      t.plannedRR != null ? String(t.plannedRR) : '',
    durationMin: String(t.durationMin),

    templateData: Object.fromEntries(
      Object.entries(t.templateData).map(([key, value]) => [
        key,
        value == null ? '' : String(value),
      ]),
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

  const template = useMemo(() => getTemplate(), []);

  const [form, setForm] =
    useState<FormState>(DEFAULTS);

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

  /*
   * Boot store on first mount.
   */
  useEffect(() => {
    bootTradesStore();
  }, []);

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
        setForm(tradeToForm(trade));
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
    value: string,
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

    if (
      !form.templateData.entry ||
      form.templateData.entry.trim() === ''
    ) {
      errors.setup =
        'Setup is required.';
    }

    if (
      form.plannedRR &&
      Number(form.plannedRR) <= 0
    ) {
      errors.plannedRR =
        'Planned R:R must be greater than 0.';
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

        r: Number(form.r),

        plannedRR: form.plannedRR
          ? Number(form.plannedRR)
          : undefined,

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

        photos: {
          htf:
            form.photos.htf ||
            undefined,

          itf:
            form.photos.itf ||
            undefined,

          ltf:
            form.photos.ltf ||
            undefined,
        },
      } satisfies Omit<
        Trade,
        'id' | 'createdAt' | 'updatedAt'
      >;

      if (isEdit && id) {
        await update(id, payload);

        navigate(
          `/journal/${id}`,
        );
      } else {
        const created =
          await create(payload);

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
    const map = new Map<
      string,
      TemplateField[]
    >();

    for (const field of template.fields) {
      if (!map.has(field.group)) {
        map.set(
          field.group,
          [],
        );
      }

      map
        .get(field.group)!
        .push(field);
    }

    return Array.from(
      map.entries(),
    );
  }, [template]);

  return (
    <form
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
        <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-fg-muted">
          Loading trade…
        </div>
      ) : (
        <div className="space-y-6">
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
                >
                  <Input
                    type="datetime-local"
                    value={form.openedAt}
                    onChange={(e) =>
                      patch(
                        'openedAt',
                        e.target.value,
                      )
                    }
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
                >
                  <Input
                    type="datetime-local"
                    value={form.closedAt}
                    onChange={(e) =>
                      patch(
                        'closedAt',
                        e.target.value,
                      )
                    }
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
                  label="Outcome"
                  required
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
                  label="Planned R:R"
                  hint="R-multiple the trade was sized for."
                >
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.plannedRR}
                    onChange={(e) =>
                      patch(
                        'plannedRR',
                        e.target.value,
                      )
                    }
                    placeholder="e.g. 2"
                  />

                  <FieldError
                    message={
                      fieldErrors.plannedRR
                    }
                  />
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
          {groups.map(
            ([group, fields]) => (
              <Card key={group}>
                <CardHeader>
                  <CardTitle>
                    {group}
                  </CardTitle>
                </CardHeader>

                <CardBody>
                  <FormSection
                    title={group}
                  >
                    {fields.map((field) => {
                      const isSetup =
                        field.key ===
                        'entry';

                      return (
                        <FormField
                          key={field.key}
                          label={field.label}
                          required={
                            isSetup
                          }
                        >
                          {field.type ===
                          'boolean' ? (
                            <Segmented
                              value={
                                form
                                  .templateData[
                                  field.key
                                ] ?? ''
                              }
                              onChange={(
                                value,
                              ) =>
                                patchTemplate(
                                  field.key,
                                  value,
                                )
                              }
                              options={[
                                {
                                  value:
                                    'YES',
                                  label:
                                    'YES',
                                  tone:
                                    'win',
                                },
                                {
                                  value:
                                    'NO',
                                  label:
                                    'NO',
                                },
                              ]}
                              fullWidth
                            />
                          ) : field.type ===
                            'enum' ? (
                            <Select
                              value={
                                form
                                  .templateData[
                                  field.key
                                ] ?? ''
                              }
                              onChange={(
                                e,
                              ) =>
                                patchTemplate(
                                  field.key,
                                  e.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                —
                              </option>

                              {(
                                field.options ??
                                []
                              ).map(
                                (option) => (
                                  <option
                                    key={
                                      option
                                    }
                                    value={
                                      option
                                    }
                                  >
                                    {
                                      option
                                    }
                                  </option>
                                ),
                              )}
                            </Select>
                          ) : field.type ===
                            'number' ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={
                                form
                                  .templateData[
                                  field.key
                                ] ?? ''
                              }
                              onChange={(
                                e,
                              ) =>
                                patchTemplate(
                                  field.key,
                                  e.target
                                    .value,
                                )
                              }
                            />
                          ) : (
                            <Input
                              value={
                                form
                                  .templateData[
                                  field.key
                                ] ?? ''
                              }
                              onChange={(
                                e,
                              ) =>
                                patchTemplate(
                                  field.key,
                                  e.target
                                    .value,
                                )
                              }
                            />
                          )}

                          {isSetup ? (
                            <FieldError
                              message={
                                fieldErrors.setup
                              }
                            />
                          ) : null}
                        </FormField>
                      );
                    })}
                  </FormSection>
                </CardBody>
              </Card>
            ),
          )}

          {/* =========================
              SCREENSHOTS
          ========================== */}
          <Card>
            <CardHeader>
              <CardTitle>
                Screenshots
              </CardTitle>
            </CardHeader>

            <CardBody>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <PhotoUploadSlot
                  label="HTF"
                  value={form.photos.htf}
                  onChange={(value) =>
                    patch('photos', {
                      ...form.photos,
                      htf: value,
                    })
                  }
                />

                <PhotoUploadSlot
                  label="ITF"
                  value={form.photos.itf}
                  onChange={(value) =>
                    patch('photos', {
                      ...form.photos,
                      itf: value,
                    })
                  }
                />

                <PhotoUploadSlot
                  label="LTF"
                  value={form.photos.ltf}
                  onChange={(value) =>
                    patch('photos', {
                      ...form.photos,
                      ltf: value,
                    })
                  }
                />
              </div>
            </CardBody>
          </Card>

          {/* =========================
              NOTES
          ========================== */}
          <Card>
            <CardHeader>
              <CardTitle>
                Notes
              </CardTitle>
            </CardHeader>

            <CardBody>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  patch(
                    'notes',
                    e.target.value,
                  )
                }
                rows={4}
                placeholder="What did you see? What worked, what didn’t?"
                className="w-full rounded-md border border-line bg-bg-1 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
            </CardBody>
          </Card>

          {/* =========================
              BOTTOM ACTIONS
          ========================== */}
          <div className="flex justify-end space-x-3 pt-4">
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
  if (!message) return null;

  return (
    <p className="mt-1.5 text-xs font-medium text-loss">
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
            src={value}
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