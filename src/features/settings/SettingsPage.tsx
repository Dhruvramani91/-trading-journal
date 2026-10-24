import { Link } from 'react-router-dom';
import { ArrowRight, PanelsTopLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';

export function SettingsPage() {
  return <div className="space-y-6">
    <PageHeader title="Settings" description="Manage your journal preferences and workspace." />
    <Link to="/settings/templates" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
      <Card className="transition-colors hover:border-line-strong"><CardBody className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><PanelsTopLeft className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><CardTitle>Journal templates</CardTitle><span className="mt-1 block text-sm text-fg-muted">Choose a default strategy template or create and customize your own.</span></span>
        <ArrowRight className="h-4 w-4 shrink-0 text-fg-dim" />
      </CardBody></Card>
    </Link>
  </div>;
}
