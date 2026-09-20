import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSidebarStore } from '@/store/sidebarStore';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'core' | 'analytics';
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'core' },
  { to: '/journal', label: 'Journal', icon: ScrollText, group: 'core' },
  { to: '/statistics', label: 'Statistics', icon: BarChart3, group: 'analytics' },
  { to: '/calendar', label: 'Monthly Performance', icon: Calendar, group: 'analytics' },
  { to: '/mistakes', label: 'Mistakes & Filters', icon: AlertTriangle, group: 'analytics' },
];

const CORE = NAV.filter((n) => n.group === 'core');
const ANALYTICS = NAV.filter((n) => n.group === 'analytics');

const COLLAPSED_WIDTH = 80;
const COLLAPSE_THRESHOLD = 130;
const EXPAND_THRESHOLD = 145;
const MIN_EXPANDED_WIDTH = 180;
const MAX_EXPANDED_WIDTH = 360;

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/dashboard'}
        title={item.label}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center justify-center mx-auto transition-all duration-150',
            isActive
              ? 'h-12 w-12 rounded-2xl bg-fg text-fg-inverse shadow-md'
              : 'h-11 w-11 rounded-xl text-fg-dim hover:text-fg hover:bg-bg-4',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn(
                'h-5 w-5 shrink-0 transition-colors',
                isActive ? 'text-white' : 'text-fg-dim group-hover:text-fg',
              )}
            />
            <span className="sr-only">{item.label}</span>
          </>
        )}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 w-full text-sm font-medium transition-all',
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
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  useLocation();
  const navigate = useNavigate();
  const { collapsed, width, toggleCollapse, setCollapsed, setWidth } = useSidebarStore();
  const { user, signOut } = useAuthStore();
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
      if (!isResizing || !sidebarRef.current) return;
      const left = sidebarRef.current.getBoundingClientRect().left;
      const newWidth = e.clientX - left;

      if (collapsed) {
        if (newWidth > EXPAND_THRESHOLD) {
          setCollapsed(false);
          setWidth(Math.min(MAX_EXPANDED_WIDTH, Math.max(MIN_EXPANDED_WIDTH, newWidth)));
        }
      } else {
        if (newWidth < COLLAPSE_THRESHOLD) {
          setCollapsed(true);
        } else {
          setWidth(Math.min(MAX_EXPANDED_WIDTH, Math.max(MIN_EXPANDED_WIDTH, newWidth)));
        }
      }
    },
    [isResizing, collapsed, setCollapsed, setWidth],
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

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <aside
      ref={sidebarRef}
      style={{ width: collapsed ? `${COLLAPSED_WIDTH}px` : `${width}px` }}
      className={cn(
        'relative hidden md:flex shrink-0 flex-col border-r border-line bg-bg-1 select-none',
        !isResizing && 'transition-[width] duration-200 ease-in-out',
      )}
    >
      {/* Header / Logo */}
      {collapsed ? (
        <div className="flex flex-col items-center justify-center py-4 border-b border-line">
          <img
            src="/logo.png"
            alt="PrecisionJournal"
            title="PrecisionJournal"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-line object-contain shadow-md transition-transform hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="PrecisionJournal"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-line object-contain shadow-sm"
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-bold text-fg tracking-tight truncate">PrecisionJournal</span>
              <span className="text-2xs text-fg-dim truncate">My Journal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCollapse}
            title="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className={cn('flex-1 overflow-y-auto px-2 py-4 space-y-4', collapsed && 'px-0 space-y-2')}>
        <div>
          {!collapsed ? (
            <p className="px-2 mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-dim">
              Daily
            </p>
          ) : null}
          <div className={cn('space-y-1.5', collapsed && 'space-y-2')}>
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
            <div className="my-3 border-t border-line/70 w-8 mx-auto" />
          )}
          <div className={cn('space-y-1.5', collapsed && 'space-y-2')}>
            {ANALYTICS.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer / User & Storage Info */}
      <div className={cn('border-t border-line p-2 space-y-2', collapsed && 'p-2.5')}>
        {collapsed ? (
          <div className="space-y-1.5 flex flex-col items-center">
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out to homepage"
              className="flex h-11 w-11 mx-auto items-center justify-center rounded-xl text-fg-dim hover:text-loss hover:bg-loss/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand sidebar"
              className="flex h-11 w-11 mx-auto items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            {user && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg-4 px-2.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-fg truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-[10px] text-fg-dim truncate">
                      {user.isGuest ? 'Guest Session' : 'Synced Trader'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-fg-dim hover:text-loss hover:bg-loss/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg-3 px-3 py-1.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim truncate">
                  Storage
                </p>
                <p className="text-xs text-fg-muted truncate">Local & Cloud Ready</p>
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
          </>
        )}
      </div>

      {/* Drag Resize Handle */}
      <div
        onMouseDown={startResizing}
        title={collapsed ? 'Drag right to expand sidebar' : 'Drag to resize sidebar'}
        className={cn(
          'absolute -right-1 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-accent/40 active:bg-accent transition-colors z-30',
          isResizing && 'bg-accent',
        )}
      />
    </aside>
  );
}
