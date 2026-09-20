import { Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your trading performance' },
  '/journal': { title: 'Journal', subtitle: 'Every trade, structured and searchable' },
  '/statistics': { title: 'Statistics', subtitle: 'Breakdowns across every category' },
  '/calendar': { title: 'Monthly Performance', subtitle: 'Daily R at a glance' },
  '/mistakes': { title: 'Mistakes & Filters', subtitle: 'What is costing you R' },
};

const DEFAULT_META = { title: 'Trading Journal' };

export function Topbar() {
  const { pathname } = useLocation();
  const meta: { title: string; subtitle?: string } = TITLES[pathname] ?? DEFAULT_META;

  return (
    <div className="hidden md:flex h-14 items-center justify-between border-b border-line bg-bg-0/80 backdrop-blur px-6">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{meta.title}</h2>
        {meta.subtitle ? (
          <p className="text-2xs text-fg-dim">{meta.subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
          <Link to="/journal/new">New trade</Link>
        </Button>
      </div>
    </div>
  );
}
