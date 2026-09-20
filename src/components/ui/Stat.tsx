import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'win' | 'loss' | 'accent';
  className?: string;
}

/** Compact stat tile — used on dashboard and inside cards. */
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
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="stat-label">{label}</span>
      <span className={cn('stat-num text-2xl', valueColor)}>{value}</span>
      {hint ? <span className="text-2xs text-fg-dim">{hint}</span> : null}
    </div>
  );
}
