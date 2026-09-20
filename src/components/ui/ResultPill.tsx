import { cn } from '@/lib/cn';
import type { Trade } from '@/domain/models/trade';
import { Check, Minus, X } from 'lucide-react';

const STYLES: Record<Trade['result'], { cls: string; label: string; Icon: typeof Check }> = {
  win: { cls: 'pill-win', label: 'Win', Icon: Check },
  loss: { cls: 'pill-loss', label: 'Loss', Icon: X },
  be: { cls: 'pill-be', label: 'BE', Icon: Minus },
};

export function ResultPill({
  result,
  className,
}: {
  result: Trade['result'];
  className?: string;
}) {
  const { cls, label, Icon } = STYLES[result];
  return (
    <span className={cn(cls, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
