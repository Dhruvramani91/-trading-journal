import { Plus, PanelLeftOpen, LogOut, Home } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSidebarStore } from '@/store/sidebarStore';
import { useAuthStore } from '@/store/authStore';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your trading performance' },
  '/journal': { title: 'Journal', subtitle: 'Every trade, structured and searchable' },
  '/statistics': { title: 'Statistics', subtitle: 'Breakdowns across every category' },
  '/calendar': { title: 'Monthly Performance', subtitle: 'Daily R at a glance' },
  '/mistakes': { title: 'Mistakes & Filters', subtitle: 'What is costing you R' },
};

export function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = TITLES[pathname] ?? { title: 'Trading Journal' };
  const { collapsed, toggleCollapse } = useSidebarStore();
  const { user, signOut } = useAuthStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  async function handleSignOut() {
    setLogoutOpen(true);
  }

  async function confirmSignOut() {
    setLogoutOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <div className="hidden md:flex h-14 items-center justify-between border-b border-line bg-bg-1 px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-bold text-fg tracking-tight truncate">{meta.title}</h1>
          {meta.subtitle && <p className="text-xs text-fg-muted truncate">{meta.subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <ThemeToggle />

        <Button asChild variant="ghost" size="sm">
          <Link to="/" title="Homepage" className="flex items-center gap-1.5 text-xs">
            <Home className="h-3.5 w-3.5 text-fg-dim" />
            <span>Home</span>
          </Link>
        </Button>

        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center gap-1.5 text-xs text-fg-dim hover:text-loss"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        )}

        <Button asChild leftIcon={<Plus className="h-4 w-4" />} variant="primary" size="sm">
          <Link to="/journal/new">New trade</Link>
        </Button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out?"
        description="You’ll be returned to the homepage. Make sure your trades are saved."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={confirmSignOut}
      />
    </div>
  );
}
