import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Globe2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { accountRepository } from '@/data/supabaseAccountRepository';
import { accountTradeAttachmentRepository } from '@/data/supabaseAccountTradeAttachmentRepository';
import { accountTradeSummaryRepository } from '@/data/supabaseAccountTradeSummaryRepository';
import { useTradesStore } from '@/store/tradesStore';
import { useAuthStore } from '@/store/authStore';
import {
  calculateAccountSummary,
  enrichAttachmentsWithTradePnl,
} from '@/domain/accounts/accountCalculations';
import {
  getPhaseLabel,
  getPhaseTone,
  getResultLabel,
  getResultTone,
} from '@/domain/accounts/accountCalculations';
import { AccountForm, errorMessage, formatSignedMoney } from './AccountForm';
import type { Account, AccountType } from '@/domain/models/account';
import type { AccountTradeAttachment } from '@/domain/models/accountTradeAttachment';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';

type AccountId = Account['id'];

function tradesFromStore(userId: string) {
  const store = useTradesStore.getState();
  if (!store.loaded || store.ownerId !== userId) return null;

  return store.trades.map((trade) => ({
    id: trade.id,
    pnl: trade.pnl ?? null,
    openedAt: trade.openedAt,
  }));
}

async function loadAccountTradeSummaries(userId: string) {
  let store = useTradesStore.getState();
  const cached = tradesFromStore(userId);
  if (cached) return cached;

  if (store.loading) {
    // Concurrent callers share this promise. If the in-flight store request is
    // for another user, its result is rejected below and the scoped query runs.
    await store.load(userId);
    store = useTradesStore.getState();
    const loaded = tradesFromStore(userId);
    if (loaded) return loaded;
  }

  return accountTradeSummaryRepository.listForAccountSummaries(userId);
}

const TYPE_LABEL: Record<AccountType, string> = {
  futures: 'Futures',
  cfd: 'CFD',
};

const TAB_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'futures', label: 'Futures' },
  { value: 'cfd', label: 'CFD' },
];

interface ToastState {
  message: string;
  tone: 'default' | 'error';
  action?: { label: string; onClick: () => void };
}

const TOAST_MS = 5000;
const UNDO_WINDOW_MS = 6000;

function accountSizeLabel(size: number): string {
  if (size >= 1_000_000) return `${size / 1_000_000}M`;
  if (size >= 1_000) return `${size / 1_000}K`;
  return `$${size}`;
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
      <div
        role={toast.tone === 'error' ? 'alert' : 'status'}
        className={cn(
          'pointer-events-auto flex max-w-[480px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg-inverse shadow-pop',
          'bg-bg-3'
        )}
      >
        <span className="min-w-0">{toast.message}</span>

        {toast.action ? (
          <button
            type="button"
            onClick={toast.action.onClick}
            className={cn(
              'shrink-0 rounded-md px-2 py-1 font-bold underline underline-offset-2',
              toast.tone === 'error'
                ? 'text-white/90 hover:bg-white/10'
                : 'text-fg hover:bg-bg-4'
            )}
          >
            {toast.action.label}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className={cn(
            'shrink-0 rounded-md p-1',
            toast.tone === 'error'
              ? 'text-white/70 hover:bg-white/10 hover:text-white'
              : 'text-fg-dim hover:text-fg hover:bg-bg-4'
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function CardMenu({
  accountName,
  onEdit,
  onDelete,
}: {
  accountName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + delta + items.length) % items.length]?.focus();
  }

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={wrapperRef} className="relative z-10">
      <button
        ref={buttonRef}
        type="button"
        title={`More actions for ${accountName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${accountName}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg text-fg-dim',
          'hover:text-fg hover:bg-bg-3 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-1'
        )}
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${accountName}`}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-bg-2 p-1 shadow-pop'
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onEdit)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-fg hover:bg-bg-3',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-2'
            )}
          >
            <Pencil className="h-4 w-4 text-fg-dim" aria-hidden="true" />
            Edit account
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onDelete)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-fg-muted hover:bg-bg-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-2'
            )}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete account
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccountCard({
  account,
  stats,
  statsAvailable,
  statsLoading,
  onEdit,
  onDelete,
}: {
  account: Account;
  stats: ReturnType<typeof calculateAccountSummary>;
  statsAvailable: boolean;
  statsLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { performance, tradeStats } = stats;

  const drawdownRatio =
    account.maxDrawdown && account.maxDrawdown > 0
      ? performance.currentDrawdown / account.maxDrawdown
      : 0;

  const profitTargetPct = performance.profitTargetProgress ?? 0;
  const drawdownPct = Math.max(0, Math.min(100, drawdownRatio * 100));

  const phaseLabel = getPhaseLabel(account.phase);
  const phaseTone = getPhaseTone(account.phase);
  const resultLabel = getResultLabel(account.result);
  const resultTone = getResultTone(account.result);

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-line bg-bg-1 p-5 shadow-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:bg-bg-2 hover:shadow-pop'
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1 rounded-b-none rounded-t-xl',
          'bg-line-strong'
        )}
      />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              'bg-bg-3'
            )}
          >
            {account.accountType === 'futures' ? (
              <BarChart3 className="h-5 w-5 text-accent" aria-hidden="true" />
            ) : (
              <Globe2 className="h-5 w-5 text-fg-muted" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-fg">
              <Link
                to={`/accounts/${account.id}`}
                className={cn(
                  'outline-none',
                  'focus-visible:underline'
                )}
              >
                {account.name}
              </Link>
            </h2>
            <p className="mt-0.5 text-xs text-fg-dim truncate">
              {TYPE_LABEL[account.accountType]} · {accountSizeLabel(account.accountSize)}
              {' · '}
              <span>
                {account.ruleMode === 'custom' ? 'Custom rules' : 'Standard rules'}
              </span>
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge tone={phaseTone} className="text-xs">{phaseLabel}</Badge>
              <Badge tone={resultTone} className="text-xs">{resultLabel}</Badge>
            </div>
          </div>
        </div>

        <CardMenu
          accountName={account.name}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {statsLoading ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-bg-2/50">
            <div className="p-3 space-y-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="p-3 space-y-2">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 px-0.5">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        </div>
      ) : statsAvailable ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-bg-2/50">
            <div className="p-3">
              <div className="text-xs font-medium text-fg-dim">
                P&L
              </div>
              <div
                className={cn(
                  'mt-1 text-xl font-semibold font-mono tabular-nums',
                  performance.totalPnl > 0
                    ? 'text-win'
                    : performance.totalPnl < 0
                      ? 'text-loss'
                      : 'text-fg'
                )}
              >
                {formatSignedMoney(performance.totalPnl)}
              </div>
            </div>

            <div className="p-3">
              <div className="text-xs font-medium text-fg-dim">
                Total R
              </div>
              <div
                className={cn(
                  'mt-1 text-xl font-semibold font-mono tabular-nums',
                  tradeStats.totalR > 0
                    ? 'text-win'
                    : tradeStats.totalR < 0
                      ? 'text-loss'
                      : 'text-fg'
                )}
              >
                {formatR(tradeStats.totalR)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-0.5">
            <div>
              <div className="flex items-center justify-between text-xs text-fg-dim mb-1">
                <span>Profit target</span>
                <span className="font-medium text-fg-muted">
                  {Math.round(profitTargetPct)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, profitTargetPct))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-fg-dim mb-1">
                <span>Drawdown</span>
                <span className="font-medium text-fg-muted">
                  {Math.round(drawdownPct)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    'bg-fg-muted'
                  )}
                  style={{ width: `${drawdownPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-fg-dim" role="status">
          Attachment statistics are unavailable until account trades load.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex items-center gap-3 text-xs">
          {statsLoading ? (
            <Skeleton className="h-5 w-16 rounded-md" />
          ) : statsAvailable ? (
            <>
              <Badge tone="neutral">
                {tradeStats.totalTrades} trade{tradeStats.totalTrades !== 1 ? 's' : ''}
              </Badge>
              {tradeStats.totalTrades > 0 && (
                <Badge tone={tradeStats.winRate > 0 ? 'win' : 'loss'}>
                  {Math.round(tradeStats.winRate)}% win
                </Badge>
              )}
            </>
          ) : null}
        </div>

        <Link
          to={`/accounts/${account.id}`}
          className={cn(
            'text-xs font-semibold text-accent hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-1 rounded'
          )}
        >
          View Account
        </Link>
      </div>
    </article>
  );
}

function EmptyAccounts({
  type,
  onCreate,
}: {
  type: AccountType;
  onCreate: () => void;
}) {
  return (
    <EmptyState
      icon={
        type === 'futures' ? (
          <BarChart3 className="h-6 w-6" />
        ) : (
          <Globe2 className="h-6 w-6" />
        )
      }
      title={`No ${TYPE_LABEL[type]} accounts yet`}
      description="Add an account to track its profit target, drawdown, and consistency separately from your journal."
      action={
        <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
          Add account
        </Button>
      }
    />
  );
}

export function AccountsPage() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<AccountId, AccountTradeAttachment[]>>({});
  const [attachmentsLoadFailed, setAttachmentsLoadFailed] = useState(false);

  const [activeTab, setActiveTab] = useState<AccountType>('futures');

  const [initialLoading, setInitialLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [hiddenIds, setHiddenIds] = useState<AccountId[]>([]);
  const pendingDelete = useRef<{ account: Account; timer: number } | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const loadAccounts = useCallback(async () => {
    try {
      if (!userId) throw new Error('No authenticated user.');

      // Phase 1: Fetch and render accounts immediately
      const data = await accountRepository.listForUser(userId);
      setAccounts(data);
      setLoadError(null);
      setInitialLoading(false);

      if (data.length === 0) {
        setAttachmentsMap({});
        setStatsLoading(false);
        return;
      }

      // Phase 2: Asynchronously load trade attachments and summaries in parallel
      setStatsLoading(true);
      const map: Record<AccountId, AccountTradeAttachment[]> = {};
      for (const account of data) map[account.id] = [];

      let attachmentError: unknown = null;
      try {
        const accountIds = data.map((account) => account.id);
        const attachmentsPromise = typeof accountTradeAttachmentRepository.listForAccounts === 'function'
          ? accountTradeAttachmentRepository.listForAccounts(accountIds, userId)
          : Promise.all(
              data.map((account) => accountTradeAttachmentRepository.listForAccount(account.id))
            ).then((results) => results.flat());
        const tradesPromise = loadAccountTradeSummaries(userId);
        const [attachments, trades] = await Promise.all([
          attachmentsPromise,
          tradesPromise,
        ]);
        const tradeById = Object.fromEntries(
          trades.map((trade) => [trade.id, {
            pnl: trade.pnl,
            openedAt: trade.openedAt,
          }]),
        );
        const enrichedAttachments = enrichAttachmentsWithTradePnl(
          attachments,
          tradeById,
        );
        for (const attachment of enrichedAttachments) {
          (map[attachment.accountId] ??= []).push(attachment);
        }
      } catch (err) {
        attachmentError = err;
      }
      setAttachmentsMap(map);
      setAttachmentsLoadFailed(Boolean(attachmentError));

      if (attachmentError) {
        setLoadError(
          errorMessage(attachmentError, 'Unable to load account attachments.')
        );
      }
    } catch (err) {
      setLoadError(errorMessage(err, 'Couldn’t load your accounts.'));
      setInitialLoading(false);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const showToast = useCallback(
    (next: { message: string; tone?: ToastState['tone']; action?: ToastState['action'] }, duration: number = TOAST_MS) => {
      window.clearTimeout(toastTimer.current);
      setToast({
        message: next.message,
        tone: next.tone ?? 'default',
        ...(next.action ? { action: next.action } : {}),
      });
      toastTimer.current = window.setTimeout(() => setToast(null), duration);
    },
    []
  );

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  async function commitDelete(account: Account) {
    if (pendingDelete.current?.account.id === account.id) {
      pendingDelete.current = null;
    }

    try {
      await accountRepository.remove(account.id);
      setAttachmentsMap((prev) => {
        const copy = { ...prev };
        delete copy[account.id];
        return copy;
      });
      await loadAccounts();
    } catch (err) {
      showToast({
        message: errorMessage(err, `Couldn’t delete “${account.name}”.`),
        tone: 'error',
      });
    } finally {
      setHiddenIds((ids) => ids.filter((id) => id !== account.id));
    }
  }

  function flushPendingDelete() {
    const pending = pendingDelete.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    void commitDelete(pending.account);
  }

  function requestDelete(account: Account) {
    flushPendingDelete();
    setHiddenIds((ids) => [...ids, account.id]);

    const timer = window.setTimeout(() => {
      void commitDelete(account);
    }, UNDO_WINDOW_MS);

    pendingDelete.current = { account, timer };

    showToast(
      {
        message: `Deleted “${account.name}”`,
        action: { label: 'Undo', onClick: undoDelete },
      },
      UNDO_WINDOW_MS
    );
  }

  function undoDelete() {
    const pending = pendingDelete.current;
    if (!pending) return;

    window.clearTimeout(pending.timer);
    pendingDelete.current = null;
    setHiddenIds((ids) => ids.filter((id) => id !== pending.account.id));
    dismissToast();
  }

  useEffect(() => {
    return () => {
      const pending = pendingDelete.current;
      if (pending) {
        window.clearTimeout(pending.timer);
        void accountRepository.remove(pending.account.id);
      }
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  function openCreate() {
    setFormMode('create');
    setEditingAccount(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setFormMode('edit');
    setEditingAccount(account);
    setFormOpen(true);
  }

  function handleSaved(mode: 'create' | 'edit') {
    showToast({
      message: mode === 'create' ? 'Account added' : 'Changes saved',
    });
    void loadAccounts();
  }

  const visibleAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.accountType === activeTab && !hiddenIds.includes(account.id)
      ),
    [accounts, activeTab, hiddenIds]
  );

  const summaries = useMemo(() => {
    return visibleAccounts.map((account) => {
      const atts = attachmentsMap[account.id] ?? [];
      return {
        account,
        summary: calculateAccountSummary(account, atts),
        attachments: atts as AccountTradeAttachment[],
      };
    });
  }, [visibleAccounts, attachmentsMap]);

  const heroStats = useMemo(() => {
    const allAttachments = summaries.flatMap((s) => s.attachments);
    if (attachmentsLoadFailed || allAttachments.length === 0) return null;

    const totalPnl = allAttachments.reduce(
      (sum, a) => sum + (a.accountPnl ?? 0),
      0
    );
    const totalR = allAttachments.reduce(
      (sum, a) => sum + (a.accountR ?? 0),
      0
    );
    const wins = allAttachments.filter((a) => (a.accountPnl ?? 0) > 0).length;
    const totalTrades = allAttachments.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return { totalPnl, totalR, winRate, totalTrades };
  }, [summaries, attachmentsLoadFailed]);

  if (initialLoading) {
    return (
      <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading accounts">
        <PageHeader
          title="Accounts"
          actions={
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled
            >
              Add Account
            </Button>
          }
        />

        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Hero Performance Overview Skeleton */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-60" />
            </div>
            <Skeleton className="h-5 w-20 rounded-md" />
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-bg-2/50 border border-line p-3 space-y-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Account Cards Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <article key={i} className="rounded-xl border border-line bg-bg-1 p-5 shadow-card space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <div className="flex gap-1.5 pt-1">
                      <Skeleton className="h-5 w-16 rounded-md" />
                      <Skeleton className="h-5 w-14 rounded-md" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-bg-2/50">
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        actions={<Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          Add Account
        </Button>}
      />

      <div className="flex items-center justify-between">
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={TAB_OPTIONS}
          aria-label="Account type"
          className="w-full max-w-[200px]"
        />

        <span className="text-sm text-fg-dim">
          <span className="font-semibold text-fg">{visibleAccounts.length}</span>{' '}
          {TYPE_LABEL[activeTab]} account{visibleAccounts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {heroStats ? (
        <Card className="overflow-hidden">
          <CardHeader className="flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Performance overview</CardTitle>
              <p className="mt-1 text-xs text-fg-dim">Combined results for your {TYPE_LABEL[activeTab].toLowerCase()} accounts</p>
            </div>
            <Badge tone="outline">{heroStats.totalTrades} trades</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-bg-2/50 border border-line p-3">
                <div className="text-xs font-medium text-fg-dim">
                  Total P&amp;L
                </div>
                <div
                  className={cn(
                    'mt-1 text-xl font-semibold font-mono tabular-nums',
                    heroStats.totalPnl > 0
                      ? 'text-win'
                      : heroStats.totalPnl < 0
                        ? 'text-loss'
                        : 'text-fg'
                  )}
                >
                  {formatSignedMoney(heroStats.totalPnl)}
                </div>
              </div>

              <div className="rounded-lg bg-bg-2/50 border border-line p-3">
                <div className="text-xs font-medium text-fg-dim">
                  Total R
                </div>
                <div
                  className={cn(
                    'mt-1 text-xl font-semibold font-mono tabular-nums',
                    heroStats.totalR > 0
                      ? 'text-win'
                      : heroStats.totalR < 0
                        ? 'text-loss'
                        : 'text-fg'
                  )}
                >
                  {formatR(heroStats.totalR)}
                </div>
              </div>

              <div className="rounded-lg bg-bg-2/50 border border-line p-3">
                <div className="text-xs font-medium text-fg-dim">
                  Win rate
                </div>
                <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-fg">
                  {formatPct(heroStats.winRate / 100)}
                </div>
              </div>

              <div className="rounded-lg bg-bg-2/50 border border-line p-3">
                <div className="text-xs font-medium text-fg-dim">
                  Trades
                </div>
                <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-fg">
                  {heroStats.totalTrades}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : visibleAccounts.length > 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-3 text-fg-muted">
              {activeTab === 'futures' ? <BarChart3 className="h-5 w-5" aria-hidden="true" /> : <Globe2 className="h-5 w-5" aria-hidden="true" />}
            </div>
            <h2 className="text-sm font-semibold text-fg">Performance overview</h2>
            <p className="text-sm text-fg-muted">
              No trades are attached to these accounts yet. Attach journal trades to see combined results here.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg-3 px-4 py-3 text-sm text-fg"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadAccounts()}
            className={cn(
              'shrink-0 rounded-md px-2 py-1 font-semibold underline underline-offset-2 text-fg hover:bg-bg-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50'
            )}
          >
            Try again
          </button>
        </div>
      ) : null}

      <div>
        {visibleAccounts.length === 0 ? (
          <EmptyAccounts type={activeTab} onCreate={openCreate} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {summaries.map(({ account, summary }) => (
              <AccountCard
                key={account.id}
                account={account}
                stats={summary}
                statsAvailable={!attachmentsLoadFailed}
                statsLoading={statsLoading}
                onEdit={() => openEdit(account)}
                onDelete={() => requestDelete(account)}
              />
            ))}
          </div>
        )}
      </div>

      <AccountForm
        open={formOpen}
        mode={formMode}
        account={editingAccount}
        defaultType={activeTab}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
