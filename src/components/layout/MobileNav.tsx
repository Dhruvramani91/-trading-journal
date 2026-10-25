import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  FlaskConical,
  CalendarDays,
  LayoutDashboard,
  Layers,
  MoreHorizontal,
  Plus,
  ScrollText,
  Settings,
  TriangleAlert,
  Wallet,
  X,
  UserRound,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const PRIMARY_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Journal', icon: ScrollText },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
] as const;

const MORE_ITEMS = [
  { to: '/mistakes', label: 'Mistakes', icon: TriangleAlert },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/backtests', label: 'Backtest storage', icon: FlaskConical },
  { to: '/figma-templates', label: 'Figma templates', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

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

  return (
    <div className="relative z-40 md:hidden">
      <header className="flex h-14 items-center border-b border-line bg-bg-1 px-4">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="The Precision Lab dashboard">
          <BrandLogo size="md" />
        </Link>
      </header>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-1/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-pop backdrop-blur-sm motion-reduce:backdrop-blur-none">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false} className={({ isActive }) => cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60', isActive ? 'bg-primary-soft text-fg' : 'text-fg-muted hover:bg-bg-3 hover:text-fg')}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />{item.label}
            </NavLink>;
          })}
          <button type="button" onClick={() => setOpen(true)} aria-label="More navigation" aria-expanded={open} aria-controls="mobile-navigation" className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60', open ? 'bg-primary-soft text-fg' : 'text-fg-muted hover:bg-bg-3 hover:text-fg')}>
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} />More
          </button>
        </div>
      </nav>

      {open && (
        <>
          <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/45" />
          <nav
            id="mobile-navigation"
            aria-label="More navigation"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-2xl border border-line bg-bg-1 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-pop animate-fade-in"
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fg-dim/50" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">More</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"><X className="h-4 w-4" /></button>
            </div>
            <Link to="/journal/new" className="mb-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60">
              <Plus className="h-4 w-4" />New trade
            </Link>
            <div className="space-y-1">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={false}
                    className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60', isActive ? 'bg-primary-soft text-fg' : 'text-fg-muted hover:bg-bg-3 hover:text-fg')}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <Link to="/profile" className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-bg-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-3 text-fg-muted">{user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" />}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-fg">{user?.name || user?.email || 'Profile'}</span><span className="block text-xs text-fg-muted">View profile</span></span>
              </Link>
              <ThemeToggle className="h-10 w-10 shrink-0" />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
