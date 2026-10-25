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
    <header className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 md:pb-8', className)}>
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">The Precision Lab</p>
        <h1 className="font-display text-[2rem] leading-[1.05] tracking-tight text-fg sm:text-[2.5rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div> : null}
    </header>
  );
}
