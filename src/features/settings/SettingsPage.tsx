import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  LogOut,
  PanelsTopLeft,
  UserRound,
  Palette,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';

export function SettingsPage() {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();

  async function confirmSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5 pb-6 animate-fade-in">
      <PageHeader
        title="Settings & Workspace"
        description="Configure your personalized trading journal, appearance, templates, and security preferences."
      />

      {/* Account & Profile Spotlight Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-bg-1 via-bg-2 to-bg-1 p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400 font-bold text-lg shadow-inner">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-fg">
                  {user?.name || user?.email || 'Active Trader'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Active Pro
                </span>
              </div>
              <p className="text-xs text-fg-muted mt-0.5">{user?.email}</p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="rounded-xl border-line text-xs font-semibold self-start sm:self-auto hover:bg-bg-3 h-10 px-4"
          >
            <Link to="/profile">Edit Profile →</Link>
          </Button>
        </div>
      </div>

      {/* Settings Grid: All Options In Balanced Compact Cards */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-fg-dim px-1">
          Preferences & Workspace
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* Appearance Card */}
          <Card className="shadow-card border-line transition-all hover:border-line-strong hover:bg-bg-2/70">
            <CardBody className="flex min-h-[96px] items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400">
                  <Palette className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold">Interface Theme</CardTitle>
                  <span className="mt-1 block text-xs text-fg-muted leading-relaxed">
                    Switch between dark and light modes.
                  </span>
                </span>
              </div>
              <ThemeToggle showLabel={false} className="h-10 w-10 shrink-0 rounded-xl border border-line bg-bg-2 hover:bg-bg-3 shadow-sm flex items-center justify-center" />
            </CardBody>
          </Card>

          {/* Strategy Templates */}
          <SettingsLink
            to="/settings/templates"
            icon={<PanelsTopLeft className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />}
            title="Strategy Templates"
            description="Customize form fields, time sessions, and execution checklists."
          />

          {/* Subscriptions */}
          <SettingsLink
            to="/manage-subscription"
            icon={<CreditCard className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />}
            title="Subscription & Billing"
            description="Manage your payment provider, receipts, and plan tier."
          />

          {/* Tutorials & Documentation */}
          <SettingsLink
            to="/tutorials"
            icon={<BookOpen className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />}
            title="Help & Guides"
            description="Master journaling rules, SureScore, and statistics."
          />

          {/* Sign Out Card */}
          <Card className="shadow-card border-line transition-all hover:border-line-strong hover:bg-bg-2/70 sm:col-span-2">
            <CardBody className="flex min-h-[96px] items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  <LogOut className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold">Sign Out</CardTitle>
                  <span className="mt-1 block text-xs text-fg-muted leading-relaxed">
                    Securely terminate your active session on this device.
                  </span>
                </span>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="shrink-0 rounded-xl px-4 h-10 text-xs font-semibold shadow-sm"
                onClick={() => setLogoutOpen(true)}
              >
                Sign out
              </Button>
            </CardBody>
          </Card>
        </div>
      </section>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out?"
        description="You will be returned to the home screen. Unsaved journal drafts might be lost."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={confirmSignOut}
      />
    </div>
  );
}

function SettingsLink({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
    >
      <Card className="h-full border-line shadow-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:bg-bg-2/70">
        <CardBody className="flex min-h-[104px] items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-bg-2 shadow-sm transition-colors group-hover:border-line-strong">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
            <span className="mt-1 block text-xs text-fg-muted leading-relaxed">{description}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-fg-dim transition-transform group-hover:translate-x-1 group-hover:text-fg" />
        </CardBody>
      </Card>
    </Link>
  );
}
