import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4 md:pb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description ? (
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div> : null}
    </header>
  );
}
