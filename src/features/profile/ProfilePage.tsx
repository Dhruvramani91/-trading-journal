import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail,
  ShieldCheck,
  UserRound,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  Camera,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTradesStore, bootTradesStore } from '@/store/tradesStore';
import { summary } from '@/analytics/core';
import { formatR, formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'T'
  );
}

export function ProfilePage() {
  const { user, updateProfile, error, clearError } = useAuthStore();
  const { trades, loaded, load } = useTradesStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [traderLevel, setTraderLevel] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('beginner');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bootTradesStore();
  }, []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setTraderLevel(user.traderLevel ?? 'beginner');
      setPreview(user.avatar);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

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

  if (!user) return null;

  const currentUser = user;
  const displayName = currentUser.name || 'Trader';
  const traderLevelLabel =
    currentUser.traderLevel === 'advanced'
      ? 'Advanced Trader'
      : currentUser.traderLevel === 'intermediate'
        ? 'Intermediate Trader'
        : 'Beginner Trader';

  function openEditor() {
    clearError();
    setName(currentUser.name || '');
    setTraderLevel(currentUser.traderLevel ?? 'beginner');
    setAvatarFile(null);
    setPreview(currentUser.avatar);
    setEditing(true);
  }

  function closeEditor() {
    if (saving) return;
    clearError();
    setEditing(false);
    setAvatarFile(null);
    setName(currentUser.name || '');
    setTraderLevel(currentUser.traderLevel ?? 'beginner');
    setPreview(currentUser.avatar);
  }

  function handleAvatarChange(file?: File) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!name.trim()) return;

    setSaving(true);

    try {
      await updateProfile(name, avatarFile, traderLevel);
      setEditing(false);
      setAvatarFile(null);
    } catch {
      // Store exposes the error for the UI.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Profile"
        description="Your ThePrecisionLab account and plan details."
      />

      <Card className="overflow-hidden">
        <CardBody className="p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl object-cover border border-line shadow-sm"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-accent/15 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold">
                  {getInitials(displayName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
                  {displayName}
                </h2>

                <span className="inline-flex items-center gap-1 rounded-full bg-win/10 px-2 py-1 text-2xs font-semibold text-win">
                  <ShieldCheck className="h-3 w-3" />
                  Verified account
                </span>
              </div>

              <p className="mt-1 text-sm text-fg-muted break-all">{currentUser.email}</p>
              <p className="mt-2 text-xs text-fg-dim">{traderLevelLabel}</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={openEditor}
              leftIcon={<UserRound className="h-3.5 w-3.5" />}
            >
              Edit Profile
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                {currentUser.email}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-fg-dim shrink-0" />
                <span className="text-sm text-fg-muted">Account type</span>
              </div>
              <span className="text-sm font-medium text-fg">{traderLevelLabel}</span>
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

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-fg">Free Plan</h3>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Your current ThePrecisionLab plan.
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

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeEditor();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-bg-1 shadow-2xl animate-fade-in"
            role="dialog"
            aria-modal="true"

            aria-labelledby="edit-profile-title"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 id="edit-profile-title" className="text-base font-bold text-fg">
                  Edit Profile
                </h3>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Update your name and profile picture.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-bg-4 hover:text-fg disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Profile preview"
                      className="h-24 w-24 rounded-2xl border border-line object-cover shadow-sm"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl border border-accent/20 bg-accent/15 text-accent flex items-center justify-center text-2xl font-bold">
                      {getInitials(name)}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg-1 text-fg shadow-md hover:bg-bg-3 transition-colors"
                    title="Change avatar"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                />

                <p className="mt-3 text-xs text-fg-dim">
                  JPG, PNG or WebP. The image will be compressed automatically.
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-1.5 block text-xs font-semibold text-fg"
                >
                  Display name
                </label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={50}
                  autoComplete="name"
                  className="w-full rounded-lg border border-line bg-bg-2 px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-dim focus:border-accent focus:ring-2 focus:ring-accent/10"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label
                  htmlFor="trader-level"
                  className="mb-1.5 block text-xs font-semibold text-fg"
                >
                  Trading experience
                </label>
                <select
                  id="trader-level"
                  value={traderLevel}
                  onChange={(event) =>
                    setTraderLevel(
                      event.target.value as
                        | 'beginner'
                        | 'intermediate'
                        | 'advanced'
                    )
                  }
                  className="w-full rounded-lg border border-line bg-bg-2 px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                >
                  <option value="beginner">Beginner Trader</option>
                  <option value="intermediate">Intermediate Trader</option>
                  <option value="advanced">Advanced Trader</option>
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-loss/20 bg-loss/10 px-3 py-2.5 text-xs text-loss">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  leftIcon={
                    saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
