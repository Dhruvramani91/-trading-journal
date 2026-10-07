import { useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'A focused view of your trading performance.' },
  '/journal': { title: 'Journal', subtitle: 'Every trade, structured and searchable.' },
  '/statistics': { title: 'Statistics', subtitle: 'Breakdowns across your trading history.' },
  '/calendar': { title: 'Calendar', subtitle: 'Daily performance at a glance.' },
  '/mistakes': { title: 'Mistakes', subtitle: 'Patterns and filters across your trades.' },
  '/profile': { title: 'Profile', subtitle: 'Your account and trading profile.' },
  '/accounts': { title: 'Accounts', subtitle: 'Track account performance and rules.' },
};

export function Topbar() {
  const { pathname } = useLocation();
  const meta = TITLES[pathname] ?? (
    pathname.startsWith('/accounts/')
      ? TITLES['/accounts']!
      : pathname.startsWith('/journal/')
        ? { title: 'Trade Details', subtitle: 'Review this trade.' }
        : { title: 'The Precision Lab' }
  );
  return (
    <header className="hidden h-[68px] shrink-0 items-center justify-between border-b border-line bg-bg-1 px-6 lg:px-8 md:flex">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-fg">{meta.title}</h1>
          {meta.subtitle && <p className="mt-0.5 truncate text-xs text-fg-muted">{meta.subtitle}</p>}
        </div>
      </div>
      <ThemeToggle className="h-9 w-9 border-0 bg-transparent shadow-none hover:bg-bg-3" />
    </header>
  );
}
