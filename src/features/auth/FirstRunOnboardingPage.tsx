import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Layers3,
  NotebookPen,
  Camera,
  X,
  Compass,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  LoaderCircle,
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
    description: 'Learning market mechanics, risk discipline, and finding a consistent approach.',
    icon: Compass,
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    badge: 'Executing System',
    description: 'Trading a defined edge and working on consistency, execution quality, and patience.',
    icon: TrendingUp,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    badge: 'Refining Edge',
    description: 'Optimizing capital allocation, trade psychology, sizing, and advanced statistics.',
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

  // Step 1: Profile state
  const [name, setName] = useState(user?.name || '');
  const [traderLevel, setTraderLevel] = useState<TraderLevel>(user?.traderLevel || 'beginner');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [nameError, setNameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Strategy template state
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState('default-ict-2026');

  // Check onboarding eligibility and load available templates
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

  // Sync state if user hydrates
  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (user.traderLevel) setTraderLevel(user.traderLevel);
      if (!avatarPreview && user.avatar) setAvatarPreview(user.avatar);
    }
  }, [user]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId),
    [templates, selectedId]
  );

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WebP).');
      return;
    }

    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  }

  function handleRemoveAvatar() {
    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Handle Step 1 Profile save & advance
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  // Handle Strategy setup completion with chosen template
  async function handleUseTemplate(templateId: string) {
    setBusy(true);
    setError('');
    try {
      await saveDefaultTemplateId(templateId);
      await completeFirstRunOnboarding();
      navigate('/journal/new', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not set default template. Please try again.'
      );
      setBusy(false);
    }
  }

  // Handle Custom template creation during onboarding
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
        cause instanceof Error
          ? cause.message
          : 'Could not create your template. Please try again.'
      );
      setBusy(false);
    }
  }

  // Handle safe Strategy skip
  async function handleSkipStrategy() {
    setBusy(true);
    setError('');
    try {
      await completeFirstRunOnboarding();
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not finish setup. Please try again.'
      );
      setBusy(false);
    }
  }

  if (loading) {
    return <PageLoader title="Preparing your workspace…" className="min-h-dvh bg-bg-0" />;
  }

  return (
    <main className="min-h-dvh bg-bg-0 px-4 py-6 text-fg sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-4 border-b border-line pb-5">
          <BrandLogo size="sm" />

          {/* Stepper progress indicator */}
          <nav aria-label="Onboarding progress" className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                  step === 'profile'
                    ? 'bg-fg text-bg-0 shadow-sm'
                    : 'bg-accent/15 text-accent'
                }`}
              >
                {step === 'strategy' ? <Check className="h-3.5 w-3.5" /> : '1'}
                <span>Profile</span>
              </span>

              <span className="h-0.5 w-4 bg-line-strong" aria-hidden="true" />

              <span
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                  step === 'strategy'
                    ? 'bg-fg text-bg-0 shadow-sm'
                    : 'bg-bg-3 text-fg-dim'
                }`}
              >
                2 Strategy
              </span>
            </div>

            <ThemeToggle />
          </nav>
        </header>

        {/* Global Error Banner if any */}
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-loss/30 bg-loss/10 p-4 text-sm text-loss-text"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setError('')}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid flex-1 items-start gap-10 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-14">
          {/* Main Action Form Area */}
          <section className="min-w-0 max-w-2xl">
            {step === 'profile' ? (
              /* ================================================= */
              /* STEP 1: PROFILE SETUP                             */
              /* ================================================= */
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                  <span>Step 1 of 2</span>
                  <span>·</span>
                  <span>Personalize your account</span>
                </div>
                <h1 className="text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
                  Set up your trader profile.
                </h1>
                <p className="mt-2 text-sm leading-6 text-fg-muted">
                  Your name and experience level shape your journal review prompts and analytics insights.
                </p>

                <form onSubmit={handleProfileSubmit} className="mt-8 space-y-7">
                  {/* Name Input */}
                  <div>
                    <label
                      htmlFor="onboarding-name"
                      className="block text-sm font-semibold text-fg"
                    >
                      Your name <span className="text-accent">*</span>
                    </label>
                    <div className="mt-2">
                      <Input
                        id="onboarding-name"
                        type="text"
                        placeholder="e.g. Alex Rivera"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        error={nameError}
                        className="h-11"
                        autoFocus
                      />
                    </div>
                    {nameError && (
                      <p className="mt-1.5 text-xs text-loss-text">{nameError}</p>
                    )}
                  </div>

                  {/* Experience Level */}
                  <fieldset>
                    <legend className="text-sm font-semibold text-fg">
                      Trading experience level
                    </legend>
                    <p className="mt-1 text-xs text-fg-muted">
                      Select where you are in your trading journey today.
                    </p>

                    <div className="mt-3.5 grid gap-3 sm:grid-cols-3" role="radiogroup">
                      {TRADER_LEVELS.map((level) => {
                        const selected = traderLevel === level.id;
                        const Icon = level.icon;
                        return (
                          <label
                            key={level.id}
                            className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all focus-within:ring-2 focus-within:ring-focus ${
                              selected
                                ? 'border-line-strong bg-primary-soft shadow-sm ring-1 ring-line-strong'
                                : 'border-line bg-bg-1 hover:border-line-strong hover:bg-bg-3/60'
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
                            <div>
                              <div className="flex items-center justify-between">
                                <span
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    selected
                                      ? 'bg-fg text-bg-0'
                                      : 'bg-bg-3 text-fg-muted'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                {selected && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fg text-bg-0">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-3 text-sm font-semibold text-fg">
                                {level.title}
                              </h3>
                              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                                {level.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* Optional Avatar / Photo */}
                  <div className="rounded-2xl border border-line bg-bg-1 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="h-16 w-16 rounded-2xl border border-line object-cover shadow-sm"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-xl font-bold text-accent">
                              {getInitials(name)}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-fg">
                            Profile avatar <span className="text-xs font-normal text-fg-dim">(optional)</span>
                          </p>
                          <p className="mt-0.5 text-xs text-fg-muted">
                            Personalize your journal or skip this step for later.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          aria-label="Upload profile avatar"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          leftIcon={<Camera className="h-3.5 w-3.5" />}
                        >
                          {avatarPreview ? 'Change' : 'Upload photo'}
                        </Button>

                        {avatarPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            leftIcon={<X className="h-3.5 w-3.5" />}
                          >
                            Skip photo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={busy}
                      rightIcon={
                        busy ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )
                      }
                      className="w-full sm:w-auto"
                    >
                      {busy ? 'Saving profile…' : 'Continue to strategy'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================================================= */
              /* STEP 2: STRATEGY SETUP                            */
              /* ================================================= */
              <div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('profile');
                      setError('');
                    }}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    disabled={busy}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to profile
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleSkipStrategy()}
                    disabled={busy}
                    className="text-fg-muted hover:text-fg"
                  >
                    Skip for now
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                    <span>Step 2 of 2</span>
                    <span>·</span>
                    <span>Journal Strategy</span>
                  </div>
                  <h1 className="text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
                    Choose your starting template.
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-fg-muted">
                    This shapes your trade logging form and metrics breakdown. You can switch templates or customize fields anytime in Settings.
                  </p>
                </div>

                {/* Templates list */}
                <fieldset className="mt-7 space-y-3" aria-label="Available strategy templates">
                  {templates.map((template) => {
                    const selected = selectedId === template.id;
                    const statsCount = template.fields.filter((field) => field.inStats).length;

                    return (
                      <label
                        key={template.id}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all focus-within:ring-2 focus-within:ring-focus ${
                          selected
                            ? 'border-line-strong bg-primary-soft shadow-sm ring-1 ring-line-strong'
                            : 'border-line bg-bg-1 hover:border-line-strong hover:bg-bg-3/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="journal-strategy-template"
                          value={template.id}
                          checked={selected}
                          onChange={() => setSelectedId(template.id)}
                          className="sr-only"
                        />

                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            selected
                              ? 'border-fg bg-fg text-bg-0'
                              : 'border-line-strong bg-bg-0'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-fg">{template.name}</span>
                            <span className="inline-flex items-center rounded-md bg-bg-3 px-2 py-0.5 text-2xs font-medium text-fg-muted">
                              {template.fields.length} strategy fields
                            </span>
                          </div>

                          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                            {template.description}
                          </p>

                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {template.fields.slice(0, 4).map((f) => (
                              <span
                                key={f.key}
                                className="inline-block rounded-md border border-line bg-bg-2 px-2 py-0.5 text-2xs text-fg-dim"
                              >
                                {f.label}
                              </span>
                            ))}
                            {template.fields.length > 4 && (
                              <span className="inline-block px-1 py-0.5 text-2xs text-fg-dim">
                                +{template.fields.length - 4} more
                              </span>
                            )}
                            {statsCount > 0 && (
                              <span className="ml-auto inline-block text-2xs font-medium text-accent">
                                {statsCount} analytics breakdowns
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </fieldset>

                {/* Strategy Actions */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={busy || !selectedTemplate}
                    onClick={() => void handleUseTemplate(selectedId)}
                    leftIcon={
                      busy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )
                    }
                  >
                    {busy
                      ? 'Saving setup…'
                      : `Use ${selectedTemplate?.name ?? 'selected template'}`}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    onClick={() => void handleCreateCustomTemplate()}
                    leftIcon={<Layers3 className="h-4 w-4" />}
                  >
                    Create my own template
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    disabled={busy}
                    onClick={() => void handleSkipStrategy()}
                    className="text-fg-muted hover:text-fg"
                  >
                    Skip for now
                  </Button>
                </div>

                <p className="mt-3 text-xs leading-5 text-fg-dim">
                  You can select, create, or customize templates anytime in{' '}
                  <span className="font-medium text-fg-muted">Settings → Strategy templates</span>.
                  Skipping completes setup and opens the app with standard defaults.
                </p>
              </div>
            )}
          </section>

          {/* Right-Hand Reassuring Preview Card */}
          <aside className="hidden lg:block" aria-label="Setup guide and preview">
            <Card className="sticky top-8 overflow-hidden border-line bg-bg-1 shadow-sm">
              <div className="border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-3 text-fg">
                    <NotebookPen className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-fg">
                      {step === 'profile' ? 'Trader Profile Preview' : 'Strategy & Reviews'}
                    </h2>
                    <p className="text-xs text-fg-muted">
                      {step === 'profile'
                        ? 'Calibrated for your trading journey'
                        : 'Structured execution & analysis'}
                    </p>
                  </div>
                </div>
              </div>

              {step === 'profile' ? (
                <div className="p-5">
                  <div className="rounded-2xl border border-line bg-bg-2 p-4">
                    <div className="flex items-center gap-3">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Trader preview"
                          className="h-12 w-12 rounded-xl border border-line object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/15 text-sm font-bold text-accent">
                          {getInitials(name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-fg">
                          {name.trim() || 'Your Name'}
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {TRADER_LEVELS.find((l) => l.id === traderLevel)?.badge ||
                            'Trader'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-line/60 pt-3 text-xs text-fg-muted">
                      <div className="flex items-center justify-between py-1">
                        <span>Journal Edition</span>
                        <span className="font-medium text-fg">ThePrecisionLab</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>Experience Level</span>
                        <span className="font-medium capitalize text-fg">
                          {traderLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3 text-xs text-fg-muted">
                    <li className="flex items-start gap-2.5">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>
                        Your identity and trades are private to your authenticated account.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-fg-dim" />
                      <span>
                        You can update your name, photo, and level anytime in your profile settings.
                      </span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="p-5">
                  <div className="rounded-2xl border border-line bg-bg-2 p-4">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-accent">
                      Selected Template
                    </p>
                    <p className="mt-1 text-base font-semibold text-fg">
                      {selectedTemplate?.name ?? 'Standard Template'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                      {selectedTemplate?.description}
                    </p>

                    <div className="mt-3.5 border-t border-line/60 pt-3">
                      <p className="text-2xs font-medium uppercase tracking-wider text-fg-dim">
                        Template fields included
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs text-fg">
                        {selectedTemplate?.fields.map((field) => (
                          <li key={field.key} className="flex items-center justify-between">
                            <span className="truncate text-fg-muted">{field.label}</span>
                            <span className="text-2xs text-fg-dim">
                              {field.type}
                              {field.inStats ? ' · in stats' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-fg-muted">
                    <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-fg-dim" />
                    <span>
                      Every saved trade keeps its original fields permanently, even if you
                      customize or switch templates later.
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
