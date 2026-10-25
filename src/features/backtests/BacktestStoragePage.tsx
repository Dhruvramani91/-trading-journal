import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, FlaskConical, ImagePlus, Pencil, Plus, ScrollText, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField, Segmented, Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { AnimatedCheckBox } from '@/components/ui/animated-check-box';
import { Switch } from '@/components/ui/switch';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { WinRateRing } from '@/components/stats/WinRateRing';
import { WeeklySummary } from '@/components/calendar/WeeklySummary';
import { BreakdownCard } from '@/components/stats/BreakdownCard';
import { InstrumentMark } from '@/components/trade/InstrumentMark';
import { TradeGradeBadge } from '@/components/trade/TradeGradeBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { createBacktestSession, deleteBacktestSession, deleteBacktestTrade, listBacktestSessions, listBacktestTrades, saveBacktestTrade, updateBacktestSession } from '@/data/backtestSessionRepository';
import { getDefaultTemplateId, listJournalTemplates } from '@/data/journalTemplateRepository';
import type { BacktestSection, BacktestSession, BacktestTrade, BacktestTradeInput } from '@/domain/models/backtestSession';
import type { TemplateDefinition, Trade } from '@/domain/models/trade';
import { resolveTradePhotoUrl, type TradePhotos } from '@/lib/tradePhotos';
import { formatMoney, formatPct, formatR } from '@/lib/format';
import { allBreakdowns, gradePerformance, summary } from '@/analytics/core';
import { cn } from '@/lib/cn';
import { describedByIds, useFormFieldContext } from '@/components/ui/FormFieldContext';

const INSTRUMENTS = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'GC', 'SI', '6E', '6B', 'ZN', 'BTC', 'ETH', 'Other'];
function InstrumentMultiSelect({ selected, onToggle }: { selected: string[]; onToggle: (instrument: string) => void }) {
  const field = useFormFieldContext();
  return (
    <div role="group" aria-labelledby={field?.labelId} aria-describedby={describedByIds(field?.hintId, field?.errorId)} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {INSTRUMENTS.map((instrument) => {
        const isSelected = selected.includes(instrument);
        return (
          <button
            key={instrument}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(instrument)}
            className={`flex h-10 items-center justify-between rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 ${isSelected ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-bg-2 text-fg-muted hover:border-line-strong hover:text-fg'}`}
          >
            {instrument}
            {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
const SECTIONS: { id: BacktestSection; label: string; icon: typeof BarChart3 }[] = [
  { id: 'journal', label: 'Journal', icon: ScrollText },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

export function BacktestStoragePage() {
  const { sessionId, section, tradeId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<BacktestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState('');

  async function reload() {
    setLoading(true);
    try {
      const [loadedSessions, loadedTemplates, defaultId] = await Promise.all([
        listBacktestSessions(), listJournalTemplates(), getDefaultTemplateId(),
      ]);
      setSessions(loadedSessions);
      setTemplates(loadedTemplates);
      setDefaultTemplateId(defaultId);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load backtest storage.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);
  const activeSession = useMemo(() => sessions.find((item) => item.id === sessionId), [sessions, sessionId]);
  const activeSection: BacktestSection = SECTIONS.some((item) => item.id === section) ? section as BacktestSection : 'journal';

  async function saveSession(input: { name: string; instruments: string[]; startDate: string; endDate: string; template: TemplateDefinition }, sessionId?: string) {
    const saved = sessionId ? await updateBacktestSession(sessionId, input) : await createBacktestSession(input);
    setSessions((current) => sessionId ? current.map((session) => session.id === sessionId ? saved : session) : [saved, ...current]);
    setCreateOpen(false);
    setEditingSession(null);
    if (!sessionId) navigate(`/backtests/${saved.id}/journal`);
  }

  async function removeSession(session: BacktestSession) {
    if (!window.confirm(`Delete “${session.name}” and all of its backtest trades? This cannot be undone.`)) return;
    setDeletingSessionId(session.id); setError('');
    try {
      await deleteBacktestSession(session.id);
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete backtest session.');
    } finally { setDeletingSessionId(''); }
  }

  if (sessionId && activeSession) {
    return <BacktestWorkspace session={activeSession} section={activeSection} tradeId={tradeId} onBack={() => navigate('/backtests')} onSection={(next) => navigate(`/backtests/${activeSession.id}/${next}`)} onTrade={(id) => navigate(`/backtests/${activeSession.id}/trade/${id}`)} />;
  }

  if (loading) {
    return (
      <Loader
        title="Loading backtest sessions…"
        subtitle="Preparing your backtest workspace."
        className="min-h-[calc(100dvh-6rem)] sm:min-h-[calc(100dvh-6.5rem)] md:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-3.5rem)]"
      />
    );
  }

  return <>
    <PageHeader
      title="Backtest storage"
      description="Create independent workspaces for historical practice. Backtest data stays separate from your live journal."
      actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Create backtest</Button>}
    />
    {error && <div role="alert" className="mb-4 rounded-lg border border-line bg-bg-3 px-4 py-3 text-sm text-fg">{error}</div>}
    {sessions.length === 0 ? <Card><CardBody className="flex flex-col items-center py-14 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-bg-3 text-accent"><FlaskConical className="h-5 w-5" /></span>
        <h2 className="text-base font-semibold text-fg">Start a backtest workspace</h2>
        <p className="mt-1 max-w-md text-sm text-fg-muted">Set the instruments, date range, and strategy template you’re testing. It won’t mix with your regular journal.</p>
        <Button className="mt-5" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Create backtest</Button>
      </CardBody></Card>
      : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sessions.map((session) => <Card key={session.id} className="group flex h-full flex-col transition-colors hover:border-accent/40">
        <button type="button" onClick={() => navigate(`/backtests/${session.id}/journal`)} className="w-full flex-1 rounded-t-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50">
          <CardHeader><CardTitle className="truncate">{session.name}</CardTitle><span className="shrink-0 text-xs text-fg-dim">{session.templateSnapshot.name}</span></CardHeader><CardBody className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5">{session.instruments.map((instrument) => <span key={instrument} className="rounded-md border border-line bg-bg-3 px-2 py-0.5 text-xs text-fg-muted">{instrument}</span>)}</div>
          <p className="text-xs text-fg-muted">{formatDate(session.startDate)} – {formatDate(session.endDate)}</p>
          </CardBody>
        </button>
        <footer className="flex justify-end gap-1 border-t border-line px-3 py-2">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${session.name}`} title="Edit backtest" onClick={() => setEditingSession(session)} className="text-fg-dim hover:bg-bg-4 hover:text-fg"><Pencil className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${session.name}`} title="Delete backtest" disabled={deletingSessionId === session.id} onClick={() => void removeSession(session)} className="text-fg-dim hover:bg-bg-4 hover:text-loss"><Trash2 className="h-4 w-4" /></Button>
        </footer>
      </Card>)}</div>}
    <CreateSessionDialog
      open={createOpen || editingSession !== null}
      onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditingSession(null); } }}
      session={editingSession}
      templates={templates}
      defaultTemplateId={defaultTemplateId}
      onSave={saveSession}
    />
  </>;
}

function CreateSessionDialog({ open, onOpenChange, session, templates, defaultTemplateId, onSave }: {
  open: boolean; onOpenChange: (open: boolean) => void; templates: TemplateDefinition[]; defaultTemplateId: string;
  session: BacktestSession | null;
  onSave: (input: { name: string; instruments: string[]; startDate: string; endDate: string; template: TemplateDefinition }, sessionId?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(session?.name ?? ''); setInstruments(session?.instruments ?? []); setStartDate(session?.startDate ?? ''); setEndDate(session?.endDate ?? ''); setError('');
    setTemplateId(session?.templateId ?? (templates.some((template) => template.id === defaultTemplateId) ? defaultTemplateId : templates[0]?.id ?? ''));
  }, [open, templates, defaultTemplateId, session]);

  const toggleInstrument = (instrument: string) => setInstruments((selected) => selected.includes(instrument) ? selected.filter((item) => item !== instrument) : [...selected, instrument]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const template = templates.find((item) => item.id === templateId);
    if (!template) { setError('Choose a journal template.'); return; }
    if (!instruments.length) { setError('Select at least one instrument.'); return; }
    if (startDate > endDate) { setError('End date must be on or after the start date.'); return; }
    setBusy(true); setError('');
    try { await onSave({ name, instruments, startDate, endDate, template }, session?.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save this session.'); }
    finally { setBusy(false); }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-0/75 backdrop-blur-sm" />
      <Dialog.Content data-select-portal aria-describedby="backtest-create-description" className="fixed left-1/2 top-1/2 z-[51] max-h-[90dvh] w-[min(620px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl border border-line bg-bg-1 shadow-pop focus:outline-none">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div><Dialog.Title className="text-lg font-semibold text-fg">{session ? 'Edit backtest session' : 'Create backtest session'}</Dialog.Title><Dialog.Description id="backtest-create-description" className="mt-1 text-sm text-fg-muted">Choose the scope and strategy for this independent backtest.</Dialog.Description></div>
          <Dialog.Close asChild><Button variant="ghost" size="icon-sm" aria-label="Close"><X className="h-4 w-4" /></Button></Dialog.Close>
        </header>
        <form onSubmit={submit} className="max-h-[calc(90dvh-76px)] min-h-0 space-y-5 overflow-y-auto p-5">
          <FormField label="Session name" required><Input autoFocus maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. NQ London session replay" /></FormField>
          <FormField label="Instruments" required hint="Choose one or more instruments.">
            <InstrumentMultiSelect selected={instruments} onToggle={toggleInstrument} />
            {instruments.length > 0 && <p className="mt-1 text-xs text-fg-dim">Selected: {instruments.join(', ')}</p>}
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Start date" required><Input type="date" required value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></FormField>
            <FormField label="End date" required><Input type="date" required value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></FormField>
          </div>
          <FormField label="Journal template" required hint="Defaults to your selected template. You can choose a different one for this session.">
            <Select value={templateId} required onChange={(event) => setTemplateId(event.target.value)}>
              {templates.length === 0 ? <option value="">No templates available</option> : templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.id === defaultTemplateId ? ' · Default' : ''}</option>)}
            </Select>
          </FormField>
          {error && <p role="alert" className="rounded-lg border border-line bg-bg-3 px-3 py-2 text-sm text-fg">{error}</p>}
          <footer className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-line bg-bg-1/95 px-5 pt-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm motion-reduce:backdrop-blur-none">
            <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={busy || !templates.length} leftIcon={session ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>{busy ? 'Saving…' : session ? 'Save changes' : 'Create session'}</Button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function BacktestWorkspace({ session, section, tradeId, onBack, onSection, onTrade }: { session: BacktestSession; section: BacktestSection; tradeId?: string; onBack: () => void; onSection: (section: BacktestSection) => void; onTrade: (tradeId: string) => void }) {
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [tradeLoading, setTradeLoading] = useState(true);
  const [tradeError, setTradeError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<BacktestTrade | null>(null);
  const [saving, setSaving] = useState(false);
  async function reloadTrades() {
    setTradeLoading(true);
    try { setTrades(await listBacktestTrades(session.id)); setTradeError(''); }
    catch (reason) { setTradeError(reason instanceof Error ? reason.message : 'Could not load trades.'); }
    finally { setTradeLoading(false); }
  }
  useEffect(() => { void reloadTrades(); }, [session.id]);
  async function saveTrade(input: BacktestTradeInput) {
    setSaving(true);
    try {
      const saved = await saveBacktestTrade(session.id, input, editingTrade?.id);
      setTrades((current) => [saved, ...current.filter((trade) => trade.id !== saved.id)].sort((a, b) => b.openedAt.localeCompare(a.openedAt)));
      setEditorOpen(false); setEditingTrade(null); setTradeError('');
    } catch (reason) { setTradeError(reason instanceof Error ? reason.message : 'Could not save trade.'); }
    finally { setSaving(false); }
  }
  async function removeTrade(trade: BacktestTrade) {
    if (!window.confirm('Delete this backtest trade?')) return;
    try { await deleteBacktestTrade(session.id, trade.id); setTrades((current) => current.filter((item) => item.id !== trade.id)); }
    catch (reason) { setTradeError(reason instanceof Error ? reason.message : 'Could not delete trade.'); }
  }
  const activeTab = SECTIONS.find((item) => item.id === section)!;
  const selectedTrade = trades.find((trade) => trade.id === tradeId);
  if (tradeId) {
    return <>
      <BacktestTradeDetails session={session} trade={selectedTrade} loading={tradeLoading} onBack={() => onSection('journal')} onEdit={() => { if (selectedTrade) { setEditingTrade(selectedTrade); setEditorOpen(true); } }} onDelete={() => { if (selectedTrade) void removeTrade(selectedTrade).then(() => onSection('journal')); }} />
      <BacktestTradeDialog open={editorOpen} onOpenChange={setEditorOpen} session={session} trade={editingTrade} saving={saving} onSave={(input) => void saveTrade(input)} />
    </>;
  }
  return <>
    <div className="mb-5"><Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ChevronLeft className="h-4 w-4" />}>All backtests</Button></div>
    <PageHeader title={session.name} description={`${session.templateSnapshot.name} · ${session.instruments.join(', ')} · ${formatDate(session.startDate)} – ${formatDate(session.endDate)}`} actions={section === 'journal' ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTrade(null); setEditorOpen(true); }}>Add backtest trade</Button> : undefined} />
    <nav aria-label="Backtest sections" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-bg-2 p-1">
      {SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onSection(id)} aria-current={section === id ? 'page' : undefined} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${section === id ? 'bg-bg-4 text-fg shadow-sm' : 'text-fg-muted hover:bg-bg-3 hover:text-fg'}`}><Icon className="h-4 w-4" />{label}</button>)}
    </nav>
    {tradeError && <div role="alert" className="mb-4 rounded-lg border border-line bg-bg-3 px-4 py-3 text-sm text-fg">{tradeError}</div>}
    {section === 'journal' ? <Card><CardHeader><CardTitle>Backtest journal</CardTitle></CardHeader><CardBody className="p-0">
      {tradeLoading ? <p className="px-5 py-8 text-center text-sm text-fg-muted">Loading trades…</p> : trades.length === 0 ? <div className="py-10 text-center"><h2 className="text-sm font-semibold text-fg">No backtest trades yet</h2><p className="mt-1 text-sm text-fg-muted">Add a trade to this session. It stays separate from your regular journal.</p><Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTrade(null); setEditorOpen(true); }}>Add backtest trade</Button></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-line bg-bg-3 text-xs uppercase tracking-wide text-fg-dim"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Instrument</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">R</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-line">{trades.map((trade) => <tr key={trade.id} tabIndex={0} role="link" onClick={() => onTrade(trade.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTrade(trade.id); } }} className="cursor-pointer hover:bg-bg-3/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/50"><td className="px-4 py-3 text-fg-muted">{formatDate(trade.openedAt)}</td><td className="px-4 py-3 font-medium text-fg">{trade.instrument}</td><td className="px-4 py-3 capitalize text-fg-muted">{trade.direction}</td><td className="px-4 py-3 capitalize text-fg-muted">{trade.result}</td><td className="px-4 py-3 text-fg-muted">{trade.grade ?? '—'}</td><td className="px-4 py-3 text-fg-muted">{trade.realizedR ?? '—'}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${trade.instrument} trade`} title="Edit trade" onClick={(event) => { event.stopPropagation(); setEditingTrade(trade); setEditorOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${trade.instrument} trade`} title="Delete trade" onClick={(event) => { event.stopPropagation(); void removeTrade(trade); }}><Trash2 className="h-4 w-4 text-loss" /></Button></div></td></tr>)}</tbody></table></div>}
    </CardBody></Card> : section === 'statistics' ? <BacktestStatistics session={session} trades={trades} /> : section === 'calendar' ? <BacktestCalendar session={session} trades={trades} /> : <Card><CardHeader><CardTitle>{activeTab.label}</CardTitle></CardHeader><CardBody>
      <div className="py-7 text-center"><span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-3 text-fg-muted"><activeTab.icon className="h-4 w-4" /></span><h2 className="text-sm font-semibold text-fg">{trades.length ? 'Nothing to summarize yet' : 'No backtest trades yet'}</h2><p className="mx-auto mt-1 max-w-lg text-sm text-fg-muted">{trades.length ? `The ${section} breakdown will be available as the backtest analytics are added.` : 'Add trades to this session to build its independent performance history.'}</p></div>
    </CardBody></Card>}
    <BacktestTradeDialog open={editorOpen} onOpenChange={setEditorOpen} session={session} trade={editingTrade} saving={saving} onSave={(input) => void saveTrade(input)} />
  </>;
}

function BacktestCalendar({ session, trades }: { session: BacktestSession; trades: BacktestTrade[] }) {
  const start = new Date(`${session.startDate}T00:00:00`);
  const end = new Date(`${session.endDate}T00:00:00`);
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const [showWeekends, setShowWeekends] = useState(true);
  const [showR, setShowR] = useState(true);
  const [showPnl, setShowPnl] = useState(true);
  const weekendsId = useId(); const rId = useId(); const pnlId = useId();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWeekday = monthStart.getDay() === 0 ? 7 : monthStart.getDay();
  const offset = showWeekends ? firstWeekday - 1 : firstWeekday > 5 ? 0 : firstWeekday - 1;
  const totalDays = monthEnd.getDate();
  const dayCount = showWeekends ? totalDays : Array.from({ length: totalDays }, (_, index) => new Date(year, month, index + 1)).filter((date) => date.getDay() !== 0 && date.getDay() !== 6).length;
  const rowCount = Math.ceil((offset + dayCount) / (showWeekends ? 7 : 5));
  const weekdays = showWeekends ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const minMonth = start.getFullYear() * 12 + start.getMonth();
  const maxMonth = end.getFullYear() * 12 + end.getMonth();
  const currentMonth = year * 12 + month;
  const aggregates = new Map<string, { count: number; wins: number; losses: number; bes: number; r: number; pnl: number | null }>();
  for (const trade of trades) {
    const key = trade.openedAt.slice(0, 10);
    if (key < session.startDate || key > session.endDate) continue;
    const current = aggregates.get(key) ?? { count: 0, wins: 0, losses: 0, bes: 0, r: 0, pnl: null };
    current.count += 1; current.r += trade.realizedR ?? 0;
    if (trade.result === 'win') current.wins += 1; else if (trade.result === 'loss') current.losses += 1; else current.bes += 1;
    if (trade.pnl != null && Number.isFinite(trade.pnl)) current.pnl = (current.pnl ?? 0) + trade.pnl;
    aggregates.set(key, current);
  }
  const weeklySummary = Array.from({ length: rowCount }, () => ({ count: 0, wins: 0, losses: 0, bes: 0, totalR: 0 }));
  for (const [key, day] of aggregates) {
    const date = new Date(`${key}T00:00:00`);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const dayOfMonth = date.getDate();
    const visibleIndex = showWeekends
      ? dayOfMonth - 1
      : Array.from({ length: dayOfMonth - 1 }, (_, index) => new Date(year, month, index + 1)).filter((item) => item.getDay() !== 0 && item.getDay() !== 6).length;
    const week = weeklySummary[Math.floor((offset + visibleIndex) / (showWeekends ? 7 : 5))];
    if (!week) continue;
    week.count += day.count; week.wins += day.wins; week.losses += day.losses; week.bes += day.bes; week.totalR += day.r;
  }
  function moveMonth(delta: number) {
    const date = new Date(year, month + delta, 1); setYear(date.getFullYear()); setMonth(date.getMonth());
  }
  return <Card className="overflow-hidden"><CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex w-full items-center justify-between gap-2 sm:w-auto"><Button variant="secondary" size="sm" disabled={currentMonth <= minMonth} onClick={() => moveMonth(-1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>Prev</Button><h2 className="min-w-36 text-center text-base font-bold text-fg">{monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><Button variant="secondary" size="sm" disabled={currentMonth >= maxMonth} onClick={() => moveMonth(1)} rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button></div>
    <div className="flex flex-wrap items-center justify-end gap-2">{[[weekendsId, 'Weekends', showWeekends, setShowWeekends], [rId, 'R', showR, setShowR], [pnlId, 'P&L', showPnl, setShowPnl]].map(([id, label, checked, setChecked]) => <div key={String(id)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2 px-2.5 py-1.5 text-xs font-medium text-fg-muted"><label htmlFor={String(id)} className="cursor-pointer">{String(label)}</label><Switch id={String(id)} checked={Boolean(checked)} onCheckedChange={setChecked as (checked: boolean) => void} aria-label={`Show ${String(label)}`} /></div>)}</div>
  </CardHeader><CardBody className="p-2 sm:p-4"><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_150px]">
    <div>
    <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${showWeekends ? 7 : 5}, minmax(0, 1fr))` }}>{weekdays.map((day) => <div key={day} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-fg-dim sm:text-[11px]">{day}</div>)}</div>
    <div className="grid gap-1 sm:gap-2" style={{ gridTemplateColumns: `repeat(${showWeekends ? 7 : 5}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rowCount}, minmax(84px, 1fr))` }}>{Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1; const date = new Date(year, month, day); const weekday = date.getDay();
      if (!showWeekends && (weekday === 0 || weekday === 6)) return null;
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const insideRange = key >= session.startDate && key <= session.endDate;
      const performance = aggregates.get(key);
      const today = key === new Date().toLocaleDateString('en-CA');
      const tint = performance ? performance.r > 0 ? 'border-win-fill/35 bg-win-fill/10' : performance.r < 0 ? 'border-loss-fill/35 bg-loss-fill/10' : 'border-be/35 bg-be/10' : '';
      return <div key={key} style={day === 1 ? { gridColumnStart: offset + 1 } : undefined} className={`flex min-h-[84px] flex-col rounded-lg border p-2 sm:min-h-[102px] sm:p-3 ${insideRange ? `border-line bg-bg-2 ${tint}` : 'border-line/40 bg-bg-1/40 opacity-40'} ${today ? 'ring-2 ring-focus' : ''}`}><div className="flex items-start justify-between gap-1"><span className={`text-xs font-medium ${insideRange ? 'text-fg-muted' : 'text-fg-dim'}`}>{day}</span>{performance && <span className="truncate text-[9px] text-fg-dim sm:text-[10px]">{performance.count} trade{performance.count === 1 ? '' : 's'}</span>}</div>{performance && (showR || showPnl) && <div className="mt-auto space-y-1 pt-2">{showR && <div className={`flex justify-between gap-1 text-[10px] font-semibold tabular-nums sm:text-xs ${performance.r > 0 ? 'text-win' : performance.r < 0 ? 'text-loss' : 'text-be'}`}><span className="text-fg-dim">R</span><span>{performance.r > 0 ? '+' : ''}{performance.r.toFixed(2)}R</span></div>}{showPnl && <div className="flex justify-between gap-1 text-[10px] font-semibold tabular-nums sm:text-xs"><span className="text-fg-dim">P&amp;L</span><span className={performance.pnl == null ? 'text-fg-dim' : performance.pnl > 0 ? 'text-win' : performance.pnl < 0 ? 'text-loss' : 'text-be'}>{performance.pnl == null ? '—' : `${performance.pnl > 0 ? '+' : ''}${performance.pnl.toFixed(2)}`}</span></div>}</div>}</div>;
    })}</div>
    </div><WeeklySummary weeks={weeklySummary} />
    <p className="mt-3 text-xs text-fg-dim">Showing {formatDate(session.startDate)} – {formatDate(session.endDate)}. Dates outside this backtest range are dimmed.</p>
    </div>
  </CardBody></Card>;
}

function BacktestStatistics({ session, trades }: { session: BacktestSession; trades: BacktestTrade[] }) {
  const [tab, setTab] = useState('instrument');
  const analyticsTrades = useMemo<Trade[]>(() => trades.map((trade, index) => ({
    id: trade.id, templateId: session.templateSnapshot.id, templateSnapshot: session.templateSnapshot,
    number: index + 1, openedAt: `${trade.openedAt.slice(0, 10)}T12:00:00.000Z`, instrument: trade.instrument,
    direction: trade.direction, result: trade.result, grade: trade.grade, pnl: trade.pnl,
    r: trade.realizedR ?? 0, durationMin: 0, templateData: trade.templateData, notes: trade.notes,
    photos: trade.photos, createdAt: trade.createdAt, updatedAt: trade.createdAt,
  })), [session.templateSnapshot, trades]);
  const stats = useMemo(() => summary(analyticsTrades), [analyticsTrades]);
  const breakdowns = useMemo(() => allBreakdowns(analyticsTrades, session.templateSnapshot), [analyticsTrades, session.templateSnapshot]);
  const grades = useMemo(() => gradePerformance(analyticsTrades), [analyticsTrades]);
  const pnlStats = useMemo(() => {
    let totalPnl = 0; let bestPnl = -Infinity; let worstPnl = Infinity;
    for (const trade of analyticsTrades) { const value = typeof trade.pnl === 'number' && Number.isFinite(trade.pnl) ? trade.pnl : 0; totalPnl += value; bestPnl = Math.max(bestPnl, value); worstPnl = Math.min(worstPnl, value); }
    const ordered = [...analyticsTrades].sort((a, b) => a.openedAt.localeCompare(b.openedAt)); let cumulative = 0; let peak = 0; let drawdown = 0;
    for (const trade of ordered) { cumulative += typeof trade.pnl === 'number' && Number.isFinite(trade.pnl) ? trade.pnl : 0; peak = Math.max(peak, cumulative); drawdown = Math.max(drawdown, peak - cumulative); }
    return { totalPnl, averagePnl: analyticsTrades.length ? totalPnl / analyticsTrades.length : 0, bestPnl: bestPnl === -Infinity ? 0 : bestPnl, worstPnl: worstPnl === Infinity ? 0 : worstPnl, drawdown };
  }, [analyticsTrades]);
  const instruments = useMemo(() => {
    const map = new Map<string, { count: number; totalR: number; totalPnl: number; wins: number; losses: number }>();
    for (const trade of analyticsTrades) { const row = map.get(trade.instrument) ?? { count: 0, totalR: 0, totalPnl: 0, wins: 0, losses: 0 }; row.count++; row.totalR += trade.r; row.totalPnl += typeof trade.pnl === 'number' && Number.isFinite(trade.pnl) ? trade.pnl : 0; if (trade.result === 'win') row.wins++; if (trade.result === 'loss') row.losses++; map.set(trade.instrument, row); }
    return [...map.entries()].sort((a, b) => b[1].totalR - a[1].totalR);
  }, [analyticsTrades]);
  const tabs = [{ key: 'instrument', label: 'Instruments' }, { key: 'grade', label: 'Grades' }, ...breakdowns.map((item) => ({ key: item.fieldKey, label: item.fieldLabel }))];
  const active = breakdowns.find((item) => item.fieldKey === tab);
  const showGrades = tab === 'grade'; const showInstruments = tab === 'instrument' || (!active && !showGrades);
  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault(); const index = Math.max(0, tabs.findIndex((item) => item.key === tab));
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    if (!next) return; setTab(next.key); document.getElementById(`backtest-stats-tab-${next.key}`)?.focus();
  }
  if (analyticsTrades.length === 0) return <div className="space-y-4"><PageHeader title="Statistics" description="How your backtest trades perform, broken down by category." /><EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No trades to analyze" description="Add trades from this backtest journal to generate statistics." /></div>;

  const toneOf = (value: number) => value > 0 ? 'win' as const : value < 0 ? 'loss' as const : undefined;
  const Metric = ({ label, value, sub, tone, size = 'lg', aside }: { label: string; value: string; sub?: React.ReactNode; tone?: 'win' | 'loss'; size?: 'lg' | 'sm'; aside?: React.ReactNode }) => <div className="flex min-h-[88px] min-w-0 items-start justify-between gap-3 rounded-xl border border-line bg-bg-1 p-4 shadow-sm transition-colors hover:border-line-strong"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-dim">{label}</p><p className={cn('mt-1 font-semibold tabular-nums tracking-tight', size === 'lg' ? 'text-2xl sm:text-[1.75rem]' : 'text-lg', tone === 'win' && 'text-win', tone === 'loss' && 'text-loss', !tone && 'text-fg')}>{value}</p>{sub && <div className="mt-1.5 text-2xs text-fg-muted">{sub}</div>}</div>{aside}</div>;
  const maxAbsR = Math.max(1, ...instruments.map(([, value]) => Math.abs(value.totalR)));
  return <div className="space-y-6"><PageHeader title="Statistics" description="How your backtest trades perform, broken down by category." />
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-5 xl:p-6">
        <Metric label="Total R" value={formatR(stats.totalR)} tone={toneOf(stats.totalR)} />
        <Metric label="Total P&L" value={formatMoney(pnlStats.totalPnl)} tone={toneOf(pnlStats.totalPnl)} />
        <Metric label="Win rate" value={stats.winRate == null ? '—' : formatPct(stats.winRate)} sub={`Avg R ${formatR(stats.avgR)}`} aside={<WinRateRing rate={stats.winRate ?? 0} size={40} />} />
        <Metric label="Trades" value={String(stats.count)} sub={<span className="flex flex-wrap gap-1.5"><Badge tone="win">{stats.wins} W</Badge><Badge tone="loss">{stats.losses} L</Badge><Badge tone="be">{stats.bes} BE</Badge></span>} />
        <Metric label="Expectancy" value={formatR(stats.expectancy)} tone={toneOf(stats.expectancy)} />
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-line bg-bg-3/40 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-5 xl:px-6">
        <Metric size="sm" label="Best trade" value={formatR(stats.bestR)} tone="win" /><Metric size="sm" label="Best P&L" value={formatMoney(pnlStats.bestPnl)} tone="win" /><Metric size="sm" label="Worst trade" value={formatR(stats.worstR)} tone="loss" /><Metric size="sm" label="Worst P&L" value={formatMoney(pnlStats.worstPnl)} tone="loss" /><Metric size="sm" label="Max drawdown" value={formatR(stats.maxDrawdownR)} tone="loss" />
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-line bg-bg-3/20 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-5 xl:px-6">
        <Metric size="sm" label="Average P&L" value={formatMoney(pnlStats.averagePnl)} tone={toneOf(pnlStats.averagePnl)} /><Metric size="sm" label="P&L drawdown" value={formatMoney(pnlStats.drawdown)} tone="loss" /><Metric size="sm" label="Longest win streak" value={String(stats.longestWinStreak)} /><Metric size="sm" label="Longest loss streak" value={String(stats.longestLossStreak)} /><Metric size="sm" label="R / P&L" value={`${formatR(stats.avgR)} · ${formatMoney(pnlStats.averagePnl)}`} />
      </div>
    </Card>
    <div><div role="tablist" aria-label="Backtest results breakdown" onKeyDown={handleTabKeys} className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-line bg-bg-2 p-2 shadow-sm">{tabs.map((item) => { const selected = item.key === tab; return <button key={item.key} id={`backtest-stats-tab-${item.key}`} type="button" role="tab" aria-selected={selected} aria-controls="backtest-stats-panel" tabIndex={selected ? 0 : -1} onClick={() => setTab(item.key)} className={cn('shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40', selected ? 'border-accent bg-accent/10 text-accent shadow-sm' : 'border-transparent text-fg-muted hover:border-line hover:bg-bg-3 hover:text-fg')}>{item.label}</button>; })}</div>
      <div id="backtest-stats-panel" role="tabpanel">{showGrades ? <Card className="overflow-hidden"><div className="border-b border-line bg-bg-1 px-5 py-4"><h2 className="text-base font-semibold text-fg">Trade grade analysis</h2><p className="mt-0.5 text-xs text-fg-muted">Compare execution quality by win rate and realized R.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-bg-3/50 text-left text-xs text-fg-dim"><tr><th className="px-5 py-3 font-medium">Grade</th><th className="px-5 py-3 text-right font-medium">Trades</th><th className="px-5 py-3 text-right font-medium">Win rate</th><th className="px-5 py-3 text-right font-medium">Avg R</th><th className="px-5 py-3 text-right font-medium">Total R</th></tr></thead><tbody>{grades.map((row) => <tr key={row.grade} className="border-t border-line"><td className="px-5 py-3"><TradeGradeBadge grade={row.grade} /></td><td className="px-5 py-3 text-right tabular-nums">{row.count}</td><td className="px-5 py-3 text-right tabular-nums">{row.winRate == null ? '—' : formatPct(row.winRate)}</td><td className={cn('px-5 py-3 text-right font-mono tabular-nums', toneOf(row.averageR) === 'win' ? 'text-win' : toneOf(row.averageR) === 'loss' ? 'text-loss' : 'text-fg-muted')}>{row.count ? formatR(row.averageR) : '—'}</td><td className={cn('px-5 py-3 text-right font-mono tabular-nums', toneOf(row.totalR) === 'win' ? 'text-win' : toneOf(row.totalR) === 'loss' ? 'text-loss' : 'text-fg-muted')}>{row.count ? formatR(row.totalR) : '—'}</td></tr>)}</tbody></table></div></Card> : showInstruments ? <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-line bg-bg-1 px-5 py-4"><div><h2 className="text-base font-semibold text-fg">Instruments</h2><p className="mt-0.5 text-xs text-fg-muted">Performance by traded market</p></div><span className="text-xs text-fg-dim">{instruments.length} traded</span></div>{instruments.map(([instrument, value]) => { const width = Math.abs(value.totalR) / maxAbsR * 50; const winPct = value.count ? Math.round(value.wins / value.count * 100) : 0; const tone = toneOf(value.totalR); const averageR = value.count ? value.totalR / value.count : 0; const averagePnl = value.count ? value.totalPnl / value.count : 0; return <div key={instrument} className="mx-3 my-2 rounded-xl border border-line bg-bg-1 px-4 py-4 transition-colors hover:border-line-strong sm:mx-4"><div className="flex items-baseline justify-between gap-3"><span className="flex min-w-0 items-center gap-2.5 font-medium text-fg"><InstrumentMark instrument={instrument} className="h-8 w-8" /><span className="truncate">{instrument}</span></span><span className={cn('text-lg font-semibold tabular-nums tracking-tight', tone === 'win' && 'text-win', tone === 'loss' && 'text-loss', !tone && 'text-fg-muted')}>{formatR(value.totalR)}</span></div><div className="mt-1 flex items-center justify-between gap-3"><span className="text-xs text-fg-muted">Total P&L</span><span className={cn('text-sm font-semibold tabular-nums', toneOf(value.totalPnl) === 'win' && 'text-win', toneOf(value.totalPnl) === 'loss' && 'text-loss', !toneOf(value.totalPnl) && 'text-fg-muted')}>{formatMoney(value.totalPnl)}</span></div><div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-fg-muted"><span className="flex flex-wrap gap-x-4"><span>{value.count} trade{value.count === 1 ? '' : 's'}</span><span>{winPct}% win rate</span><span>avg {formatR(averageR)}</span><span>avg {formatMoney(averagePnl)}</span></span><span className="flex gap-1.5">{value.wins > 0 && <Badge tone="win">{value.wins} W</Badge>}{value.losses > 0 && <Badge tone="loss">{value.losses} L</Badge>}</span></div><div className="relative mt-3 h-2 rounded-full bg-bg-1"><span className="absolute inset-y-[-3px] left-1/2 w-px bg-line" /><span className={cn('absolute inset-y-0 rounded-full', tone === 'win' && 'bg-win-fill', tone === 'loss' && 'bg-loss-fill', !tone && 'bg-fg-dim')} style={value.totalR === 0 ? { left: 'calc(50% - 3px)', width: 6 } : { left: `${value.totalR > 0 ? 50 : 50 - width}%`, width: `${width}%` }} /></div></div>; })}</Card> : active ? <BreakdownCard key={active.fieldKey} breakdown={active} /> : null}</div>
    </div>
  </div>;
}

function BacktestTradeDetails({ session, trade, loading, onBack, onEdit, onDelete }: { session: BacktestSession; trade?: BacktestTrade; loading: boolean; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  if (loading) return <Card><CardBody className="py-12 text-center text-sm text-fg-muted">Loading trade…</CardBody></Card>;
  if (!trade) return <Card><CardBody className="space-y-4 py-10 text-center"><h2 className="font-semibold text-fg">Trade not found</h2><Button onClick={onBack}>Back to journal</Button></CardBody></Card>;
  const template = session.templateSnapshot;
  const fields = template.fields.filter((field) => field.key !== 'mistake');
  const photoEntries: [string, string][] = [
    ['Image 1', trade.photos?.htf ?? ''], ['Image 2', trade.photos?.itf ?? ''], ['Image 3', trade.photos?.ltf ?? ''],
  ];
  (trade.photos?.additional ?? []).forEach((value, index) => photoEntries.push([`Image ${index + 4}`, value]));
  const visiblePhotos = photoEntries.filter(([, value]) => Boolean(value));
  return <div className="space-y-5"><Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ChevronLeft className="h-4 w-4" />}>Back to journal</Button>
    <PageHeader title={`Backtest trade · ${trade.instrument}`} description={`${session.name} · ${formatDate(trade.openedAt)}`} actions={<><Button onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>Edit trade</Button><Button variant="danger" onClick={onDelete} leftIcon={<Trash2 className="h-4 w-4" />}>Delete</Button></>} />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[
      { label: 'Date', value: formatDate(trade.openedAt) }, { label: 'Direction', value: trade.direction.toUpperCase() }, { label: 'Outcome', value: trade.result.toUpperCase() },
      { label: 'Grade', value: trade.grade ?? '—' }, { label: 'Realized R', value: trade.realizedR == null ? '—' : formatR(trade.realizedR), tone: trade.realizedR == null ? 'default' as const : trade.realizedR > 0 ? 'win' as const : trade.realizedR < 0 ? 'loss' as const : 'default' as const },
      { label: 'P&L', value: trade.pnl == null ? '—' : trade.pnl.toFixed(2), tone: trade.pnl == null ? 'default' as const : trade.pnl > 0 ? 'win' as const : trade.pnl < 0 ? 'loss' as const : 'default' as const },
    ].map((item) => <Card key={item.label}><CardBody><Stat {...item} /></CardBody></Card>)}</div>
    <div className="space-y-4"><h2 className="text-sm font-semibold text-fg-muted">{template.name} strategy details</h2>{fields.length ? <Card><CardBody><dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => { const value = trade.templateData[field.key]; return <div key={field.key}><dt className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">{field.label}</dt><dd className="mt-1 font-medium text-fg">{value == null || value === '' ? '—' : typeof value === 'boolean' ? value ? 'YES' : 'NO' : String(value)}</dd></div>; })}</dl></CardBody></Card> : <Card><CardBody className="text-sm text-fg-dim">No strategy-specific fields.</CardBody></Card>}
      <Card><CardHeader><CardTitle level={3}>Mistakes</CardTitle></CardHeader><CardBody>{trade.mistake ? <p className="text-sm text-fg">{trade.mistake}</p> : <p className="text-sm text-fg-dim">No mistake recorded.</p>}</CardBody></Card>
      <Card><CardHeader><CardTitle level={3}>Notes</CardTitle></CardHeader><CardBody>{trade.notes ? <p className="whitespace-pre-wrap text-sm text-fg">{trade.notes}</p> : <p className="text-sm text-fg-dim">No notes recorded.</p>}</CardBody></Card>
      {visiblePhotos.length > 0 && <Card><CardHeader><CardTitle level={3}>Images</CardTitle></CardHeader><CardBody><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visiblePhotos.map(([label, value]) => <BacktestTradePhoto key={label} label={label} value={value} />)}</div></CardBody></Card>}
    </div>
  </div>;
}

function BacktestTradePhoto({ label, value }: { label: string; value: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let cancelled = false; void resolveTradePhotoUrl(value).then((result) => { if (!cancelled) setUrl(result ?? ''); }).catch(() => { if (!cancelled) setUrl(''); }); return () => { cancelled = true; }; }, [value]);
  return <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-dim">{label}</p>{url ? <a href={url} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden rounded-lg border border-line bg-bg-3"><img src={url} alt={label} className="h-full w-full object-contain" /></a> : <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-line text-xs text-fg-dim">Image unavailable</div>}</div>;
}

function BacktestTradeDialog({ open, onOpenChange, session, trade, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; session: BacktestSession; trade: BacktestTrade | null; saving: boolean; onSave: (input: BacktestTradeInput) => void }) {
  const [openedAt, setOpenedAt] = useState('');
  const [instrument, setInstrument] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [result, setResult] = useState<'win' | 'loss' | 'be'>('win');
  const [grade, setGrade] = useState('');
  const [realizedR, setRealizedR] = useState('');
  const [pnl, setPnl] = useState('');
  const [mistake, setMistake] = useState('');
  const [notes, setNotes] = useState('');
  const [templateData, setTemplateData] = useState<Record<string, string | number | boolean | null>>({});
  const [photos, setPhotos] = useState<TradePhotos>({});
  const [photoCount, setPhotoCount] = useState(3);
  useEffect(() => {
    if (!open) return;
    setOpenedAt(trade?.openedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setInstrument(trade?.instrument ?? session.instruments[0] ?? '');
    setDirection(trade?.direction ?? 'long'); setResult(trade?.result ?? 'win'); setGrade(trade?.grade ?? '');
    setRealizedR(trade?.realizedR == null ? '' : String(trade.realizedR)); setPnl(trade?.pnl == null ? '' : String(trade.pnl));
    setMistake(trade?.mistake ?? ''); setNotes(trade?.notes ?? ''); setTemplateData(trade?.templateData ?? {}); setPhotos(trade?.photos ?? {});
    setPhotoCount(Math.max(session.templateSnapshot.photoCount ?? 3, trade?.photos?.additional?.length ? trade.photos.additional.length + 3 : 3));
  }, [open, trade, session]);
  const fields = session.templateSnapshot.fields.filter((field) => field.key !== 'mistake');
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ openedAt, instrument, direction, result, grade: grade ? grade as BacktestTradeInput['grade'] : undefined, realizedR: realizedR ? Number(realizedR) : undefined, pnl: pnl ? Number(pnl) : undefined, templateData, mistake: mistake || undefined, notes: notes || undefined, photos });
  }
  function updatePhoto(index: number, value: string) {
    setPhotos((current) => {
      if (index === 0) return { ...current, htf: value || undefined };
      if (index === 1) return { ...current, itf: value || undefined };
      if (index === 2) return { ...current, ltf: value || undefined };
      const additional = [...(current.additional ?? [])]; additional[index - 3] = value;
      return { ...current, additional };
    });
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-bg-0/75 backdrop-blur-sm" /><Dialog.Content data-select-portal className="fixed left-1/2 top-1/2 z-[51] max-h-[90dvh] w-[min(760px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl border border-line bg-bg-1 shadow-pop focus:outline-none"><header className="flex items-start justify-between border-b border-line px-5 py-4"><div><Dialog.Title className="text-lg font-semibold text-fg">{trade ? 'Edit backtest trade' : 'Add backtest trade'}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-fg-muted">Saved only inside “{session.name}”.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon-sm" aria-label="Close"><X className="h-4 w-4" /></Button></Dialog.Close></header>
    <form onSubmit={submit} className="max-h-[calc(90dvh-76px)] space-y-5 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Date" required><Input type="date" required min={session.startDate} max={session.endDate} value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} /></FormField><FormField label="Instrument" required><Select value={instrument} required onChange={(event) => setInstrument(event.target.value)}>{session.instruments.map((item) => <option key={item} value={item}>{item}</option>)}</Select></FormField><FormField label="Direction"><Segmented<'long' | 'short'> value={direction} onChange={setDirection} options={[{ value: 'long', label: 'Long', tone: 'win' }, { value: 'short', label: 'Short', tone: 'loss' }]} fullWidth /></FormField><FormField label="Outcome"><Segmented<'win' | 'be' | 'loss'> value={result} onChange={setResult} options={[{ value: 'win', label: 'Win', tone: 'win' }, { value: 'be', label: 'BE', tone: 'neutral' }, { value: 'loss', label: 'Loss', tone: 'loss' }]} fullWidth /></FormField><FormField label="Trade grade"><Select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">Not graded</option>{['A+', 'A', 'B', 'C'].map((value) => <option key={value} value={value}>{value}</option>)}</Select></FormField><FormField label="Realized R"><Input type="number" step="any" value={realizedR} onChange={(event) => setRealizedR(event.target.value)} placeholder="e.g. 2.5" /></FormField><FormField label="P&L"><Input type="number" step="any" value={pnl} onChange={(event) => setPnl(event.target.value)} placeholder="e.g. 150" /></FormField></div>
      {fields.length > 0 && <section className="space-y-3 border-t border-line pt-4"><h3 className="text-sm font-semibold text-fg">{session.templateSnapshot.name} details</h3><div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <FormField key={field.key} label={field.label}>{field.type === 'enum' ? <Select value={String(templateData[field.key] ?? '')} onChange={(event) => setTemplateData((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">Select…</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</Select> : field.type === 'boolean' ? <AnimatedCheckBox aria-label={field.label} checked={templateData[field.key] === true || templateData[field.key] === 'YES' || templateData[field.key] === 'true'} onChange={(event) => setTemplateData((current) => ({ ...current, [field.key]: event.target.checked }))} /> : <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(templateData[field.key] ?? '')} onChange={(event) => setTemplateData((current) => ({ ...current, [field.key]: event.target.value }))} />}</FormField>)}</div></section>}
      <FormField label="Mistake / filter"><Input value={mistake} onChange={(event) => setMistake(event.target.value)} placeholder="Optional" /></FormField><FormField label="Notes"><textarea aria-label="Notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-focus/40" placeholder="Review and observations" /></FormField>
      <section className="space-y-3 border-t border-line pt-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-fg">Images</h3><p className="text-xs text-fg-dim">Add screenshots to review this setup.</p></div><div className="flex items-center gap-2"><Button type="button" variant="secondary" size="icon-sm" aria-label="Remove image slot" title="Remove image slot" disabled={photoCount <= 1} onClick={() => { if (photoCount <= 1) return; updatePhoto(photoCount - 1, ''); setPhotoCount((count) => count - 1); }}><span aria-hidden="true">−</span></Button><span className="min-w-5 text-center text-xs text-fg-muted">{photoCount}</span><Button type="button" variant="secondary" size="icon-sm" aria-label="Add image slot" title="Add image slot" disabled={photoCount >= 10} onClick={() => setPhotoCount((count) => Math.min(10, count + 1))}><Plus className="h-4 w-4" /></Button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: photoCount }, (_, index) => <BacktestPhotoSlot key={index} index={index} value={backtestPhotoAt(photos, index)} onChange={(value) => updatePhoto(index, value)} />)}</div></section>
      <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-bg-1/95 pt-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm motion-reduce:backdrop-blur-none"><Dialog.Close asChild><Button type="button" variant="ghost" disabled={saving}>Cancel</Button></Dialog.Close><Button type="submit" disabled={saving}>{saving ? 'Saving…' : trade ? 'Save changes' : 'Add trade'}</Button></footer></form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function backtestPhotoAt(photos: TradePhotos, index: number) {
  if (index === 0) return photos.htf ?? '';
  if (index === 1) return photos.itf ?? '';
  if (index === 2) return photos.ltf ?? '';
  return photos.additional?.[index - 3] ?? '';
}

function BacktestPhotoSlot({ index, value, onChange }: { index: number; value: string; onChange: (value: string) => void }) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (!value) { setPreview(''); return; }
    void resolveTradePhotoUrl(value).then((url) => { if (!cancelled) setPreview(url ?? ''); }).catch(() => { if (!cancelled) setPreview(''); });
    return () => { cancelled = true; };
  }, [value]);
  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader(); reader.onload = () => onChange(String(reader.result)); reader.readAsDataURL(file);
    event.target.value = '';
  }
  return <div className="overflow-hidden rounded-xl border border-line bg-bg-2"><div className="flex aspect-video items-center justify-center bg-bg-3">{preview ? <img src={preview} alt={`Backtest image ${index + 1}`} className="h-full w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-xs text-fg-dim"><Camera className="h-5 w-5" />No image selected</div>}</div><div className="flex items-center justify-between gap-2 p-2.5"><span className="text-xs font-medium text-fg-muted">Image {index + 1}</span><div className="flex gap-1"><label className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-fg-muted hover:bg-bg-3 hover:text-fg focus-within:ring-2 focus-within:ring-focus/50"><ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />{value ? 'Replace' : 'Upload'}<input type="file" accept="image/*" aria-label={`Upload image ${index + 1}`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={chooseFile} /></label>{value && <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove image ${index + 1}`} onClick={() => onChange('')}><X className="h-4 w-4" /></Button>}</div></div></div>;
}

function formatDate(value: string) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
