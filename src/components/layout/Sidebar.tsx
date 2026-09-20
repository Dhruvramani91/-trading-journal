import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'core' | 'analytics';
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'core' },
  { to: '/journal', label: 'Journal', icon: ScrollText, group: 'core' },
  { to: '/statistics', label: 'Statistics', icon: BarChart3, group: 'analytics' },
  { to: '/calendar', label: 'Monthly Performance', icon: Calendar, group: 'analytics' },
  { to: '/mistakes', label: 'Mistakes & Filters', icon: AlertTriangle, group: 'analytics' },
];

const CORE = NAV.filter((n) => n.group === 'core');
const ANALYTICS = NAV.filter((n) => n.group === 'analytics');

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-bg-3 text-fg'
            : 'text-fg-muted hover:text-fg hover:bg-bg-3/60',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'h-4 w-4 shrink-0',
              isActive ? 'text-accent' : 'text-fg-dim group-hover:text-fg-muted',
            )}
          />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  // useLocation just to keep the component aware of route changes for any future deep-link highlighting needs
  useLocation();

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-line bg-bg-1">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-line">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-fg">Trading Journal</span>
          <span className="text-2xs text-fg-dim">My Journal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        <div>
          <p className="px-2 mb-1.5 text-2xs uppercase tracking-wider text-fg-dim">Daily Essentials</p>
          <div className="space-y-0.5">
            {CORE.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
          </div>
        </div>
        <div>
          <p className="px-2 mb-1.5 text-2xs uppercase tracking-wider text-fg-dim">Performance</p>
          <div className="space-y-0.5">
            {ANALYTICS.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="rounded-md border border-line bg-bg-2 p-3">
          <p className="text-2xs uppercase tracking-wider text-fg-dim">Status</p>
          <p className="mt-1 text-xs text-fg-muted">
            Local-first. Data persists in your browser.
          </p>
        </div>
      </div>
    </aside>
  );
}
