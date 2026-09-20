import { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, ScrollText, BarChart3, Calendar, AlertTriangle, TrendingUp, Menu, X, Plus,
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
    <div className="md:hidden relative z-40">
      <div className="flex items-center justify-between h-14 px-4 border-b border-line bg-bg-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-fg">TradingLog</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/journal/new" className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-9 w-9 grid place-items-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-0 border-b border-line bg-bg-1 shadow-pop animate-fade-in">
          <nav className="px-3 py-3 space-y-0.5">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-fg text-fg-inverse' : 'text-fg-muted hover:text-fg hover:bg-bg-4')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
