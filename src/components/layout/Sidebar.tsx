import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSidebarStore } from '@/store/sidebarStore';

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

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-lg text-sm font-medium transition-all',
          collapsed
            ? 'justify-center p-2.5 h-10 w-10 mx-auto'
            : 'gap-2.5 px-3 py-2 w-full',
          isActive
            ? 'bg-fg text-fg-inverse shadow-sm'
            : 'text-fg-muted hover:text-fg hover:bg-bg-4',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-fg-inverse' : 'text-fg-dim group-hover:text-fg-muted',
            )}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {collapsed && (
            <span className="sr-only">{item.label}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  useLocation();
  const { collapsed, width, toggleCollapse, setWidth } = useSidebarStore();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const left = sidebarRef.current.getBoundingClientRect().left;
        const newWidth = e.clientX - left;
        setWidth(newWidth);
      }
    },
    [isResizing, setWidth],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <aside
      ref={sidebarRef}
      style={{ width: collapsed ? '64px' : `${width}px` }}
      className={cn(
        'relative hidden md:flex shrink-0 flex-col border-r border-line bg-bg-1 transition-[width] duration-150 select-none',
        isResizing && 'transition-none duration-0',
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex h-14 items-center border-b border-line px-3.5',
        collapsed ? 'justify-center' : 'justify-between',
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
            <TrendingUp className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-bold text-fg tracking-tight truncate">TradingLog</span>
              <span className="text-2xs text-fg-dim truncate">My Journal</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div>
          {!collapsed ? (
            <p className="px-2 mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-dim">
              Daily
            </p>
          ) : (
            <div className="h-2" />
          )}
          <div className="space-y-1">
            {CORE.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>

        <div>
          {!collapsed ? (
            <p className="px-2 mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-dim">
              Performance
            </p>
          ) : (
            <div className="my-2 border-t border-line/60" />
          )}
          <div className="space-y-1">
            {ANALYTICS.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-line p-2">
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expand sidebar"
            className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg-3 px-3 py-2">
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-wider text-fg-dim truncate">
                Storage
              </p>
              <p className="text-xs text-fg-muted truncate">Local-first</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Collapse sidebar"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-dim hover:text-fg hover:bg-bg-4 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Drag Resize Handle */}
      {!collapsed && (
        <div
          onMouseDown={startResizing}
          title="Drag to resize sidebar"
          className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/40 active:bg-accent transition-colors z-30"
        />
      )}
    </aside>
  );
}
