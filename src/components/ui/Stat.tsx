import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'win' | 'loss' | 'accent';
  className?: string;
}

export function Stat({ label, value, hint, tone = 'default', className }: StatProps) {
  const valueColor =
    tone === 'win'
      ? 'text-win'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-fg';

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-dim">{label}</span>
      <span className={cn('data-value text-[1.7rem] font-semibold leading-none tracking-tight', valueColor)}>{value}</span>
      {hint ? <span className="text-xs leading-5 text-fg-muted">{hint}</span> : null}
    </div>
  );
}
