import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  UserRound,
  Wallet,
  TriangleAlert,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { KeyboardEvent, PointerEvent } from 'react';
import { BrandLogo } from '@/components/layout/Brand';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useRef, useState } from 'react';

const GROUPS = [
  {
    label: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/journal', label: 'Journal', icon: ScrollText },
      { to: '/accounts', label: 'Accounts', icon: Wallet },
    ],
  },
  {
    label: 'Analytics',
    links: [
      { to: '/statistics', label: 'Statistics', icon: BarChart3 },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/mistakes', label: 'Mistakes', icon: TriangleAlert },
    ],
  },
] as const;

export function Sidebar() {
  const navigate = useNavigate();
  const { width, setWidth, toggleCollapse } = useSidebarStore();
  const collapsed = width < 128;
  const { user, signOut } = useAuthStore();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);

  async function confirmSignOut() {
    setLogoutOpen(false);
    await signOut();
    navigate('/');
  }

  function resizeFromPointer(event: PointerEvent<HTMLDivElement>) {
    if (!resizeStart.current) return;
    const nextWidth = resizeStart.current.width + event.clientX - resizeStart.current.x;
    setWidth(nextWidth);
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setWidth(width + (event.key === 'ArrowRight' ? 16 : -16));
  }

  return (
    <aside
      aria-label="Main sidebar"
      style={{ width }}
      className={cn(
        'relative z-20 hidden shrink-0 flex-col bg-bg-1 md:flex',
        collapsed
          ? 'my-3 ml-3 mr-2 h-[calc(100%-24px)] rounded-2xl border border-line shadow-pop'
          : 'h-full border-r border-line',
      )}
    >
      <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center px-2' : 'justify-start px-4')}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className={cn('flex min-w-0 items-center text-left', collapsed ? 'justify-center' : 'gap-3')}
          aria-label="The Precision Lab home"
        >
          <BrandLogo size="lg" className="h-9 w-9" />
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-bold tracking-tight text-fg">The Precision Lab</span>
              <span className="mt-0.5 truncate text-[11px] text-fg-muted">Trading Journal</span>
            </span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={toggleCollapse}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute right-[-11px] top-[4.5rem] z-40 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg-1 text-fg-dim shadow-sm transition-colors hover:bg-bg-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>

      <nav className={cn('min-h-0 flex-1 space-y-7 overflow-y-auto py-6', collapsed ? 'px-2' : 'px-3')}>
        {GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && <h2 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-dim">{group.label}</h2>}
            <div className="space-y-1">
              {group.links.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={'end' in item ? item.end : false}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) => cn(
                      'group flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-fg-muted hover:bg-bg-3 hover:text-fg',
                    )}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && <span className="sr-only">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-line py-3', collapsed ? 'px-2' : 'px-3')}>
        {user && (
          <button
            type="button"
            onClick={() => navigate('/profile')}
            title={collapsed ? `${user.name || user.email} · Profile` : undefined}
            className={cn(
              'mb-2 flex h-10 w-full items-center rounded-lg text-left transition-colors hover:bg-bg-3',
              collapsed ? 'justify-center' : 'gap-3 px-2',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-3 text-accent">
              {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" />}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-fg">{user.name || user.email}</span>
                <span className="block truncate text-[10px] text-fg-dim">Profile</span>
              </span>
            )}
          </button>
        )}
        <ThemeToggle
          showLabel={!collapsed}
          className={cn(
            'mb-1 h-9 border-0 bg-transparent shadow-none hover:bg-bg-3',
            collapsed ? 'w-full' : 'w-full justify-start gap-2 whitespace-nowrap px-2 text-[11px]',
          )}
        />
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          title={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
          className={cn('flex h-9 w-full items-center rounded-lg text-[13px] font-medium text-fg-muted transition-colors hover:bg-loss/10 hover:text-loss', collapsed ? 'justify-center' : 'gap-3 px-3')}
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      <div
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={72}
        aria-valuemax={360}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={(event) => {
          resizeStart.current = { x: event.clientX, width };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={resizeFromPointer}
        onPointerUp={(event) => {
          resizeFromPointer(event);
          resizeStart.current = null;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
        onPointerCancel={() => { resizeStart.current = null; }}
        onKeyDown={handleResizeKeyDown}
        className="absolute inset-y-0 -right-1.5 z-30 w-3 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors hover:after:bg-accent focus-visible:after:bg-accent"
      />

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out?"
        description="You’ll be returned to the homepage. Make sure your trades are saved."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={confirmSignOut}
      />
    </aside>
  );
}
