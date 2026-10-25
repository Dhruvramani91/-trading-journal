import { useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/journal': 'Journal',
  '/statistics': 'Statistics',
  '/calendar': 'Calendar',
  '/mistakes': 'Mistakes',
  '/profile': 'Profile',
  '/manage-subscription': 'Manage subscription',
  '/accounts': 'Accounts',
  '/backtests': 'Backtest storage',
  '/figma-templates': 'Figma templates',
};

export function Topbar() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? (
    pathname.startsWith('/accounts/')
      ? TITLES['/accounts']
      : pathname.startsWith('/journal/')
        ? 'Trade Details'
        : pathname.startsWith('/backtests/')
          ? 'Backtest session'
        : 'The Precision Lab'
  );
  return (
    <header className="hidden h-[68px] shrink-0 items-center justify-between border-b border-line bg-bg-1 px-6 lg:px-8 md:flex">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-fg">{title}</h1>
        </div>
      </div>
      <ThemeToggle className="h-9 w-9 border-0 bg-transparent shadow-none hover:bg-bg-3" />
    </header>
  );
}
