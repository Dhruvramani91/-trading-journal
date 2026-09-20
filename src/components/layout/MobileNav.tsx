import { useState, useEffect } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Menu,
  X,
  Plus,
  Home,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

const ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Journal', icon: ScrollText },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/calendar', label: 'Monthly Performance', icon: Calendar },
  { to: '/mistakes', label: 'Mistakes & Filters', icon: AlertTriangle },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <div className="md:hidden relative z-50">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-line bg-bg-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-fg tracking-tight">TradingLog</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/journal/new"
            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold shadow-sm hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-fg/20 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-down Menu */}
      {open && (
        <div className="absolute inset-x-0 top-14 bg-bg-1 border-b border-line shadow-pop z-50 animate-fade-in">
          <nav className="p-3 space-y-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-fg text-fg-inverse shadow-sm'
                        : 'text-fg-muted hover:text-fg hover:bg-bg-4',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-2 mt-2 border-t border-line space-y-1">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Homepage</span>
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-loss hover:bg-loss/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
