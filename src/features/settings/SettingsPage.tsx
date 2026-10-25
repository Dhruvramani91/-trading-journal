import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CreditCard, ExternalLink, LogOut, PanelsTopLeft, Play, Sun, UserRound } from 'lucide-react';
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
      <Card><CardBody className="flex min-h-[112px] items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-3 text-fg-muted"><Sun className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><CardTitle>Appearance</CardTitle><span className="mt-1 block text-sm text-fg-muted">Choose the theme for your workspace.</span></span>
        <ThemeToggle showLabel className="h-9 w-auto shrink-0 px-3 text-sm" />
      </CardBody></Card>
      <Card><CardBody className="flex min-h-[112px] items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-3 text-fg-muted"><LogOut className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><CardTitle>Sign out</CardTitle><span className="mt-1 block text-sm text-fg-muted">Sign out of your account on this device.</span></span>
        <Button variant="danger" className="shrink-0" onClick={() => setLogoutOpen(true)}>Sign out</Button>
      </CardBody></Card>
      <TutorialsCard />
    </div>
    <ConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} title="Sign out?" description="You’ll be returned to the homepage. Make sure your trades are saved." confirmLabel="Sign Out" cancelLabel="Cancel" onConfirm={confirmSignOut} />
  </div>;
}

const sampleTutorials = [
  { title: 'Getting started', videoId: 'M7lc1UVf-VE' },
  { title: 'Logging a trade', videoId: 'aqz-KE-bpKQ' },
  { title: 'Reading your statistics', videoId: 'ScMzIvxBSi4' },
];

function TutorialsCard() {
  return <Card>
    <CardBody className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-3 text-fg-muted"><BookOpen className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <CardTitle>Help & tutorials</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">Quick guides for using your journal. These sample videos are temporary.</p>
        </div>
      </div>
      <div className="space-y-2">
        {sampleTutorials.map((tutorial, index) => (
          <a
            key={tutorial.videoId}
            href={`https://www.youtube.com/watch?v=${tutorial.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="group flex min-w-0 items-center gap-3 rounded-lg border border-line bg-bg-2 p-2 transition-colors hover:bg-bg-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
          >
            <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-bg-3 text-fg-muted"><Play className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">{tutorial.title}</span>
              <span className="block text-xs text-fg-muted">Temporary sample {index + 1}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-fg-dim group-hover:text-fg" />
          </a>
        ))}
      </div>
    </CardBody>
  </Card>;
}

function SettingsLink({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50">
    <Card className="h-full transition-colors hover:border-line-strong"><CardBody className="flex min-h-[112px] items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">{icon}</span>
      <span className="min-w-0 flex-1"><CardTitle>{title}</CardTitle><span className="mt-1 block text-sm text-fg-muted">{description}</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-fg-dim" />
    </CardBody></Card>
  </Link>;
}
