import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ScrollText,
  TriangleAlert,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

const ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Journal', icon: ScrollText },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/mistakes', label: 'Mistakes', icon: TriangleAlert },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function confirmSignOut() {
    setLogoutOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <div className="relative z-40 md:hidden">
      <header className="flex h-14 items-center justify-between border-b border-line bg-bg-1 px-4">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="The Precision Lab dashboard">
          <BrandLogo size="md" />
          <span className="truncate text-[13px] font-bold tracking-tight text-fg">The Precision Lab</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/journal/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover">
            <Plus className="h-3.5 w-3.5" />
            <span>Trade</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg-3 hover:text-fg"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {open && (
        <>
          <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-fg/25 backdrop-blur-[1px]" />
          <nav
            id="mobile-navigation"
            aria-label="Main navigation"
            className="absolute inset-x-0 top-14 z-50 border-b border-line bg-bg-1 p-3 shadow-pop animate-fade-in"
          >
            <div className="space-y-1">
              {ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={'end' in item ? item.end : false}
                    className={({ isActive }) => cn(
                      'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:bg-bg-3 hover:text-fg',
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            {user && (
              <div className="mt-3 border-t border-line pt-3">
                <Link to="/profile" className="mb-2 flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-fg-muted hover:bg-bg-3 hover:text-fg">
                  <UserRound className="h-4 w-4" />
                  <span className="truncate">{user.name || user.email}</span>
                </Link>
              </div>
            )}
            <div className={cn(user && 'mt-2 border-t border-line pt-2')}>
              <ThemeToggle showLabel className="h-11 w-full justify-start border-0 bg-transparent px-3 text-sm shadow-none hover:bg-bg-3" />
              {user && (
                <button type="button" onClick={() => { setOpen(false); setLogoutOpen(true); }} className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-fg-muted hover:bg-loss/10 hover:text-loss">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              )}
            </div>
          </nav>
        </>
      )}

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
