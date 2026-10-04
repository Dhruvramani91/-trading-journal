import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
} from 'lucide-react';

import { accountRepository } from '@/data/supabaseAccountRepository';
import type {
  Account,
  AccountRuleMode,
  AccountType,
  AccountPhase,
  AccountResult,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/domain/models/account';
import {
  getAccountSizes,
  getPhaseOptions,
  getAccountResultOptions,
  getDefaultAccountRules,
  getPhaseLabel,
  isValidAccountPhase,
} from '@/domain/accounts/accountCalculations';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Segmented, Select } from '@/components/ui/Select';

const TYPE_LABEL: Record<AccountType, string> = {
  futures: 'Futures',
  cfd: 'CFD',
};

const TAB_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'futures', label: 'Futures' },
  { value: 'cfd', label: 'CFD' },
];

const RULE_MODE_OPTIONS: { value: AccountRuleMode; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'custom', label: 'Custom' },
];

type FieldKey = 'name' | 'profitTarget' | 'maxDrawdown';
type FieldErrors = Partial<Record<FieldKey, string>>;

export interface RuleInputs {
  profitTarget: string;
  maxDrawdown: string;
}

export interface AccountFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  account: Account | null;
  defaultType: AccountType;
  onClose: () => void;
  onSaved: (mode: 'create' | 'edit') => void;
}

interface SizeOption {
  value: number;
  label: string;
}

export function formatSignedMoney(value: number): string {
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return `-${formatMoney(Math.abs(value))}`;
  return formatMoney(0);
}

function money(value: number | null | undefined): string {
  if (value == null) return '—';
  return formatMoney(value);
}

function toNumberOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function positiveError(value: string, label: string): string | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return `${label} must be greater than 0.`;
  }
  return undefined;
}

function validateForm(
  name: string,
  rules: RuleInputs,
  checkRules: boolean
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) errors.name = 'Enter an account name.';

  if (checkRules) {
    const profit = positiveError(rules.profitTarget, 'Profit target');
    if (profit) errors.profitTarget = profit;

    const drawdown = positiveError(rules.maxDrawdown, 'Max drawdown');
    if (drawdown) errors.maxDrawdown = drawdown;
  }

  return errors;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function defaultRuleInputs(type: AccountType, size: number, phase: AccountPhase): RuleInputs {
  const d = getDefaultAccountRules(type, size, phase);
  return {
    profitTarget: d.profitTarget != null ? String(d.profitTarget) : '',
    maxDrawdown: d.maxDrawdown != null ? String(d.maxDrawdown) : '',
  };
}

function sameRules(a: RuleInputs, b: RuleInputs): boolean {
  return (
    a.profitTarget === b.profitTarget &&
    a.maxDrawdown === b.maxDrawdown
  );
}

function inputClass(hasError: boolean, extra = ''): string {
  return cn(
    'h-9 w-full rounded-lg border bg-bg-2 px-3.5 text-sm text-fg',
    'transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
    'disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-loss/60 focus:ring-loss/30'
      : 'border-line hover:border-line-strong',
    extra
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className={cn('flex flex-col gap-1.5', className)}>
      <span className="block text-xs font-semibold text-fg">
        {label}
        {required ? <span className="text-loss"> *</span> : null}
      </span>

      <div className="relative">{children}</div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-loss">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-2xs text-fg-dim">
          {hint}
        </p>
      ) : null}
    </label>
  );
}

function RuleBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-2 px-4 py-3">
      <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-bold text-fg">{value}</div>
    </div>
  );
}

function phaseOptionsForType(type: AccountType): { value: AccountPhase; label: string }[] {
  return getPhaseOptions(type);
}

function sizeOptionsForType(type: AccountType): SizeOption[] {
  return getAccountSizes(type);
}

export function AccountForm({
  open,
  mode,
  account,
  defaultType,
  onClose,
  onSaved,
}: AccountFormProps) {
  const uid = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(defaultType);
  const [accountSize, setAccountSize] = useState<number>(0);
  const [phase, setPhase] = useState<AccountPhase>('evaluation');
  const [result, setResult] = useState<AccountResult>('active');
  const [ruleMode, setRuleMode] = useState<AccountRuleMode>('standard');
  const [custom, setCustom] = useState<RuleInputs>({ profitTarget: '', maxDrawdown: '' });

  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isStandard = ruleMode === 'standard';
  const effectiveRules = isStandard ? defaultRuleInputs(accountType, accountSize, phase) : custom;
  const errors = validateForm(name, effectiveRules, !isStandard);

  const currentPhaseOptions = useMemo(() => phaseOptionsForType(accountType), [accountType]);
  const currentSizeOptions = useMemo(() => sizeOptionsForType(accountType), [accountType]);
  const resultOptions = useMemo(() => getAccountResultOptions(), []);

  function visibleError(key: FieldKey): string | undefined {
    return submitted || touched[key] ? errors[key] : undefined;
  }

  function touch(key: FieldKey) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  const sizes = useMemo(() => {
    const base = currentSizeOptions;
    if (base.some((size) => size.value === accountSize)) return base;
    return [
      ...base,
      { value: accountSize, label: `$${accountSize.toLocaleString()}` },
    ].sort((a, b) => a.value - b.value);
  }, [currentSizeOptions, accountSize]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && account) {
      setName(account.name);
      setAccountType(account.accountType);
      setAccountSize(account.accountSize);
      setPhase(account.phase);
      setResult(account.result);
      setRuleMode(account.ruleMode);

      const defaults = defaultRuleInputs(account.accountType, account.accountSize, account.phase);
      setCustom({
        profitTarget:
          account.profitTarget != null ? String(account.profitTarget) : defaults.profitTarget,
        maxDrawdown:
          account.maxDrawdown != null ? String(account.maxDrawdown) : defaults.maxDrawdown,
      });
    } else {
      setName('');
      setAccountType(defaultType);
      const initialSizes = sizeOptionsForType(defaultType);
      setAccountSize(initialSizes[0]?.value ?? 0);
      const initialPhases = phaseOptionsForType(defaultType);
      setPhase(initialPhases[0]?.value ?? 'evaluation');
      setResult('active');
      setRuleMode('standard');
      setCustom(defaultRuleInputs(defaultType, initialSizes[0]?.value ?? 0, initialPhases[0]?.value ?? 'evaluation'));
    }

    setTouched({});
    setSubmitted(false);
    setSubmitError(null);
  }, [open, mode, account, defaultType]);

  function handleTypeChange(type: AccountType) {
    if (type === accountType) return;

    const nextSizes = sizeOptionsForType(type);
    const nextPhases = phaseOptionsForType(type);

    if (!nextSizes.some((size) => size.value === accountSize)) {
      setAccountSize(nextSizes[0]?.value ?? 0);
    }
    if (!nextPhases.some((p) => p.value === phase)) {
      setPhase(nextPhases[0]?.value ?? 'evaluation');
    }

    if (sameRules(custom, defaultRuleInputs(accountType, accountSize, phase))) {
      setCustom(defaultRuleInputs(type, nextSizes[0]?.value ?? 0, nextPhases[0]?.value ?? 'evaluation'));
    }

    setAccountType(type);
  }

  function handleSizeChange(size: number) {
    if (size === accountSize) return;

    const wasStandard = isStandard;
    const prevDefaults = defaultRuleInputs(accountType, accountSize, phase);
    const nextDefaults = defaultRuleInputs(accountType, size, phase);

    setAccountSize(size);

    if (wasStandard && sameRules(custom, prevDefaults)) {
      setCustom(nextDefaults);
    }
  }

  function handlePhaseChange(newPhase: AccountPhase) {
    if (newPhase === phase) return;

    const wasStandard = isStandard;
    const prevDefaults = defaultRuleInputs(accountType, accountSize, phase);
    const nextDefaults = defaultRuleInputs(accountType, accountSize, newPhase);

    setPhase(newPhase);

    if (wasStandard && sameRules(custom, prevDefaults)) {
      setCustom(nextDefaults);
    }
  }

  function updateCustom(key: keyof RuleInputs, value: string) {
    setCustom((prev) => ({ ...prev, [key]: value }));
  }

  function focusFirstError(found: FieldErrors) {
    const order: FieldKey[] = ['name', 'profitTarget', 'maxDrawdown'];
    const first = order.find((key) => found[key]);
    if (first) document.getElementById(`${uid}-${first}`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSubmitError(null);
    setSubmitted(true);

    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    if (!accountSize || accountSize <= 0) {
      setSubmitError('Choose an account size.');
      return;
    }

    if (!isValidAccountPhase(accountType, phase)) {
      setSubmitError(`Phase "${phase}" is not valid for ${TYPE_LABEL[accountType]} accounts.`);
      return;
    }

    setSaving(true);

    try {
      const input = {
        name: name.trim(),
        accountType,
        phase,
        result,
        accountSize,
        ruleMode,
        // Persist the effective rules. For standard accounts this stores the
        // configured defaults for the type/size/phase so the saved account rule
        // values are authoritative and no longer NULL. Custom accounts store
        // exactly what the user entered.
        profitTarget: toNumberOrNull(effectiveRules.profitTarget),
        maxDrawdown: toNumberOrNull(effectiveRules.maxDrawdown),
      };

      if (mode === 'create') {
        await accountRepository.create(input as CreateAccountInput);
      } else if (account) {
        await accountRepository.update(account.id, input as UpdateAccountInput);
      }

      onSaved(mode);
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err, 'Couldn\'t save the account. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  const nameId = `${uid}-name`;

  const showProfitTarget = !(accountType === 'cfd' && phase === 'funded');

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && !saving) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-0/80 backdrop-blur-sm" />

        <Dialog.Content
          onOpenAutoFocus={(event) => {
            if (mode === 'create') {
              event.preventDefault();
              nameRef.current?.focus();
            }
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2',
            'flex max-h-[calc(100dvh-32px)] flex-col overflow-visible',
            'rounded-xl border border-line bg-bg-1 shadow-pop outline-none'
          )}
          data-select-portal
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-bold text-fg">
                {mode === 'create' ? `Add ${TYPE_LABEL[accountType]} account` : 'Edit account'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-fg-muted">
                {mode === 'create'
                  ? 'Set the size, phase, and rules for this trading account.'
                  : 'Update this account\'s settings.'}
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                disabled={saving}
                aria-label="Close"
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim',
                  'hover:text-fg hover:bg-bg-3 transition-colors',
                  'disabled:opacity-40'
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {submitError ? (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss"
                >
                  {submitError}
                </div>
              ) : null}

              {mode === 'create' ? (
                <div className="mb-5">
                  <Segmented
                    value={accountType}
                    onChange={handleTypeChange}
                    options={TAB_OPTIONS}
                    aria-label="Account type"
                    disabled={saving}
                  />
                </div>
              ) : null}

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={nameId}
                    className="block text-xs font-semibold text-fg mb-1.5"
                  >
                    Account name <span className="text-loss">*</span>
                  </label>
                  <Input
                    ref={nameRef}
                    id={nameId}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => touch('name')}
                    placeholder="e.g. My 50K account"
                    disabled={saving}
                    invalid={Boolean(visibleError('name'))}
                    aria-describedby={visibleError('name') ? `${nameId}-error` : undefined}
                    aria-invalid={visibleError('name') ? true : undefined}
                  />
                  {visibleError('name') ? (
                    <p id={`${nameId}-error`} className="mt-1 text-xs text-loss">
                      {visibleError('name')}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label
                      htmlFor={`${uid}-size`}
                      id={`${uid}-size-label`}
                      className="block text-xs font-semibold text-fg mb-1.5"
                    >
                      Account size
                    </label>
                    <Select
                      id={`${uid}-size`}
                      value={accountSize}
                      onChange={(event) => handleSizeChange(Number(event.target.value))}
                      disabled={saving}
                    >
                      {sizes.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor={`${uid}-phase`}
                      id={`${uid}-phase-label`}
                      className="block text-xs font-semibold text-fg mb-1.5"
                    >
                      Phase
                    </label>
                    <Select
                      id={`${uid}-phase`}
                      value={phase}
                      onChange={(event) => handlePhaseChange(event.target.value as AccountPhase)}
                      disabled={saving}
                    >
                      {currentPhaseOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                  <label
                    htmlFor={`${uid}-result`}
                    id={`${uid}-result-label`}
                    className="block text-xs font-semibold text-fg mb-1.5"
                  >
                    Account result
                  </label>
                  <Select
                    id={`${uid}-result`}
                    value={result}
                    onChange={(event) => setResult(event.target.value as AccountResult)}
                    disabled={saving}
                  >
                    {resultOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-fg">Rules</div>
                <Segmented
                  value={ruleMode}
                  onChange={setRuleMode}
                  options={RULE_MODE_OPTIONS}
                  aria-label="Rule set"
                  disabled={saving}
                  className="w-full"
                />
              </div>

              {isStandard ? (
                <>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {showProfitTarget && (
                      <RuleBox label="Profit target" value={money(toNumberOrNull(effectiveRules.profitTarget))} />
                    )}
                    <RuleBox label="Max drawdown" value={money(toNumberOrNull(effectiveRules.maxDrawdown))} />
                    {!showProfitTarget && (
                        <div className="sm:col-span-2 text-center text-sm text-fg-muted py-2">
                        No profit target for CFD Funded accounts
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-fg-muted">
                    Standard values for {TYPE_LABEL[accountType]} {getPhaseLabel(phase)} accounts. Switch to Custom to set your own.
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {showProfitTarget && (
                      <Field
                        id={`${uid}-profitTarget`}
                        label="Profit target"
                        error={visibleError('profitTarget')}
                        hint="Leave empty for no target (e.g., CFD Funded)."
                      >
                        <input
                          id={`${uid}-profitTarget`}
                          type="number"
                          value={custom.profitTarget}
                          onChange={(e) => updateCustom('profitTarget', e.target.value)}
                          onBlur={() => touch('profitTarget')}
                          placeholder="3000"
                          disabled={saving}
                          aria-invalid={visibleError('profitTarget') ? true : undefined}
                          className={inputClass(Boolean(visibleError('profitTarget')))}
                        />
                      </Field>
                    )}

                    <Field
                      id={`${uid}-maxDrawdown`}
                      label="Max drawdown"
                      error={visibleError('maxDrawdown')}
                    >
                      <input
                        id={`${uid}-maxDrawdown`}
                        type="number"
                        value={custom.maxDrawdown}
                        onChange={(e) => updateCustom('maxDrawdown', e.target.value)}
                        onBlur={() => touch('maxDrawdown')}
                        placeholder="2500"
                        disabled={saving}
                        aria-invalid={visibleError('maxDrawdown') ? true : undefined}
                        className={inputClass(Boolean(visibleError('maxDrawdown')))}
                      />
                    </Field>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setCustom(defaultRuleInputs(accountType, accountSize, phase))}
                    className={cn(
                      'mt-4 rounded-lg px-1 py-1 text-xs font-semibold text-fg-muted underline underline-offset-2 hover:text-fg',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-1'
                    )}
                  >
                    Reset to standard values
                  </button>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-4 bg-bg-2/50">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? 'Saving…' : mode === 'create' ? 'Add account' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
