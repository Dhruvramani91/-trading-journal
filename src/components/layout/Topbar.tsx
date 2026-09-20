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

export function Topbar() {
  const { pathname } = useLocation();
  const meta = TITLES[pathname] ?? { title: 'Trading Journal' };

  return (
    <div className="hidden md:flex h-14 items-center justify-between border-b border-line bg-bg-1 px-6">
      <div className="min-w-0">
        <h1 className="text-base font-bold text-fg tracking-tight">{meta.title}</h1>
        {meta.subtitle && <p className="text-xs text-fg-muted">{meta.subtitle}</p>}
      </div>
      <Button asChild leftIcon={<Plus className="h-4 w-4" />} variant="primary">
        <Link to="/journal/new">New trade</Link>
      </Button>
    </div>
  );
}
