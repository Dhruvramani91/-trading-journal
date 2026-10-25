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
    <header className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-5 md:pb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div> : null}
    </header>
  );
}
