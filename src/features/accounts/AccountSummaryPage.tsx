import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DirectionPill } from '@/components/ui/DirectionPill';
import { ResultPill } from '@/components/ui/ResultPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Stat } from '@/components/ui/Stat';
import { accountRepository } from '@/data/supabaseAccountRepository';
import { accountTradeAttachmentRepository } from '@/data/supabaseAccountTradeAttachmentRepository';
import { calculateAccountSummary } from '@/domain/accounts/accountCalculations';
import { formatMoney, formatR, formatDate } from '@/lib/format';
import type { Account, AccountType, AccountRuleMode } from '@/domain/models/account';
import type { Trade } from '@/domain/models/trade';
import type { AccountTradeAttachment } from '@/domain/models/accountTradeAttachment';
import { cn } from '@/lib/cn';

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  futures: 'Futures',
  cfd: 'CFD',
};

const RULE_MODE_LABEL: Record<AccountRuleMode, string> = {
  standard: 'Standard',
  custom: 'Custom',
};

const PNL_TONE = (v: number): 'win' | 'loss' | 'default' =>
  v > 0 ? 'win' : v < 0 ? 'loss' : 'default';

export function AccountSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [attachments, setAttachments] = useState<AccountTradeAttachment[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const accountId = id;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [acc, atts] = await Promise.all([
          accountRepository.get(accountId),
          accountTradeAttachmentRepository.listForAccountWithTrades(accountId),
        ]);
        if (!cancelled) {
          setAccount(acc);
          setAttachments(atts.map((a) => a.attachment));
          setTrades(atts.map((a) => a.trade).filter((t): t is Trade => t !== null));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const summary = useMemo(
    () => (account ? calculateAccountSummary(account, attachments) : null),
    [account, attachments]
  );

  const tradeMap = useMemo(() => {
    const m = new Map<string, Trade>();
    for (const t of trades) m.set(t.id, t);
    return m;
  }, [trades]);

  const attachedRows = useMemo(() => {
    return attachments.map((att) => ({
      attachment: att,
      trade: tradeMap.get(att.tradeId),
    }));
  }, [attachments, tradeMap]);

  if (!id) {
    return (
      <div className="space-y-4">
        <PageHeader title="Account not found" />
        <Card>
          <CardBody className="text-sm text-fg-muted">
            No account ID provided.
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-fg-muted">Loading account…</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Account" />
        <Card>
          <CardBody className="text-sm text-loss">{error}</CardBody>
        </Card>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <PageHeader title="Account not found" />
        <Card>
          <CardBody className="text-sm text-fg-muted">
            This account does not exist or you don't have access to it.
          </CardBody>
        </Card>
      </div>
    );
  }

  const { performance, tradeStats } = summary!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        description={
          `${ACCOUNT_TYPE_LABEL[account.accountType]} · ${RULE_MODE_LABEL[account.ruleMode]} · ${formatMoney(account.accountSize)} size`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="h-4 w-4" />}
            >
              Edit account
            </Button>
          </div>
        }
      />

      {/* SECTION 2: Account Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Account Performance</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="Starting Balance"
              value={formatMoney(performance.startingBalance)}
              tone="default"
            />
            <Stat
              label="Current Balance"
              value={formatMoney(performance.currentBalance)}
              tone={PNL_TONE(performance.totalPnl)}
            />
            <Stat
              label="Total P&L"
              value={formatMoney(performance.totalPnl)}
              tone={PNL_TONE(performance.totalPnl)}
            />
            <Stat
              label="P&L %"
              value={
                performance.pnlPercentage != null
                  ? `${performance.pnlPercentage.toFixed(2)}%`
                  : '—'
              }
              tone={PNL_TONE(performance.totalPnl)}
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION 3: R + P&L */}
      <Card>
        <CardHeader>
          <CardTitle>R &amp; P&L</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="Total R"
              value={formatR(tradeStats.totalR)}
              tone={tradeStats.totalR > 0 ? 'win' : tradeStats.totalR < 0 ? 'loss' : 'default'}
            />
            <Stat
              label="Average R"
              value={formatR(tradeStats.averageR)}
              tone={tradeStats.totalR > 0 ? 'win' : tradeStats.totalR < 0 ? 'loss' : 'default'}
            />
            <Stat
              label="Best R"
              value={tradeStats.bestR != null ? formatR(tradeStats.bestR) : '—'}
              tone="win"
            />
            <Stat
              label="Worst R"
              value={tradeStats.worstR != null ? formatR(tradeStats.worstR) : '—'}
              tone="loss"
            />
            <Stat
              label="Total P&L"
              value={formatMoney(tradeStats.totalPnl)}
              tone={PNL_TONE(tradeStats.totalPnl)}
            />
            <Stat
              label="Average P&L"
              value={formatMoney(tradeStats.averagePnl)}
              tone={PNL_TONE(tradeStats.averagePnl)}
            />
            <Stat
              label="Best P&L"
              value={tradeStats.bestTradePnl != null ? formatMoney(tradeStats.bestTradePnl) : '—'}
              tone="win"
            />
            <Stat
              label="Worst P&L"
              value={tradeStats.worstTradePnl != null ? formatMoney(tradeStats.worstTradePnl) : '—'}
              tone="loss"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION 4: Account Rule Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Rule Progress</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Stat
              label="Profit Target"
              value={performance.profitTarget != null ? formatMoney(performance.profitTarget) : '—'}
              hint={
                performance.profitTargetProgress != null
                  ? `${performance.profitTargetProgress.toFixed(1)}%`
                  : undefined
              }
            />
            <Stat
              label="Remaining Target"
              value={performance.remainingProfitTarget != null ? formatMoney(performance.remainingProfitTarget) : '—'}
              tone={performance.remainingProfitTarget != null && performance.remainingProfitTarget === 0 ? 'win' : 'default'}
            />
            <Stat
              label="Max Drawdown"
              value={performance.maxDrawdown != null ? formatMoney(performance.maxDrawdown) : '—'}
            />
            <Stat
              label="Current Drawdown"
              value={formatMoney(performance.currentDrawdown)}
              tone={PNL_TONE(-performance.currentDrawdown)}
            />
            <Stat
              label="Remaining Drawdown"
              value={performance.remainingDrawdown != null ? formatMoney(performance.remainingDrawdown) : '—'}
              tone={performance.remainingDrawdown != null && performance.remainingDrawdown === 0 ? 'loss' : 'default'}
            />
            <Stat
              label="Consistency Limit"
              value={performance.consistencyLimit != null ? `${performance.consistencyLimit}%` : '—'}
            />
            <Stat
              label="Consistency %"
              value={performance.consistencyPercentage != null ? `${performance.consistencyPercentage.toFixed(1)}%` : '—'}
              tone={
                performance.consistencyPassed === true ? 'win' : performance.consistencyPassed === false ? 'loss' : 'default'
              }
            />
            <Stat
              label="Consistency Status"
              value={
                performance.consistencyPassed === true
                  ? 'Passed'
                  : performance.consistencyPassed === false
                    ? 'Failed'
                    : 'N/A'
              }
              tone={performance.consistencyPassed === true ? 'win' : performance.consistencyPassed === false ? 'loss' : 'default'}
            />
          </div>

          {performance.profitTarget != null && (
            <RuleProgress
              label="Profit Target Progress"
              value={performance.profitTargetProgress ?? 0}
              max={100}
            />
          )}

          {performance.maxDrawdown != null && (
            <RuleProgress
              label="Drawdown Budget"
              value={performance.remainingDrawdown ?? 0}
              max={performance.maxDrawdown}
              reverse
            />
          )}
        </CardBody>
      </Card>

      {/* SECTION 5: Trade Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Statistics</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Trades" value={tradeStats.totalTrades} />
            <Stat
              label="Winning Trades"
              value={tradeStats.winningTrades}
              tone="win"
            />
            <Stat
              label="Losing Trades"
              value={tradeStats.losingTrades}
              tone="loss"
            />
            <Stat
              label="Breakeven Trades"
              value={tradeStats.breakevenTrades}
              tone="default"
            />
            <Stat
              label="Win Rate"
              value={`${tradeStats.winRate.toFixed(1)}%`}
              tone={tradeStats.winRate > 0 ? 'win' : 'default'}
            />
            <Stat
              label="Average P&L"
              value={formatMoney(tradeStats.averagePnl)}
              tone={PNL_TONE(tradeStats.averagePnl)}
            />
            <Stat
              label="Best Trade"
              value={tradeStats.bestTradePnl != null ? formatMoney(tradeStats.bestTradePnl) : '—'}
              tone="win"
            />
            <Stat
              label="Worst Trade"
              value={tradeStats.worstTradePnl != null ? formatMoney(tradeStats.worstTradePnl) : '—'}
              tone="loss"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION 6: Attached Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Attached Trades</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {attachedRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Plus className="h-6 w-6" />}
                title="No attached trades"
                description="This account has no trades attached yet."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-12 text-center">#</TH>
                  <TH>Date</TH>
                  <TH>Pair</TH>
                  <TH>L/S</TH>
                  <TH>Result</TH>
                  <TH className="text-right">Account R</TH>
                  <TH className="text-right">Account P&L</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {attachedRows.map(({ attachment, trade }, i) => (
                  <TR
                    key={attachment.id}
                    interactive
                    onClick={() => trade && navigate(`/journal/${trade.id}`)}
                  >
                    <TD className="text-center text-fg-dim">
                      {(trade?.number ? String(trade.number).padStart(2, '0') : i + 1)}
                    </TD>
                    <TD className="whitespace-nowrap font-mono text-xs">
                      {trade ? formatDate(trade.openedAt) : formatDate(attachment.attachedAt)}
                    </TD>
                    <TD>
                      <span className="font-semibold text-fg">
                        {trade?.instrument ?? '—'}
                      </span>
                    </TD>
                    <TD>
                      {trade ? <DirectionPill direction={trade.direction} /> : <span className="text-fg-dim">—</span>}
                    </TD>
                    <TD>
                      {trade ? <ResultPill result={trade.result} /> : <span className="text-fg-dim">—</span>}
                    </TD>
                    <TD align="right" className="num">
                      {attachment.accountR != null ? formatR(attachment.accountR) : '—'}
                    </TD>
                    <TD align="right" className={cn('num font-bold', attachment.accountPnl != null ? (attachment.accountPnl > 0 ? 'text-win' : attachment.accountPnl < 0 ? 'text-loss' : 'text-be') : 'text-fg-dim')}>
                      {attachment.accountPnl != null ? formatMoney(attachment.accountPnl) : '—'}
                    </TD>
                    <TD align="right" className="num text-fg-muted">
                      {attachment.quantity != null ? attachment.quantity : '—'}
                    </TD>
                    <TD align="center" className="text-fg-dim">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Edit attachment would go here
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

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
    ? value > 0 ? 'bg-win' : 'bg-fg-dim'
    : pctClamped < 33 ? 'bg-loss' : pctClamped < 66 ? 'bg-amber-400' : 'bg-win';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-dim">{label}</span>
        <span className="text-fg-muted font-medium">
          {reverse ? `${value.toFixed(1)} / ${max.toFixed(1)} remaining` : `${pctClamped.toFixed(0)}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barTone)}
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  );
}
