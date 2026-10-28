import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CreditCard, LogOut, PanelsTopLeft, Sun, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';

export function SettingsPage() {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { signOut } = useAuthStore();
  const navigate = useNavigate();

  async function confirmSignOut() {
    await signOut();
    navigate('/');
  }

  return <div className="space-y-6">
    <PageHeader title="Settings" description="Manage your journal preferences and workspace." />
    <div className="grid gap-3 sm:grid-cols-2">
      <SettingsLink to="/profile" icon={<UserRound className="h-5 w-5" />} title="Profile" description="View and update your account profile." />
      <SettingsLink to="/manage-subscription" icon={<CreditCard className="h-5 w-5" />} title="Manage subscription" description="Review payment details, billing dates, and subscription history." />
      <SettingsLink to="/settings/templates" icon={<PanelsTopLeft className="h-5 w-5" />} title="Strategy templates" description="Choose a default strategy template or create and customize your own." />
      <Card className="transition-colors hover:border-line-strong hover:bg-bg-3"><CardBody className="flex min-h-[112px] items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-3 text-fg-muted"><Sun className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><CardTitle>Appearance</CardTitle><span className="mt-1 block text-sm text-fg-muted">Choose the theme for your workspace.</span></span>
        <ThemeToggle showLabel className="h-9 w-auto shrink-0 px-3 text-sm" />
      </CardBody></Card>
      <Card className="transition-colors hover:border-line-strong hover:bg-bg-3"><CardBody className="flex min-h-[112px] items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-3 text-fg-muted"><LogOut className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><CardTitle>Sign out</CardTitle><span className="mt-1 block text-sm text-fg-muted">Sign out of your account on this device.</span></span>
        <Button variant="danger" className="shrink-0" onClick={() => setLogoutOpen(true)}>Sign out</Button>
      </CardBody></Card>
      <SettingsLink to="/tutorials" icon={<BookOpen className="h-5 w-5" />} title="Help & tutorials" description="Browse quick guides for using your journal." />
    </div>
    <ConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} title="Sign out?" description="You’ll be returned to the homepage. Make sure your trades are saved." confirmLabel="Sign Out" cancelLabel="Cancel" onConfirm={confirmSignOut} />
  </div>;
}

function SettingsLink({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return <Link to={to} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 motion-reduce:transform-none">
    <Card className="h-full transition duration-150 group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:bg-bg-3 group-active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"><CardBody className="flex min-h-[112px] items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-bg-3 text-fg-muted transition-colors group-hover:text-fg motion-reduce:transition-none">{icon}</span>
      <span className="min-w-0 flex-1"><CardTitle>{title}</CardTitle><span className="mt-1 block text-sm text-fg-muted">{description}</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-fg-dim transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </CardBody></Card>
  </Link>;
}
