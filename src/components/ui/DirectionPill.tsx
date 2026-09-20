import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Trade } from '@/domain/models/trade';

export function DirectionPill({
  direction,
  className,
}: {
  direction: Trade['direction'];
  className?: string;
}) {
  const isLong = direction === 'long';
  const Icon = isLong ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium border',
        isLong
          ? 'text-win border-win/30 bg-win/10'
          : 'text-loss border-loss/30 bg-loss/10',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {isLong ? 'Long' : 'Short'}
    </span>
  );
}
