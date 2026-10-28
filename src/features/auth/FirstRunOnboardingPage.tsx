import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleHelp,
  Compass,
  Eye,
  LoaderCircle,
  NotebookPen,
  Pencil,
  Save,
  ShieldCheck,
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
    <main className="min-h-dvh bg-bg-0 px-4 py-5 text-fg sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100dvh-3.5rem)]">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-fg">ThePrecisionLab</p>
              <p className="text-xs text-fg-muted">A journal for deliberate trading</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <nav aria-label="Onboarding progress" className="flex items-center gap-2 sm:gap-3">
              <div
                aria-current={step === 'profile' ? 'step' : undefined}
                aria-label={`Step 1 of 2: Profile${step === 'strategy' ? ', complete' : ', current'}`}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium sm:px-3 ${
                  step === 'profile' ? 'bg-bg-3 text-fg' : 'text-fg-muted'
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-2xs ${step === 'profile' ? 'bg-accent text-accent-fg' : 'bg-bg-3 text-fg-muted'}`}>
                  {step === 'strategy' ? <Check className="h-3 w-3" /> : '1'}
                </span>
                <span className="hidden sm:inline">Profile</span>
              </div>
              <span aria-hidden="true" className="h-px w-4 bg-line-strong sm:w-8" />
              <div
                aria-current={step === 'strategy' ? 'step' : undefined}
                aria-label={`Step 2 of 2: Strategy${step === 'strategy' ? ', current' : ''}`}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium sm:px-3 ${
                  step === 'strategy' ? 'bg-bg-3 text-fg' : 'text-fg-muted'
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-2xs ${step === 'strategy' ? 'bg-accent text-accent-fg' : 'bg-bg-3 text-fg-muted'}`}>
                  2
                </span>
                <span className="hidden sm:inline">Strategy</span>
              </div>
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

        <div className={`grid flex-1 items-start gap-7 py-7 sm:py-9 ${step === 'profile' ? 'lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_350px]' : 'grid-cols-1'}`}>
          <section className={`min-w-0 ${step === 'strategy' ? 'w-full' : ''}`}>
            {step === 'profile' ? (
              <>
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">Your profile <span className="px-1 text-line-strong">/</span> 01 of 02</p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-[2.15rem]">
                    Set up your trader profile.
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-fg-muted">
                    A couple of details make your journal feel like yours. You can update them anytime.
                  </p>
                </div>

                <Card className="mt-6 overflow-hidden rounded-2xl bg-bg-1 shadow-card">
                  <form onSubmit={handleProfileSubmit} className="space-y-5 p-4 sm:p-5">
                    <div>
                      <label htmlFor="onboarding-name" className="block text-sm font-semibold text-fg">
                        Your name <span className="text-fg-muted" aria-hidden="true">*</span>
                      </label>
                      <p id="onboarding-name-hint" className="mt-1 text-xs text-fg-muted">This is how your journal will greet you.</p>
                      <Input
                        id="onboarding-name"
                        type="text"
                        placeholder="e.g. Alex Rivera"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          if (nameError) setNameError('');
                        }}
                        invalid={Boolean(nameError)}
                        aria-describedby={nameError ? 'onboarding-name-hint onboarding-name-error' : 'onboarding-name-hint'}
                        className="mt-3 h-11 max-w-xl rounded-xl"
                        autoFocus
                        required
                      />
                      {nameError && (
                        <p id="onboarding-name-error" role="alert" className="mt-1.5 text-xs text-loss-text">{nameError}</p>
                      )}
                    </div>

                    <fieldset>
                      <legend className="text-sm font-semibold text-fg">Trading experience</legend>
                      <p className="mt-1 text-xs text-fg-muted">Choose what feels closest. There’s no wrong answer.</p>
                      <div className="mt-3 grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Trading experience level">
                        {TRADER_LEVELS.map((level) => {
                          const selected = traderLevel === level.id;
                          const Icon = level.icon;
                          return (
                            <label
                              key={level.id}
                              className={`relative flex min-h-28 cursor-pointer flex-col rounded-xl border p-3 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-bg-1 sm:p-3.5 ${
                                selected
                                  ? 'border-line-strong bg-bg-2 ring-1 ring-line-strong'
                                  : 'border-line bg-bg-2 hover:border-line-strong hover:bg-bg-3'
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
                              <span className="flex items-center justify-between">
                                <span className={`grid h-7 w-7 place-items-center rounded-lg ${selected ? 'bg-accent text-accent-fg' : 'bg-bg-3 text-fg-muted'}`}>
                                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? 'border-fg bg-fg text-bg-0' : 'border-line-strong text-transparent'}`}>
                                  {selected && <Check className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />}
                                </span>
                              </span>
                              <span className="mt-3 text-sm font-semibold text-fg">{level.title}</span>
                              <span className="mt-1 text-xs leading-relaxed text-fg-muted">{level.description}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="flex flex-col gap-4 rounded-xl border border-line bg-bg-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-bg-3 text-sm font-semibold text-fg-muted">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                          ) : (
                            <span aria-label="Initials preview">{getInitials(name)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-fg">Profile photo <span className="font-normal text-fg-muted">(optional)</span></p>
                          <p className="mt-1 text-xs leading-5 text-fg-muted">Add a photo, or leave it for later.</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" aria-label="Upload profile avatar" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          leftIcon={<Camera className="h-3.5 w-3.5" aria-hidden="true" />}
                          className="motion-reduce:transition-none"
                        >
                          {avatarPreview ? 'Change photo' : 'Upload photo'}
                        </Button>
                        {avatarPreview && (
                          <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-fg-muted">Your profile details stay private to your account.</p>
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={busy}
                        rightIcon={busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                        className="w-full motion-reduce:transition-none sm:w-auto"
                      >
                        {busy ? 'Saving profile…' : 'Continue to strategy'}
                      </Button>
                    </div>
                  </form>
                </Card>
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
                        className={`flex min-h-48 flex-col rounded-2xl border p-4 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-bg-0 sm:p-5 ${
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

          <aside aria-label="Onboarding details" className={step === 'strategy' ? 'hidden' : 'lg:sticky lg:top-8'}>
            <Card className="overflow-hidden rounded-2xl bg-bg-1 shadow-card">
              <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-bg-3 text-fg"><NotebookPen className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="text-sm font-semibold text-fg">{step === 'profile' ? 'Your profile preview' : 'Your journal, your way'}</h2>
                  <p className="mt-0.5 text-xs text-fg-muted">{step === 'profile' ? 'A few details, all editable later' : 'Start simple; refine when you’re ready'}</p>
                </div>
              </div>

              {step === 'profile' ? (
                <div className="p-5">
                  <div className="rounded-xl border border-line bg-bg-2 p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-bg-3 text-sm font-semibold text-fg-muted">
                        {avatarPreview ? <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" /> : getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">{name.trim() || 'Your name'}</p>
                        <p className="mt-0.5 text-xs text-fg-muted">{activeLevel?.badge ?? 'Trader profile'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                      <span className="text-fg-muted">Experience</span>
                      <span className="font-medium capitalize text-fg">{traderLevel}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-bg-2 p-3.5 text-xs leading-5 text-fg-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-fg" aria-hidden="true" />
                    <span>Your profile and journal are private to your account.</span>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-fg-dim">Your photo is optional, and you can update your profile whenever you like.</p>
                </div>
              ) : (
                <div className="p-5">
                  <div className="rounded-xl border border-line bg-bg-2 p-4">
                    <p className="text-xs font-medium text-fg-muted">Selected template</p>
                    <p className="mt-1.5 text-base font-semibold text-fg">{selectedTemplate?.name ?? 'Choose a template'}</p>
                    <p className="mt-1.5 text-xs leading-5 text-fg-muted">{selectedTemplate?.description ?? 'Pick a starting point or create your own.'}</p>
                    {selectedTemplate && selectedTemplate.fields.length > 0 && (
                      <div className="mt-4 border-t border-line pt-3">
                        <p className="text-2xs font-medium uppercase tracking-wider text-fg-dim">A few prompts inside</p>
                        <ul className="mt-2 space-y-2 text-xs text-fg-muted">
                          {selectedTemplate.fields.slice(0, 4).map((field) => (
                            <li key={field.key} className="flex items-center justify-between gap-3">
                              <span className="truncate">{field.label}</span>
                              <Check className="h-3.5 w-3.5 shrink-0 text-fg-dim" aria-hidden="true" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-bg-2 p-3.5 text-xs leading-5 text-fg-muted">
                    <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-fg" aria-hidden="true" />
                    <span>Nothing is permanent here. You can adjust your template later in Settings.</span>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-fg-dim">A good journal grows with your process. Start with what you know today.</p>
                </div>
              )}
            </Card>
          </aside>
        </div>
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
