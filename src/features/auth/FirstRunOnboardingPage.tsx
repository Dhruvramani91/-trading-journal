import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Layers3, NotebookPen } from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loader';
import type { TemplateDefinition } from '@/domain/models/trade';
import { listJournalTemplates, getDefaultTemplateId, saveDefaultTemplateId, saveCustomTemplate } from '@/data/journalTemplateRepository';
import { completeFirstRunOnboarding, needsFirstRunOnboarding } from '@/data/onboardingRepository';

export function FirstRunOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState('default-ict-2026');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadTemplates() {
    setLoading(true);
    setError('');
    try {
      const [required, available, current] = await Promise.all([needsFirstRunOnboarding(), listJournalTemplates(), getDefaultTemplateId()]);
      if (!required) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setTemplates(available);
      setSelectedId(available.some((template) => template.id === current) ? current : available[0]?.id ?? 'default-ict-2026');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load journal templates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTemplates(); }, []);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedId), [templates, selectedId]);

  async function finish(destination: string, templateId?: string) {
    setBusy(true);
    setError('');
    try {
      if (templateId) await saveDefaultTemplateId(templateId);
      await completeFirstRunOnboarding();
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish setup. Please try again.');
      setBusy(false);
    }
  }

  async function createCustomTemplate() {
    setBusy(true);
    setError('');
    try {
      const custom = await saveCustomTemplate({
        id: '',
        name: 'My strategy',
        description: 'A personal strategy template. Add the fields that matter to your approach.',
        photoCount: 3,
        fields: [],
      });
      await saveDefaultTemplateId(custom.id);
      await completeFirstRunOnboarding();
      navigate('/settings/templates', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your template. Please try again.');
      setBusy(false);
    }
  }

  if (loading) return <PageLoader title="Preparing your journal…" className="min-h-dvh bg-bg-0" />;

  return (
    <main className="min-h-dvh bg-bg-0 px-4 py-6 text-fg sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <Button variant="ghost" onClick={() => void finish('/dashboard')} disabled={busy}>Skip setup</Button>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)] lg:gap-16">
          <section className="max-w-xl">
            <div className="mb-5 flex items-center gap-2 text-xs font-medium text-fg-muted" aria-label={`Step ${step} of 2`}>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-bg-3 px-2 text-fg">{step}</span>
              <span>of 2 · Journal setup</span>
            </div>

            {step === 1 ? (
              <>
                <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-4xl">Build a journal around the way you trade.</h1>
                <p className="mt-4 max-w-lg text-base leading-7 text-fg-muted">Choose a strategy template to shape your trade form and statistics. You can change it later, and every saved trade keeps its original fields.</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="lg" onClick={() => setStep(2)} rightIcon={<ArrowRight className="h-4 w-4" />}>Set up my journal</Button>
                  <span className="text-sm text-fg-dim">Takes about a minute</span>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep(1)} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" disabled={busy}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-4xl">Choose a starting template.</h1>
                <p className="mt-3 text-sm leading-6 text-fg-muted">This sets the fields for new trades. You can switch templates or customize a copy later in Settings.</p>
                <fieldset className="mt-6 space-y-2" aria-label="Choose a journal template">
                  {templates.map((template) => {
                    const selected = selectedId === template.id;
                    return (
                      <label key={template.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors focus-within:ring-2 focus-within:ring-focus ${selected ? 'border-line-strong bg-primary-soft' : 'border-line bg-bg-1 hover:bg-bg-3'}`}>
                        <input type="radio" name="journal-template" value={template.id} checked={selected} onChange={() => setSelectedId(template.id)} className="sr-only" />
                        <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-fg bg-fg text-bg-0' : 'border-line-strong'}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-fg">{template.name}</span>
                          <span className="mt-1 block text-sm leading-5 text-fg-muted">{template.description}</span>
                          <span className="mt-2 block text-xs text-fg-dim">{template.fields.length} strategy fields · {template.fields.filter((field) => field.inStats).length} statistics breakdowns</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                {error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss-text"><span>{error}</span><Button type="button" variant="secondary" size="sm" onClick={() => void loadTemplates()} disabled={loading || busy}>Try again</Button></div>}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="lg" disabled={busy || !selectedTemplate} onClick={() => void finish('/journal/new', selectedId)}>{busy ? 'Saving…' : `Use ${selectedTemplate?.name ?? 'template'}`}</Button>
                  <Button variant="secondary" size="lg" disabled={busy} onClick={() => void createCustomTemplate()} leftIcon={<Layers3 className="h-4 w-4" />}>Create my own</Button>
                </div>
              </>
            )}
          </section>

          <aside className="hidden lg:block" aria-label="What you can do with your journal">
            <Card className="overflow-hidden bg-bg-1">
              <div className="border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-3 text-fg"><NotebookPen className="h-5 w-5" /></span>
                  <div><h2 className="font-semibold text-fg">A clear review loop</h2><p className="mt-0.5 text-sm text-fg-muted">Capture, compare, improve.</p></div>
                </div>
              </div>
              <ol className="divide-y divide-line px-5">
                <li className="flex gap-3 py-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-3 text-xs text-fg-muted">1</span><div><p className="font-medium text-fg">Record the trade</p><p className="mt-1 text-sm leading-5 text-fg-muted">Log outcome, execution, and the context behind your setup.</p></div></li>
                <li className="flex gap-3 py-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-3 text-xs text-fg-muted">2</span><div><p className="font-medium text-fg">See your patterns</p><p className="mt-1 text-sm leading-5 text-fg-muted">Use statistics to compare what is working across your trades.</p></div></li>
                <li className="flex gap-3 py-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-3 text-xs text-fg-muted">3</span><div><p className="font-medium text-fg">Refine your process</p><p className="mt-1 text-sm leading-5 text-fg-muted">Keep lessons and mistakes connected to the trade.</p></div></li>
              </ol>
              <div className="flex items-start gap-2 border-t border-line px-5 py-3 text-xs leading-5 text-fg-muted"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />You can revisit templates any time. Changing the default affects future trades only.</div>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
