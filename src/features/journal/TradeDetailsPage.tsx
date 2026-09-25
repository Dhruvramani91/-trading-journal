import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Pencil, ArrowLeft, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ResultPill } from '@/components/ui/ResultPill';
import { DirectionPill } from '@/components/ui/DirectionPill';
import { Stat } from '@/components/ui/Stat';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { tradeRepository } from '@/data/supabaseTradeRepository';
import { readFieldLabel } from '@/domain/templates/resolve';
import { formatDateLong, formatR, formatDuration } from '@/lib/format';
import type { Trade } from '@/domain/models/trade';

export function TradeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { remove } = useTradesStore();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      const t = await tradeRepository.get(id);
      if (!cancelled) {
        setTrade(t);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm('Delete this trade?')) return;
    setDeleting(true);
    await remove(id);
    navigate('/journal');
  }

  if (loading) {
    return <div className="text-sm text-fg-muted">Loading…</div>;
  }
  if (!trade) {
    return (
      <div className="space-y-4">
        <PageHeader title="Not found" />
        <Card>
          <CardBody className="text-sm text-fg-muted">Trade not found.</CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Trade #${trade.number ?? '—'}`}
        description={`${trade.instrument} · ${formatDateLong(trade.openedAt)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              <Link to="/journal">Back</Link>
            </Button>
            <Button asChild leftIcon={<Pencil className="h-4 w-4" />}>
              <Link to={`/journal/${trade.id}/edit`}>Edit</Link>
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardBody><Stat label="Realized R" value={formatR(trade.r)} tone={trade.r > 0 ? 'win' : trade.r < 0 ? 'loss' : 'default'} /></CardBody></Card>
        <Card><CardBody><Stat label="Direction" value={<DirectionPill direction={trade.direction} />} /></CardBody></Card>
        <Card><CardBody><Stat label="Outcome" value={<ResultPill result={trade.result} />} /></CardBody></Card>
        <Card><CardBody><Stat label="Duration" value={formatDuration(trade.durationMin)} /></CardBody></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Context</CardTitle></CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Daily Candle</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'dailyCandle')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Daily Profile</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'dailyProfile')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">H4 Candle</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'h4Candle')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">H4 Profile</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'h4Profile')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">M90 / H1 / M30</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'itf')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Day</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'dayOfWeek')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Trade Type</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'tradeType')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Quarter Open</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'quarterOpen')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Driver</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'driver')}</dd></div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Setup</CardTitle></CardHeader>
          <CardBody>
            <dl className="space-y-3.5 text-sm">
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Entry</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'entry')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Alignment</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'alignment')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Module</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'module')}</dd></div>
              <div><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Confluence</dt><dd className="font-medium text-fg">{readFieldLabel(trade, 'confluence')}</dd></div>
            </dl>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Mistakes / Notes</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Mistake / Filter</dt>
              <dd className="font-medium text-fg mt-0.5">{readFieldLabel(trade, 'mistake')}</dd>
            </div>
            {trade.notes ? (
              <div className="rounded-lg border border-line bg-bg-3 p-3.5 text-sm text-fg whitespace-pre-wrap">
                {trade.notes}
              </div>
            ) : (
              <p className="text-sm text-fg-dim">No notes recorded.</p>
            )}
          </CardBody>
        </Card>

        {(trade.photos?.htf || trade.photos?.itf || trade.photos?.ltf) && (
          <Card className="lg:col-span-3">
            <CardHeader><CardTitle>Screenshots</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['htf', 'itf', 'ltf'] as const).map((tf) => {
                  const src = trade.photos?.[tf];
                  return (
                    <div key={tf} className="flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-fg-dim">{tf}</span>
                      {src ? (
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden border border-line bg-bg-2 aspect-video hover:opacity-90 hover:border-line-strong transition-all shadow-sm"
                        >
                          <img src={src} alt={tf.toUpperCase()} className="w-full h-full object-contain" />
                        </a>
                      ) : (
                        <div className="rounded-lg border border-dashed border-line bg-bg-3 aspect-video flex items-center justify-center text-xs text-fg-dim">
                          No image
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
