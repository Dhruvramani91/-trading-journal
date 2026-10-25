import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  FlaskConical,
  CalendarDays,
  LayoutDashboard,
  Layers,
  Menu,
  Plus,
  ScrollText,
  Settings,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

const ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Journal', icon: ScrollText },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
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
            {user && <div className="mt-2 border-t border-line px-3 pt-3 text-xs text-fg-dim">Signed in as {user.name || user.email}</div>}
          </nav>
        </>
      )}
    </div>
  );
}
