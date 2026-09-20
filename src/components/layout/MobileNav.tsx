import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Journal', icon: ScrollText },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/mistakes', label: 'Mistakes', icon: AlertTriangle },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  useLocation();

  return (
    <div className="md:hidden flex items-center justify-between h-14 px-3 border-b border-line bg-bg-1">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
          <TrendingUp className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">Trading Journal</span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 grid place-items-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-3"
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-14 z-40 border-b border-line bg-bg-1 animate-fade-in">
          <nav className="px-2 py-2 space-y-0.5">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                      isActive
                        ? 'bg-bg-3 text-fg'
                        : 'text-fg-muted hover:text-fg hover:bg-bg-3',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
