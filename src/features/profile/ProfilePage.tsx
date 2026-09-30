import { useEffect, useMemo } from 'react';
import { Mail, ShieldCheck, UserRound, CreditCard, BarChart3, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary } from '@/analytics/core';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'T';
}

export function ProfilePage() {
  const { user } = useAuthStore();
  const { trades, loaded, load } = useTradesStore();

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const stats = useMemo(() => {
    if (!loaded || trades.length === 0) {
      return { count: 0, totalR: 0, winRate: null as number | null };
    }

    const result = summary(trades);

    return {
      count: result.count,
      totalR: result.totalR,
      winRate: result.winRate,
    };
  }, [loaded, trades]);

  if (!user) {
    return null;
  }

  const displayName = user.name || 'Trader';
  const accountType = user.isGuest ? 'Guest account' : 'Synced Trader';

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Profile"
        description="Your PrecisionJournal account and plan details."
      />

      {/* Profile hero */}
      <Card className="overflow-hidden">
        <CardBody className="p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="h-20 w-20 rounded-2xl object-cover border border-line shadow-sm shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-accent/15 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold shrink-0">
                {getInitials(displayName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
                  {displayName}
                </h2>
                {!user.isGuest && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-win/10 px-2 py-1 text-2xs font-semibold text-win">
                    <ShieldCheck className="h-3 w-3" />
                    Verified account
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-fg-muted break-all">{user.email}</p>
              <p className="mt-2 text-xs text-fg-dim">{accountType}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-accent" />
              Account details
            </CardTitle>
          </CardHeader>

          <CardBody className="space-y-1">
            <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Email</span>
              </div>
              <span className="text-sm font-medium text-fg text-right break-all">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Account type</span>
              </div>
              <span className="text-sm font-medium text-fg">
                {accountType}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Current plan</span>
              </div>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                Free Plan
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Trading snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Trading snapshot
            </CardTitle>
          </CardHeader>

          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-bg-3/50 p-3">
                <p className="text-2xs uppercase tracking-wider font-semibold text-fg-dim">
                  Trades
                </p>
                <p className="mt-1 text-lg font-bold text-fg tabular-nums">
                  {stats.count}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bg-3/50 p-3">
                <p className="text-2xs uppercase tracking-wider font-semibold text-fg-dim">
                  Total R
                </p>
                <p
                  className={cn(
                    'mt-1 text-lg font-bold tabular-nums',
                    stats.totalR > 0
                      ? 'text-win'
                      : stats.totalR < 0
                        ? 'text-loss'
                        : 'text-fg',
                  )}
                >
                  {formatR(stats.totalR)}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bg-3/50 p-3">
                <p className="text-2xs uppercase tracking-wider font-semibold text-fg-dim">
                  Win rate
                </p>
                <p className="mt-1 text-lg font-bold text-fg tabular-nums">
                  {stats.winRate == null ? '—' : formatPct(stats.winRate)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Plan card */}
      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-fg">Free Plan</h3>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Your current PrecisionJournal plan.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled
              rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
            >
              Upgrade
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
