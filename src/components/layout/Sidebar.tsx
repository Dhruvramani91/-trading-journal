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
          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          isActive
            ? 'bg-fg text-fg-inverse shadow-sm'
            : 'text-fg-muted hover:text-fg hover:bg-bg-4',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-fg-inverse' : 'text-fg-dim group-hover:text-fg-muted')} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  useLocation();
  return (
    <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col border-r border-line bg-bg-1">
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-line">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-fg tracking-tight">TradingLog</span>
          <span className="text-2xs text-fg-dim">My Journal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <p className="px-1 mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-dim">Daily</p>
          <div className="space-y-0.5">
            {CORE.map((item) => <NavRow key={item.to} item={item} />)}
          </div>
        </div>
        <div>
          <p className="px-1 mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-dim">Performance</p>
          <div className="space-y-0.5">
            {ANALYTICS.map((item) => <NavRow key={item.to} item={item} />)}
          </div>
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="rounded-lg border border-line bg-bg-3 px-3 py-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">Storage</p>
          <p className="mt-0.5 text-xs text-fg-muted">Local-first · browser storage</p>
        </div>
      </div>
    </aside>
  );
}
