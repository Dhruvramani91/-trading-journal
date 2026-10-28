import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Compass,
  Eye,
  LoaderCircle,
  Pencil,
  Save,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Loader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import type { TemplateDefinition } from '@/domain/models/trade';
import {
  listJournalTemplates,
  getDefaultTemplateId,
  saveDefaultTemplateId,
  saveCustomTemplate,
} from '@/data/journalTemplateRepository';
import {
  completeFirstRunOnboarding,
  needsFirstRunOnboarding,
} from '@/data/onboardingRepository';
import { TemplateLivePreview } from '@/features/journal/TemplateLivePreview';
import { TemplateFieldEditorList } from '@/features/journal/TemplateFieldEditorList';
import { validateTemplate, type TemplateIssue } from '@/domain/templates/templateEditor';

type OnboardingStep = 'profile' | 'strategy';
type TraderLevel = 'beginner' | 'intermediate' | 'advanced';

const TRADER_LEVELS: Array<{
  id: TraderLevel;
  title: string;
  badge: string;
  description: string;
  icon: typeof Compass;
}> = [
  {
    id: 'beginner',
    title: 'Beginner',
    badge: 'Building Foundations',
    description: 'I’m learning the basics and building good habits.',
    icon: Compass,
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    badge: 'Executing System',
    description: 'I have a routine and I’m working on consistency.',
    icon: TrendingUp,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    badge: 'Refining Edge',
    description: 'I’m refining a well-established approach.',
    icon: Sparkles,
  },
];

function getInitials(name?: string): string {
  if (!name?.trim()) return 'T';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'T'
  );
}

export function FirstRunOnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const [step, setStep] = useState<OnboardingStep>('profile');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [traderLevel, setTraderLevel] = useState<TraderLevel>(user?.traderLevel || 'beginner');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [nameError, setNameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strategy template state
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState('default-ict-2026');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);
  const [editDraft, setEditDraft] = useState<TemplateDefinition | null>(null);
  const [editIssues, setEditIssues] = useState<TemplateIssue[]>([]);
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string | boolean>>({});

  async function loadInitialData() {
    setLoading(true);
    setError('');
    try {
      const [required, available, current] = await Promise.all([
        needsFirstRunOnboarding(),
        listJournalTemplates(),
        getDefaultTemplateId().catch(() => 'default-ict-2026'),
      ]);

      if (!required) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setTemplates(available);
      setSelectedId(
        available.some((template) => template.id === current)
          ? current
          : available[0]?.id ?? 'default-ict-2026'
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load setup details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (user.traderLevel) setTraderLevel(user.traderLevel);
      if (!avatarPreview && user.avatar) setAvatarPreview(user.avatar);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId),
    [templates, selectedId]
  );

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WebP).');
      return;
    }

    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  }

  function handleRemoveAvatar() {
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setNameError('Please enter your name to continue.');
      return;
    }

    setNameError('');
    setError('');
    setBusy(true);
    try {
      await updateProfile(cleanName, avatarFile, traderLevel);
      setStep('strategy');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save your profile. Please check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleUseTemplate(templateId: string) {
    setBusy(true);
    setError('');
    try {
      await saveDefaultTemplateId(templateId);
      await completeFirstRunOnboarding();
      navigate('/journal/new', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not set default template. Please try again.'
      );
      setBusy(false);
    }
  }

  async function handleCreateCustomTemplate() {
    setBusy(true);
    setError('');
    try {
      const templateTitle = name.trim() ? `${name.trim()}'s Strategy` : 'My Custom Strategy';
      const custom = await saveCustomTemplate({
        id: '',
        name: templateTitle,
        description: 'Personal trading strategy template. Customize your fields in Settings.',
        photoCount: 3,
        fields: [],
      });
      await saveDefaultTemplateId(custom.id);
      await completeFirstRunOnboarding();
      navigate('/settings/templates', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not create your template. Please try again.'
      );
      setBusy(false);
    }
  }

  function startTemplatePreview(template: TemplateDefinition) {
    setPreviewTemplate(template);
    setPreviewValues({});
  }

  function startTemplateEdit(template: TemplateDefinition) {
    setEditDraft({
      ...structuredClone(template),
      id: '',
      name: `My ${template.name}`,
      description: template.description ?? '',
      photoCount: template.photoCount ?? 3,
      fields: template.fields.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })),
    });
    setEditIssues([]);
    setExpandedFieldKey(null);
    setPreviewTemplate(null);
  }

  async function saveEditedTemplate() {
    if (!editDraft) return;
    const issues = validateTemplate(editDraft.name, editDraft.fields);
    setEditIssues(issues);
    if (issues.length) return;

    setBusy(true);
    setError('');
    try {
      const saved = await saveCustomTemplate({
        ...editDraft,
        name: editDraft.name.trim(),
        description: editDraft.description?.trim() ?? '',
        photoCount: Math.max(0, Math.min(10, editDraft.photoCount ?? 3)),
        fields: editDraft.fields.map((field) => field.type === 'enum'
          ? { ...field, options: (field.options ?? []).map((option) => option.trim()).filter(Boolean) }
          : field),
      });
      await saveDefaultTemplateId(saved.id);
      await completeFirstRunOnboarding();
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this strategy. Please try again.');
      setBusy(false);
    }
  }

  async function handleSkipStrategy() {
    setBusy(true);
    setError('');
    try {
      await completeFirstRunOnboarding();
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish setup. Please try again.');
      setBusy(false);
    }
  }

  if (loading) {
    return <PageLoader title="Preparing your workspace…" className="min-h-dvh bg-bg-0" />;
  }

  const activeLevel = TRADER_LEVELS.find((level) => level.id === traderLevel);

  return (
    <main className="flex min-h-dvh flex-col bg-bg-0 px-4 text-fg sm:px-8">
      <header className="-mx-4 flex min-h-16 items-center justify-between gap-4 border-b border-line px-4 sm:-mx-8 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo size="sm" />
            <p className="truncate text-sm font-semibold tracking-tight text-fg">ThePrecisionLab</p>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <nav aria-label="Onboarding progress" className="flex items-center gap-2 sm:gap-3">
              <span aria-label={`Step ${step === 'profile' ? '1' : '2'} of 2`} className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-2 px-3 py-1.5 text-xs font-medium text-fg-muted">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${step === 'profile' ? 'bg-fg-muted' : 'bg-fg'}`} />
                <span className="font-mono">Step {step === 'profile' ? '1' : '2'} of 2</span>
              </span>
            </nav>
            <ThemeToggle />
          </div>
      </header>

        {error && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-loss/30 bg-loss/10 p-4 text-sm text-loss-text">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 font-medium">{error}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setError('')} className="shrink-0 text-xs">
              Dismiss
            </Button>
          </div>
        )}

        <div className={`mx-auto flex w-full max-w-[1100px] flex-1 py-8 sm:py-10 ${step === 'profile' ? 'items-center' : 'items-start'}`}>
          <section className={`min-w-0 w-full ${step === 'profile' ? '' : ''}`}>
            {step === 'profile' ? (
              <>
                <form onSubmit={handleProfileSubmit} className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:gap-12">
                  <section aria-labelledby="profile-setup-title" className="min-w-0">
                    <h1 id="profile-setup-title" className="text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl xl:text-[2.75rem]">
                      Set up your profile
                    </h1>
                    <p className="mt-2 max-w-xl text-base leading-7 text-fg-muted">
                      Two quick details. You can change them anytime.
                    </p>

                    <div className="mt-8 space-y-7">
                    <div>
                      <label htmlFor="onboarding-name" className="block text-sm font-semibold text-fg">
                        Your name <span className="text-fg-muted" aria-hidden="true">*</span>
                      </label>
                      <Input
                        id="onboarding-name"
                        type="text"
                        placeholder="What should we call you?"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          if (nameError) setNameError('');
                        }}
                        invalid={Boolean(nameError)}
                        aria-describedby={nameError ? 'onboarding-name-hint onboarding-name-error' : 'onboarding-name-hint'}
                        className="mt-3 h-14 w-full rounded-xl px-4 text-base"
                        autoFocus
                        required
                      />
                      <span id="onboarding-name-hint" className="sr-only">Enter the name you want shown on your profile.</span>
                      {nameError && (
                        <p id="onboarding-name-error" role="alert" className="mt-1.5 text-xs text-loss-text">{nameError}</p>
                      )}
                    </div>

                    <fieldset>
                      <legend className="text-sm font-semibold text-fg">Trading experience</legend>
                      <p className="mt-1 text-xs text-fg-muted">Choose what feels closest. There’s no wrong answer.</p>
                      <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label="Trading experience level">
                        {TRADER_LEVELS.map((level) => {
                          const selected = traderLevel === level.id;
                          return (
                            <label
                              key={level.id}
                              className={`relative flex min-h-[82px] cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-bg-0 sm:px-5 ${
                                selected
                                  ? 'border-line-strong bg-bg-2 ring-1 ring-line-strong'
                                  : 'border-line bg-bg-1 hover:border-line-strong hover:bg-bg-2'
                              }`}
                            >
                              <input
                                type="radio"
                                name="trader-experience-level"
                                value={level.id}
                                checked={selected}
                                onChange={() => setTraderLevel(level.id)}
                                className="sr-only"
                              />
                              <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-fg' : 'border-line-strong'}`}>
                                {selected && <span className="h-2.5 w-2.5 rounded-full bg-fg" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-fg">{level.title}</span>
                                <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{level.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    </div>
                  </section>

                  <aside aria-label="Live profile preview" className="min-w-0">
                    <Card className="rounded-2xl border border-line bg-bg-1 p-5 shadow-card sm:p-7">
                      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg">Your profile preview</p>
                          <p className="mt-1 text-sm text-fg-muted">A few details, all editable anytime</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-1 text-xs text-fg-muted"><Eye className="h-3.5 w-3.5" aria-hidden="true" />Live</span>
                      </div>

                      <div className="mt-5 rounded-xl border border-line bg-bg-0 p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-bg-3 text-lg font-semibold text-fg-muted">
                            {avatarPreview ? <img src={avatarPreview} alt="Profile photo preview" className="h-full w-full object-cover" /> : getInitials(name)}
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" aria-label="Upload profile photo" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label={avatarPreview ? 'Change profile photo' : 'Add profile photo'} className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-bg-0 bg-fg text-bg-0 transition hover:bg-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none"><Camera className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-fg">{name.trim() || 'Your name'}</p>
                            <p className="mt-1 text-sm text-fg-muted">{activeLevel?.badge ?? 'Trader'} · Trader</p>
                            <span className="mt-2 inline-flex rounded-full border border-line bg-bg-2 px-2.5 py-1 text-xs font-medium capitalize text-fg-muted">{traderLevel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-2" aria-hidden="true">
                        <span className="h-2.5 w-2.5 rounded-full bg-fg" />
                        <span className={`h-1 flex-1 rounded-full ${step === 'profile' ? 'bg-bg-3' : 'bg-fg'}`} />
                        <span className="h-2.5 w-2.5 rounded-full bg-bg-3" />
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={busy}
                        rightIcon={busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                        className="mt-5 w-full motion-reduce:transition-none"
                      >
                        {busy ? 'Saving profile…' : 'Continue'}
                      </Button>
                      <p className="mt-3 text-center text-xs leading-5 text-fg-muted">Strategy setup is optional. You can do it later in Settings.</p>
                      {avatarPreview && <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} className="mt-2 w-full text-fg-muted">Remove profile photo</Button>}
                    </Card>
                  </aside>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep('profile');
                      setError('');
                    }}
                    disabled={busy}
                    leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                    className="-ml-2 motion-reduce:transition-none"
                  >
                    Back to profile
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void handleSkipStrategy()} disabled={busy} className="motion-reduce:transition-none">
                    Skip for now
                  </Button>
                </div>

                <div className="mt-5 max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">Strategy setup <span className="px-1 text-line-strong">/</span> 02 of 02</p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-[2.15rem]">
                    Choose your starting template.
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-fg-muted">
                    Templates shape the details you record with each trade. Pick one to start, make your own, or skip this and decide later in Settings.
                  </p>
                </div>

                <fieldset className="mt-7 grid gap-4 sm:grid-cols-2" aria-label="Available strategy templates">
                  {templates.length > 0 ? templates.map((template) => {
                    const selected = selectedId === template.id;
                    const statsCount = template.fields.filter((field) => field.inStats).length;
                    return (
                      <div
                        key={template.id}
                        className={`flex min-h-44 flex-col rounded-xl border p-4 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-bg-0 sm:p-5 ${
                          selected
                            ? 'border-line-strong bg-bg-1 ring-1 ring-line-strong'
                            : 'border-line bg-bg-1 hover:border-line-strong'
                        }`}
                      >
                        <div className="flex flex-1 flex-col">
                          <input type="radio" id={`strategy-template-${template.id}`} name="journal-strategy-template" value={template.id} checked={selected} onChange={() => setSelectedId(template.id)} className="sr-only" />
                          <div className="flex items-start justify-between gap-3">
                            <label htmlFor={`strategy-template-${template.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg focus-within:outline-none">
                              <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-fg bg-fg text-bg-0' : 'border-line-strong bg-bg-2 text-transparent'}`}>
                                {selected && <Check className="h-3 w-3 stroke-[2.5]" />}
                              </span>
                              <span className="min-w-0 text-base font-semibold tracking-tight text-fg">{template.name}</span>
                            </label>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Button type="button" variant="secondary" size="icon" aria-label={`Edit ${template.name}`} title={`Edit ${template.name}`} onClick={() => startTemplateEdit(template)} className="h-9 w-9"><Pencil className="h-4 w-4" aria-hidden="true" /></Button>
                              <Button type="button" variant="secondary" size="icon" aria-label={`Preview ${template.name}`} title={`Preview ${template.name}`} onClick={() => startTemplatePreview(template)} className="h-9 w-9"><Eye className="h-4 w-4" aria-hidden="true" /></Button>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{template.description}</p>
                          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                            {template.fields.slice(0, 3).map((field) => <span key={field.key} className="rounded-lg border border-line bg-bg-2 px-2.5 py-1 text-xs text-fg-muted">{field.label}</span>)}
                            {template.fields.length > 3 && <span className="px-1 py-1 text-xs text-fg-dim">+{template.fields.length - 3} more</span>}
                            <span className="ml-auto text-2xs text-fg-dim">{template.fields.length} prompts · {statsCount} statistics</span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-xl border border-dashed border-line-strong bg-bg-1 px-5 py-6 text-center">
                      <p className="text-sm font-medium text-fg">No templates are available yet</p>
                      <p className="mt-1 text-xs leading-5 text-fg-muted">You can create one now or continue with the standard journal and decide later.</p>
                    </div>
                  )}
                </fieldset>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg-1 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">Build your own template</p>
                      <p className="mt-1 text-xs leading-5 text-fg-muted">Start with a blank strategy and customize the fields in Settings.</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleCreateCustomTemplate()}
                      disabled={busy}
                      className="shrink-0 motion-reduce:transition-none"
                    >
                      Create from scratch
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={busy || !selectedTemplate}
                    onClick={() => void handleUseTemplate(selectedId)}
                    leftIcon={busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    className="w-full motion-reduce:transition-none sm:w-auto"
                  >
                    {busy ? 'Saving setup…' : `Use ${selectedTemplate?.name ?? 'selected template'}`}
                  </Button>
                  <Button type="button" variant="ghost" size="lg" onClick={() => void handleSkipStrategy()} disabled={busy} className="w-full motion-reduce:transition-none sm:w-auto">
                    Skip for now
                  </Button>
                  <p className="text-xs leading-5 text-fg-muted sm:ml-auto sm:max-w-[190px] sm:text-right">
                    You can choose or change a template later in Settings.
                  </p>
                </div>
              </>
            )}
          </section>

        </div>
      {previewTemplate && <Dialog.Root open onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }} modal>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm motion-reduce:animate-none" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[92dvh] w-[min(960px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-bg-1 shadow-pop focus:outline-none">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div><Dialog.Title className="text-lg font-semibold text-fg">{previewTemplate.name} · Form preview</Dialog.Title><Dialog.Description className="mt-1 text-sm text-fg-muted">Explore the form fields. Preview values are temporary and will not be saved.</Dialog.Description></div>
              <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close preview"><X className="h-5 w-5" /></Button></Dialog.Close>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><TemplateLivePreview template={previewTemplate} values={previewValues} onChange={(key, value) => setPreviewValues((current) => ({ ...current, [key]: value }))} onFocusField={() => undefined} /></div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3"><Button type="button" variant="ghost" onClick={() => setPreviewTemplate(null)}>Close</Button><Button type="button" onClick={() => startTemplateEdit(previewTemplate)} leftIcon={<Pencil className="h-4 w-4" />}>Customize strategy</Button></footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>}
      {editDraft && <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) setEditDraft(null); }} modal>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm motion-reduce:animate-none" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[92dvh] w-[min(1040px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-bg-1 shadow-pop focus:outline-none">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div><Dialog.Title className="text-lg font-semibold text-fg">Customize your strategy</Dialog.Title><Dialog.Description className="mt-1 text-sm text-fg-muted">This creates your own editable copy and makes it the default for new trades.</Dialog.Description></div>
              <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close editor" disabled={busy}><X className="h-5 w-5" /></Button></Dialog.Close>
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-fg">Template name<Input value={editDraft.name} maxLength={80} onChange={(event) => setEditDraft((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Name your strategy" /></label>
                <label className="space-y-1.5 text-sm font-medium text-fg">Description<Input value={editDraft.description ?? ''} maxLength={180} onChange={(event) => setEditDraft((current) => current ? { ...current, description: event.target.value } : current)} placeholder="What does this template track?" /></label>
              </div>
              {editIssues.some((issue) => !issue.fieldKey) && <p role="alert" className="text-sm text-loss">{editIssues.find((issue) => !issue.fieldKey)?.message}</p>}
              <TemplateFieldEditorList fields={editDraft.fields} onChange={(fields) => setEditDraft((current) => current ? { ...current, fields } : current)} issues={editIssues} expandedFieldKey={expandedFieldKey} onExpandedChange={setExpandedFieldKey} onRemove={(_field, index) => setEditDraft((current) => current ? { ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index) } : current)} />
            </div>
            <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
              <Button type="button" variant="ghost" onClick={() => setEditDraft(null)} disabled={busy}>Cancel</Button>
              <Button type="button" variant="primary" onClick={() => void saveEditedTemplate()} disabled={busy || !editDraft.name.trim()} leftIcon={busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>{busy ? 'Saving…' : 'Save and go to dashboard'}</Button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>}
    </main>
  );
}
