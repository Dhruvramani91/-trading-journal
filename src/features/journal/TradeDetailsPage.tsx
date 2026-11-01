import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Pencil, ArrowLeft, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { InstrumentMark } from '@/components/trade/InstrumentMark';
import { TradeGradeBadge } from '@/components/trade/TradeGradeBadge';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ResultPill } from '@/components/ui/ResultPill';
import { DirectionPill } from '@/components/ui/DirectionPill';
import { Stat } from '@/components/ui/Stat';
import { Loader } from '@/components/ui/Loader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useTradesStore } from '@/store/tradesStore';
import { useAuthStore } from '@/store/authStore';
import { tradeRepository } from '@/data/supabaseTradeRepository';
import { readFieldLabel } from '@/domain/templates/resolve';
import { getTemplate } from '@/domain/templates/registry';
import { formatDateLong, formatR, formatDuration } from '@/lib/format';
import { resolveTradePhotoUrl } from '@/lib/tradePhotos';

import type { Trade } from '@/domain/models/trade';

export function TradeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { remove } = useTradesStore();
  const { user } = useAuthStore();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resolvedPhotoUrls, setResolvedPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setTrade(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      let current = useTradesStore.getState();
      let cachedTrade: Trade | undefined;

      if (user?.id && current.loaded && current.ownerId === user.id) {
        cachedTrade = current.trades.find((item) => item.id === id);
      } else if (
        user?.id &&
        current.loading &&
        current.loadingOwnerId === user.id
      ) {
        // Join an existing load for this user; do not initiate a full-history
        // fetch from the TradeDetails route.
        await current.load(user.id);
        if (cancelled) return;

        current = useTradesStore.getState();
        if (current.loaded && current.ownerId === user.id) {
          cachedTrade = current.trades.find((item) => item.id === id);
        }
      }

      const t = cachedTrade ?? await tradeRepository.get(id);

      if (!cancelled) {
        setTrade(t);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function resolvePhotos() {
      const next: Record<string, string> = {};
      const photos = trade?.photos;
      const entries: [string, string | undefined][] = photos ? [
        ['htf', photos.htf], ['itf', photos.itf], ['ltf', photos.ltf],
        ...(photos.additional ?? []).map((value, index) => [`image${index + 4}`, value] as [string, string]),
      ] : [];

      for (const [slot, value] of entries) {

        if (!value) {
          continue;
        }

        try {
          const resolved = await resolveTradePhotoUrl(value);

          if (resolved) {
            next[slot] = resolved;
          }
        } catch (error) {
          console.error(
            `Unable to resolve ${slot} trade screenshot:`,
            error,
          );
        }
      }

      if (!cancelled) {
        setResolvedPhotoUrls(next);
      }
    }

    void resolvePhotos();

    return () => {
      cancelled = true;
    };
  }, [trade]);

  async function handleDelete() {
    if (!id) return;

    setDeleting(true);

    await remove(id, trade ?? undefined);

    navigate('/journal');
  }

  if (loading) {
    return (
      <Loader title="Loading trade…" className="min-h-64" />
    );
  }

  if (!trade) {
    return (
      <div className="space-y-4">
        <PageHeader title="Not found" />

        <Card>
          <CardBody className="text-sm text-fg-muted">
            Trade not found.
          </CardBody>
        </Card>
      </div>
    );
  }

  const pnlTone =
    trade.pnl == null
      ? 'default'
      : trade.pnl > 0
        ? 'win'
        : trade.pnl < 0
          ? 'loss'
          : 'default';

  const formattedPnl =
    trade.pnl == null
      ? '—'
      : `${trade.pnl > 0 ? '+' : ''}${trade.pnl}`;

  const template = trade.templateSnapshot ?? getTemplate();
  const templateGroups = Array.from(template.fields.filter((field) => field.key !== 'mistake').reduce((groups, field) => {
    const group = groups.get(field.group) ?? [];
    group.push(field);
    groups.set(field.group, group);
    return groups;
  }, new Map<string, typeof template.fields[number][]>()));

  return (
    <div className="space-y-6">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <PageHeader
        title={`Trade #${trade.number ?? '—'}`}
        description={`${trade.instrument} · ${formatDateLong(trade.openedAt)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mr-2 inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2 px-2.5 py-1.5 text-sm font-semibold text-fg">
              <InstrumentMark instrument={trade.instrument} className="h-6 w-6 rounded-md p-0.5" />
              {trade.instrument}
            </span>
            <Button
              asChild
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              <Link to="/journal">Back</Link>
            </Button>

            <Button
              asChild
              leftIcon={<Pencil className="h-4 w-4" />}
            >
              <Link to={`/journal/${trade.id}/edit`}>
                Edit
              </Link>
            </Button>

            <Button
              variant="danger"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      />

      {/* =========================================================
          TRADE PERFORMANCE METRIC CARDS
      ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="Entry"
            value={
              trade.entry != null
                ? String(trade.entry)
                : '—'
            }
          />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="Exit"
            value={
              trade.exit != null
                ? String(trade.exit)
                : '—'
            }
          />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="P&L"
            value={formattedPnl}
            tone={pnlTone}
          />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="Realized R"
            value={formatR(trade.r)}
            tone={
              trade.r > 0
                ? 'win'
                : trade.r < 0
                  ? 'loss'
                  : 'default'
            }
          />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="Direction"
            value={
              <DirectionPill
                direction={trade.direction}
              />
            }
          />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="Outcome"
            value={
              <ResultPill
                result={trade.result}
              />
            }
          />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat label="Grade" value={<TradeGradeBadge grade={trade.grade} />} />
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-4 shadow-card">
          <Stat
            label="Duration"
            value={formatDuration(trade.durationMin)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">{template.name} strategy details</h2>
        {templateGroups.map(([group, fields]) => (
          <div key={group} className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl overflow-hidden shadow-card">
            <div className="border-b border-line px-5 py-3.5 bg-bg-2/30">
              <h3 className="text-sm font-bold text-fg tracking-tight">{group}</h3>
            </div>
            <div className="p-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {fields.map((field) => {
                  const value = trade.templateData[field.key];
                  return (
                    <div key={field.key} className="rounded-xl bg-bg-2/50 border border-line/60 p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-fg-dim">{field.label}</dt>
                      <dd className="font-semibold text-fg mt-1 text-sm">{value === undefined || value === null || value === '' ? '—' : readFieldLabel(trade, field.key)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        ))}

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl overflow-hidden shadow-card">
          <div className="border-b border-line px-5 py-3.5 bg-bg-2/30">
            <h3 className="text-sm font-bold text-fg tracking-tight">Mistakes</h3>
          </div>
          <div className="p-5">
            {trade.templateData.mistake ? (
              <p className="text-sm text-rose-500 dark:text-rose-400 font-medium">{String(trade.templateData.mistake)}</p>
            ) : (
              <p className="text-sm text-fg-dim">No mistake recorded.</p>
            )}
          </div>
        </div>

        <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl overflow-hidden shadow-card">
          <div className="border-b border-line px-5 py-3.5 bg-bg-2/30">
            <h3 className="text-sm font-bold text-fg tracking-tight">Notes</h3>
          </div>
          <div className="p-5">
            {trade.notes ? (
              <div className="rounded-xl border border-line bg-bg-2/40 p-4 text-sm text-fg whitespace-pre-wrap leading-relaxed">{trade.notes}</div>
            ) : (
              <p className="text-sm text-fg-dim">No notes recorded.</p>
            )}
          </div>
        </div>
      </div>

        {/* =======================================================
            SCREENSHOTS
        ======================================================= */}
        {trade.photos && Object.values(trade.photos).some((value) => Array.isArray(value) ? value.some(Boolean) : Boolean(value)) && (
          <div className="bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl overflow-hidden shadow-card">
            <div className="border-b border-line px-5 py-3.5 bg-bg-2/30">
              <h3 className="text-sm font-bold text-fg tracking-tight">Screenshots</h3>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(resolvedPhotoUrls).map(([slot, src]) => {
                  const label = slot === 'htf' ? 'Image 1' : slot === 'itf' ? 'Image 2' : slot === 'ltf' ? 'Image 3' : `Image ${Number(slot.slice(5))}`;

                  return (
                    <div
                      key={slot}
                      className="flex flex-col gap-2 rounded-xl border border-line/60 bg-bg-2/30 p-3"
                    >
                      <span className="text-2xs font-bold uppercase tracking-wider text-fg-dim">
                        {label}
                      </span>

                      {src ? (
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden border border-line bg-bg-2 aspect-video hover:opacity-90 hover:border-line-strong transition-all shadow-sm"
                        >
                          <img
                            src={src}
                            alt={label}
                            className="w-full h-full object-contain"
                          />
                        </a>
                      ) : (
                        <div className="rounded-lg border border-dashed border-line bg-bg-3 aspect-video flex items-center justify-center text-xs text-fg-dim">
                          No screenshot
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this trade?"
        description="This permanently removes the trade and its saved details from your journal."
        confirmLabel={deleting ? 'Deleting…' : 'Delete trade'}
        onConfirm={handleDelete}
      />
    </div>
  );
}
