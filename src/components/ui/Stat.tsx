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
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-2xs font-semibold uppercase tracking-wider text-fg-dim">{label}</span>
      <span className={cn('text-2xl font-bold tracking-tight tabular-nums', valueColor)}>{value}</span>
      {hint ? <span className="text-2xs text-fg-dim">{hint}</span> : null}
    </div>
  );
}
