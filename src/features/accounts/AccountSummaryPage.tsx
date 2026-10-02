import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Search,
  CheckSquare,
  Square,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  type TooltipPayloadEntry,
} from 'recharts';

import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Stat } from '@/components/ui/Stat';
import { cn } from '@/lib/cn';
import {
  formatMoney,
  formatR,
  formatPct,
  formatDate,
} from '@/lib/format';
import { useChartTheme } from '@/lib/chartTheme';
import { accountRepository } from '@/data/supabaseAccountRepository';
import { accountTradeAttachmentRepository } from '@/data/supabaseAccountTradeAttachmentRepository';
import { tradeRepository } from '@/data/supabaseTradeRepository';
import {
  calculateAccountSummary,
  enrichAttachmentsWithTradePnl,
  getPhaseLabel,
  getPhaseTone,
  getResultLabel,
  getResultTone,
  resolveAttachmentPnl,
} from '@/domain/accounts/accountCalculations';
import type { Account, AccountType, AccountRuleMode } from '@/domain/models/account';
import type { Trade } from '@/domain/models/trade';
import type {
  AccountTradeAttachment,
  CreateAccountTradeAttachmentInput,
} from '@/domain/models/accountTradeAttachment';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const TYPE_LABEL: Record<AccountType, string> = {
  futures: 'Futures',
  cfd: 'CFD',
};

const RULE_MODE_LABEL: Record<AccountRuleMode, string> = {
  standard: 'Standard',
  custom: 'Custom',
};

function PNL_TONE(v: number): 'win' | 'loss' | 'default' {
  return v > 0 ? 'win' : v < 0 ? 'loss' : 'default';
}

function accountSizeLabel(size: number): string {
  if (size >= 1_000_000) return `${size / 1_000_000}M`;
  if (size >= 1_000) return `${size / 1_000}K`;
  return `$${size}`;
}

function formatSignedMoney(value: number): string {
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return `-${formatMoney(Math.abs(value))}`;
  return formatMoney(0);
}

/* -------------------------------------------------------------------------- */
/* Progress bar                                                               */
/* -------------------------------------------------------------------------- */

function RuleProgress({
  label,
  value,
  max,
  reverse = false,
}: {
  label: string;
  value: number;
  max: number;
  reverse?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pct));
  const filled = reverse ? Math.max(0, 100 - pctClamped) : pctClamped;

  const barTone = reverse
    ? 'bg-win'
    : pctClamped < 33
      ? 'bg-loss'
      : pctClamped < 66
        ? 'bg-amber-400'
        : 'bg-win';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-fg-dim">
        <span>{label}</span>
        <span className="font-medium text-fg-muted">
          {reverse
            ? `${Math.round(value)} / ${Math.round(max)} remaining`
            : `${Math.round(pctClamped)}%`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg-3 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barTone)}
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attach Journal Trades Modal                                                */
/* -------------------------------------------------------------------------- */

interface AttachTradesModalProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  existingAttachmentTradeIds: string[];
  onAttached: () => void;
}

function AttachTradesModal({
  open,
  onClose,
  accountId,
  accountName,
  existingAttachmentTradeIds,
  onAttached,
}: AttachTradesModalProps) {
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'be'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [onClose, saving]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      setLoadingTrades(true);
      setSaveError(null);
      try {
        const trades = await tradeRepository.list();
        if (!cancelled) setAllTrades(trades);
      } catch (err) {
        if (!cancelled) {
          setSaveError(err instanceof Error ? err.message : 'Failed to load trades.');
        }
      } finally {
        if (!cancelled) setLoadingTrades(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDirectionFilter('all');
      setResultFilter('all');
      setSelectedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeModal]);

  const availableTrades = useMemo(() => {
    return allTrades.filter(
      (t) =>
        !existingAttachmentTradeIds.includes(t.id) &&
        (search === '' ||
          t.instrument.toLowerCase().includes(search.toLowerCase())) &&
        (directionFilter === 'all' || t.direction === directionFilter) &&
        (resultFilter === 'all' || t.result === resultFilter)
    );
  }, [allTrades, search, directionFilter, resultFilter, existingAttachmentTradeIds]);

  function toggleSelection(tradeId: string) {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(tradeId)) {
        copy.delete(tradeId);
      } else {
        copy.add(tradeId);
      }
      return copy;
    });
  }

  function toggleAll() {
    if (selectedIds.size === availableTrades.length && availableTrades.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableTrades.map((t) => t.id)));
    }
  }

  async function handleAttach() {
    if (selectedIds.size === 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      const inputs: CreateAccountTradeAttachmentInput[] = [];

      for (const tradeId of selectedIds) {
        const trade = allTrades.find((t) => t.id === tradeId);
        if (!trade) continue;

        inputs.push({
          accountId,
          tradeId,
          accountPnl: trade.pnl ?? null,
          accountR: trade.r,
          quantity: null,
        });
      }

      await Promise.all(
        inputs.map((input) =>
          accountTradeAttachmentRepository.create(input)
        )
      );

      onAttached();
      closeModal();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to attach trades.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attach-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          closeModal();
        }
      }}
    >
      <div className="fixed inset-0 bg-bg-0/80 backdrop-blur-sm" />

      <div
        ref={contentRef}
        className={cn(
          'relative z-[60] w-full max-w-3xl max-h-[85vh] rounded-xl border border-line bg-bg-1 shadow-pop',
          'flex flex-col'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="attach-title" className="text-base font-bold text-fg">
              Attach Journal Trades
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Attach trades to <span className="font-medium text-fg">{accountName}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
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
        </div>

        <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-dim" />
            <input
              type="text"
              placeholder="Search by instrument..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-9 w-full rounded-lg border bg-bg-2 pl-10 pr-3 text-sm text-fg',
                'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60'
              )}
            />
          </div>

          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as typeof directionFilter)}
            className={cn(
              'h-9 rounded-lg border bg-bg-2 px-3 text-sm text-fg',
              'focus:outline-none focus:ring-2 focus:ring-accent/40'
            )}
          >
            <option value="all">All directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
            className={cn(
              'h-9 rounded-lg border bg-bg-2 px-3 text-sm text-fg',
              'focus:outline-none focus:ring-2 focus:ring-accent/40'
            )}
          >
            <option value="all">All results</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="be">Break-even</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {saveError ? (
            <div
              role="alert"
              className="mx-3 my-3 rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss"
            >
              {saveError}
            </div>
          ) : null}

          {loadingTrades ? (
            <div className="p-4 text-sm text-fg-muted">Loading trades…</div>
          ) : availableTrades.length === 0 ? (
            <div className="p-6 text-center text-sm text-fg-muted">
              No available trades match your filters.
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="w-10 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={toggleAll}
                      className={cn(
                        'rounded focus:outline-none focus:ring-2 focus:ring-accent/50',
                        selectedIds.size === availableTrades.length && availableTrades.length > 0
                          ? 'text-accent'
                          : 'text-fg-dim'
                      )}
                      aria-label={
                        selectedIds.size === availableTrades.length
                          ? 'Deselect all'
                          : 'Select all'
                      }
                    >
                      {selectedIds.size === availableTrades.length && availableTrades.length > 0 ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                    Pair
                  </th>
                  <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                    L/S
                  </th>
                  <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                    Result
                  </th>
                  <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                    R
                  </th>
                  <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody>
                {availableTrades.map((trade) => {
                  const isSelected = selectedIds.has(trade.id);

                  return (
                    <tr
                      key={trade.id}
                      className={cn(
                        'border-b border-line transition-colors',
                        isSelected && 'bg-accent/5'
                      )}
                    >
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelection(trade.id)}
                          className={cn(
                            'rounded focus:outline-none focus:ring-2 focus:ring-accent/50',
                            isSelected ? 'text-accent' : 'text-fg-dim'
                          )}
                          aria-label={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-fg-dim">
                        {formatDate(trade.openedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-fg">{trade.instrument}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {trade.direction === 'long' ? (
                          <Badge tone="win">Long</Badge>
                        ) : (
                          <Badge tone="loss">Short</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <ResultBadge result={trade.result} />
                      </td>
                      <td className="px-3 py-2.5 text-right num font-medium">
                        <span
                          className={cn(
                            trade.r > 0 ? 'text-win' : trade.r < 0 ? 'text-loss' : 'text-fg'
                          )}
                        >
                          {formatR(trade.r)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right num">
                        <span
                          className={cn(
                            (trade.pnl ?? 0) > 0
                              ? 'text-win'
                              : (trade.pnl ?? 0) < 0
                                ? 'text-loss'
                                : 'text-fg-dim'
                          )}
                        >
                          {trade.pnl != null ? formatMoney(trade.pnl) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-4 bg-bg-2/50">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={closeModal}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving || selectedIds.size === 0}
            onClick={handleAttach}
          >
            {saving
              ? 'Attaching…'
              : `Attach ${selectedIds.size} trade${selectedIds.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function ResultBadge({ result }: { result: Trade['result'] }) {
  switch (result) {
    case 'win':
      return <Badge tone="win">Win</Badge>;
    case 'loss':
      return <Badge tone="loss">Loss</Badge>;
    case 'be':
      return <Badge tone="be">BE</Badge>;
  }
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                    */
/* -------------------------------------------------------------------------- */

export function AccountSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [attachmentsWithTrades, setAttachmentsWithTrades] = useState<
    { attachment: AccountTradeAttachment; trade: Trade | null }[]
  >([]);
  const [attachments, setAttachments] = useState<AccountTradeAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachModalOpen, setAttachModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [acc, atts, allTrades] = await Promise.all([
        accountRepository.get(id),
        accountTradeAttachmentRepository.listForAccount(id),
        // Canonical journal trades — the single source of truth for Trade.pnl.
        // Every trade here is produced by supabaseTradeRepository.toTrade, so
        // the monetary pnl column is always mapped (or undefined), never a
        // separate/duplicated field.
        tradeRepository.list(),
      ]);

      // Join attachments to their canonical Trade domain object.
      const tradesById = new Map(allTrades.map((trade) => [trade.id, trade]));
      const joined = atts.map((attachment) => ({
        attachment,
        trade: tradesById.get(attachment.tradeId) ?? null,
      }));

      setAccount(acc);
      setAttachmentsWithTrades(joined);

      // Legacy attachments are created with account_pnl = NULL. Enrich them
      // with the canonical trades.pnl so statistics and the equity curve
      // compute without requiring the user to detach/re-attach.
      // Read-only: no DB writes, original trades/attachments untouched.
      const tradePnlById: Record<string, number | null | undefined> = {};
      for (const { attachment, trade } of joined) {
        tradePnlById[attachment.tradeId] = trade?.pnl ?? null;
      }
      setAttachments(enrichAttachmentsWithTradePnl(atts, tradePnlById));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleAttachComplete = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () =>
      account
        ? calculateAccountSummary(account, attachments)
        : null,
    [account, attachments]
  );

  const chart = useChartTheme();

  const equityData = useMemo(() => {
    if (!summary?.equityCurve) return [];

    return summary.equityCurve.map((p) => ({
      date: p.date,
      dateLabel: p.dateLabel,
      cumulativePnl: p.cumulativePnl,
      tradeCount: p.tradeCount,
    }));
  }, [summary]);

  if (!id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-fg">Account not found</h1>
        <Card>
          <CardBody className="text-sm text-fg-muted">
            No account ID provided.
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-bg-3 animate-pulse" />
          <div className="h-4 w-20 rounded bg-bg-3 animate-pulse" />
        </div>
        <div className="h-6 w-48 rounded bg-bg-3 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-20 rounded-xl bg-bg-2 animate-pulse" />
          <div className="h-20 rounded-xl bg-bg-2 animate-pulse" />
          <div className="h-20 rounded-xl bg-bg-2 animate-pulse" />
          <div className="h-20 rounded-xl bg-bg-2 animate-pulse" />
        </div>
        <Card>
          <CardBody className="h-64" />
        </Card>
        <Card>
          <CardBody className="h-64" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-fg">Account</h1>
        <Card>
          <CardBody className="text-sm text-loss">{error}</CardBody>
        </Card>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-fg">Account not found</h1>
        <Card>
          <CardBody className="text-sm text-fg-muted">
            This account does not exist or you don't have access to it.
          </CardBody>
        </Card>
      </div>
    );
  }

  const { performance, tradeStats } = summary!;
  const currentEquity = performance.currentBalance;
  const profitTargetProgress = performance.profitTargetProgress ?? 0;
  const drawdownUsed = performance.maxDrawdown && performance.maxDrawdown > 0
    ? Math.max(0, Math.min(100, (performance.currentDrawdown / performance.maxDrawdown) * 100))
    : 0;

  const phaseLabel = getPhaseLabel(account.phase);
  const phaseTone = getPhaseTone(account.phase);
  const resultLabel = getResultLabel(account.result);
  const resultTone = getResultTone(account.result);

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-fg-dim">
        <Link
          to="/accounts"
          className="flex items-center gap-1 hover:text-fg-muted hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Accounts
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-fg-muted truncate max-w-[200px]">{account.name}</span>
      </div>

      {/* Account Header Card */}
      <Card className="w-full max-w-full min-w-0">
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
                {account.name}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-dim">
                <Badge tone={account.accountType === 'futures' ? 'accent' : 'win'}>
                  {TYPE_LABEL[account.accountType]}
                </Badge>
                <span className="mx-1.5 text-fg-dim">·</span>
                <Badge tone={phaseTone}>{phaseLabel}</Badge>
                <span className="mx-1.5 text-fg-dim">·</span>
                <Badge tone={resultTone}>{resultLabel}</Badge>
              </p>
              <p className="mt-2 text-sm text-fg-dim truncate max-w-[400px]">
                {TYPE_LABEL[account.accountType]} ·
                {accountSizeLabel(account.accountSize)} size ·
                {attachments.length} attached trade{attachments.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setAttachModalOpen(true)}
              >
                Attach journal trades
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Summary Statistics - 4 Cards */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4 xl:grid-cols-4">
        {/* Net Realized P&L */}
        <Card>
          <CardBody>
            <div className="space-y-1">
              <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                NET REALIZED P&L
              </div>
              <div className={cn(
                'text-3xl font-bold tabular-nums',
                PNL_TONE(performance.totalPnl)
              )}>
                {formatSignedMoney(performance.totalPnl)}
              </div>
              <div className="text-xs text-fg-dim">
                {formatMoney(currentEquity)} current equity
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Profit Target */}
        <Card>
          <CardBody>
            <div className="space-y-1">
              <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                PROFIT TARGET
              </div>
              <div className="text-3xl font-bold tabular-nums text-fg">
                {account.profitTarget != null ? formatMoney(account.profitTarget) : '—'}
              </div>
              <div className="text-xs text-fg-dim">
                {profitTargetProgress != null ? `${Math.round(profitTargetProgress)}% of target` : 'Not set'}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Max Drawdown */}
        <Card>
          <CardBody>
            <div className="space-y-1">
              <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">
                MAX DRAWDOWN
              </div>
              <div className="text-3xl font-bold tabular-nums text-fg">
                {account.maxDrawdown != null ? formatMoney(account.maxDrawdown) : '—'}
              </div>
              <div className="text-xs text-fg-dim">
                {performance.maxDrawdown != null && performance.maxDrawdown > 0
                  ? `${Math.round(drawdownUsed)}% used`
                  : 'Not set'}
              </div>
            </div>
          </CardBody>
        </Card>

      </div>

      {/* Main Content Area - Performance Curve & Trade Intelligence */}
      <div className="grid gap-6 min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* Performance Curve */}
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>PERFORMANCE CURVE</CardTitle>
              <div className="text-xs text-fg-dim">
                Equity progression
              </div>
            </div>
            <CardDescription>
              Cumulative P&L from attached trades · {attachments.length} trade{attachments.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardBody className="h-[320px] sm:h-[360px] xl:h-[400px] min-w-0">
            {equityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-fg-muted">
                No attached trades to chart yet.
              </div>
            ) : (
              <div className="h-full w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: chart.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chart.axisText }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatMoney(v)}
                    width={60}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: chart.tooltipBg,
                      border: `1px solid ${chart.tooltipBorder}`,
                      borderRadius: '0.75rem',
                      boxShadow: chart.tooltipShadow,
                      color: chart.tooltipText,
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
                      const p = item.payload as { dateLabel: string; cumulativePnl: number; tradeCount: number } | undefined;
                      if (!p) return ['—', 'Cumulative P&L'];
                      const pnl = typeof value === 'number' ? value : 0;
                      return [formatMoney(pnl), `T${p.tradeCount} · ${formatMoney(pnl)}`];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativePnl"
                    stroke={performance.totalPnl >= 0 ? chart.win : chart.loss}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: performance.totalPnl >= 0 ? chart.win : chart.loss, strokeWidth: 2, stroke: chart.tooltipBg }}
                    activeDot={{ r: 6, fill: performance.totalPnl >= 0 ? chart.win : chart.loss, strokeWidth: 2, stroke: chart.tooltipBg }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Trade Intelligence */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>DEEP STATISTICS</CardTitle>
            <CardDescription>Trade intelligence</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Stat
                label="WIN RATE"
                value={tradeStats.totalTrades > 0 ? formatPct(tradeStats.winRate / 100) : '—'}
                tone={tradeStats.winRate > 50 ? 'win' : 'loss'}
              />
              <Stat
                label="PROFIT FACTOR"
                value={tradeStats.profitFactor != null ? tradeStats.profitFactor.toFixed(2) : '—'}
                tone={tradeStats.profitFactor != null && tradeStats.profitFactor > 1 ? 'win' : 'default'}
              />
              <Stat
                label="WINNING TRADES"
                value={tradeStats.winningTrades}
                tone="win"
              />
              <Stat
                label="LOSING TRADES"
                value={tradeStats.losingTrades}
                tone="loss"
              />
              <Stat
                label="HIGHEST WIN"
                value={tradeStats.highestWinningTrade != null ? formatMoney(tradeStats.highestWinningTrade) : '—'}
                tone="win"
              />
              <Stat
                label="LOWEST WIN"
                value={tradeStats.lowestWinningTrade != null ? formatMoney(tradeStats.lowestWinningTrade) : '—'}
                tone="win"
              />
              <Stat
                label="WORST LOSS"
                value={tradeStats.lowestLosingTrade != null ? formatMoney(tradeStats.lowestLosingTrade) : '—'}
                tone="loss"
              />
              <Stat
                label="AVG WIN / LOSS"
                value={
                  tradeStats.averageWinner != null && tradeStats.averageLoser != null && tradeStats.averageLoser !== 0
                    ? (tradeStats.averageWinner / Math.abs(tradeStats.averageLoser)).toFixed(2) + 'x'
                    : '—'
                }
                tone="default"
              />
              {/* Consistency Statistic */}
              {account.accountType === 'futures' && tradeStats.consistencyPercentage != null && (
                <>
                  <Stat
                    label="CURRENT CONSISTENCY"
                    value={tradeStats.consistencyPercentage.toFixed(2) + '%'}
                    tone={tradeStats.consistencyPercentage <= 40 ? 'win' : 'loss'}
                  />
                  <Stat
                    label="BEST TRADING DAY"
                    value={tradeStats.bestTradingDayProfit != null ? formatMoney(tradeStats.bestTradingDayProfit) : '—'}
                    tone="win"
                  />
                  <Stat
                    label="TOTAL POSITIVE PROFIT"
                    value={tradeStats.totalPositiveProfit != null ? formatMoney(tradeStats.totalPositiveProfit) : '—'}
                    tone="default"
                  />
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Attached Trades & Account Rules */}
      <div className="grid gap-6 min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* Attached Trades Table */}
        <Card className="min-w-0">
          <CardHeader>
            <div>
              <CardTitle>JOURNAL LINK</CardTitle>
              <CardDescription>Attached trades</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {attachments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Plus className="h-6 w-6" />}
                  title="No journal trades attached"
                  description="Attach trades from your journal to start calculating account performance."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setAttachModalOpen(true)}
                    >
                      Attach journal trades
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Pair</TH>
                    <TH>Status</TH>
                    <TH>Direction</TH>
                    <TH>Date</TH>
                    <TH>Setup</TH>
                    <TH className="text-right">P&L</TH>
                    <TH className="w-10" />
                  </TR>
                </THead>
                <TBody>
                  {attachmentsWithTrades.map(({ attachment, trade }) => {
                    const displayPnl = resolveAttachmentPnl(attachment, trade?.pnl ?? null);
                    return (
                    <TR
                      key={attachment.id}
                      interactive
                      onClick={() => {
                        if (trade) {
                          navigate(`/journal/${trade.id}`);
                        }
                      }}
                    >
                      <TD>
                        <span className="font-semibold text-fg">{trade?.instrument ?? '—'}</span>
                      </TD>
                      <TD>
                        {trade ? (
                          <Badge tone={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'be'}>
                            {trade.result === 'win' ? 'WIN' : trade.result === 'loss' ? 'LOSS' : 'BE'}
                          </Badge>
                        ) : (
                          <span className="text-fg-dim">—</span>
                        )}
                      </TD>
                      <TD>
                        {trade ? (
                          <Badge tone={trade.direction === 'long' ? 'win' : 'loss'}>
                            {trade.direction === 'long' ? 'Long' : 'Short'}
                          </Badge>
                        ) : (
                          <span className="text-fg-dim">—</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap font-mono text-xs text-fg-dim">
                        {trade ? formatDate(trade.openedAt) : formatDate(attachment.attachedAt)}
                      </TD>
                      <TD className="text-sm text-fg-dim max-w-[200px] truncate">
                        {trade?.templateData?.Setup ?? trade?.templateData?.strategy ?? trade?.notes ?? '—'}
                      </TD>
                      <TD className="text-right num font-bold">
                        <span className={cn(
                          displayPnl != null
                            ? displayPnl > 0
                              ? 'text-win'
                              : displayPnl < 0
                                ? 'text-loss'
                                : 'text-be'
                            : 'text-fg-dim'
                        )}>
                          {displayPnl != null ? formatMoney(displayPnl) : '—'}
                        </span>
                      </TD>
                      <TD align="center">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Remove attachment"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await accountTradeAttachmentRepository.remove(attachment.id);
                            await load();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TD>
                    </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Account Rules */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Account rules</CardTitle>
            <CardDescription>
              {TYPE_LABEL[account.accountType]} · {getPhaseLabel(account.phase)} · {RULE_MODE_LABEL[account.ruleMode]} · {formatMoney(account.accountSize)} size
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Starting Balance */}
              <div>
                <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim mb-2">
                  Starting Balance
                </div>
                <div className="text-xl font-bold text-fg">
                  {formatMoney(account.accountSize)}
                </div>
              </div>

              {/* Profit Target */}
              {account.profitTarget != null && (
                <div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim mb-2">
                    Profit Target
                  </div>
                  <div className="text-xl font-bold text-fg">
                    {formatMoney(account.profitTarget)}
                  </div>
                  <RuleProgress
                    label="Progress"
                    value={performance.profitTargetProgress ?? 0}
                    max={100}
                  />
                </div>
              )}

              {/* No Profit Target for CFD Funded */}
              {account.profitTarget == null && account.accountType === 'cfd' && account.phase === 'funded' && (
                <div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim mb-2">
                    Profit Target
                  </div>
                  <div className="text-xl font-bold text-fg-dim">
                    No target
                  </div>
                </div>
              )}

              {/* Max Drawdown */}
              {account.maxDrawdown != null && (
                <div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-fg-dim mb-2">
                    Max Drawdown
                  </div>
                  <div className="text-xl font-bold text-fg">
                    {formatMoney(account.maxDrawdown)}
                  </div>
                  <RuleProgress
                    label="Used"
                    value={performance.currentDrawdown}
                    max={account.maxDrawdown}
                    reverse
                  />
                </div>
              )}

<p className="text-2xs text-fg-dim">
                Metrics recalculate instantly when you attach or detach a journal trade.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <AttachTradesModal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        accountId={id!}
        accountName={account.name}
        existingAttachmentTradeIds={attachments.map((a) => a.tradeId)}
        onAttached={handleAttachComplete}
      />
    </div>
  );
}