import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium border',
  {
    variants: {
      tone: {
        neutral: 'bg-bg-3 text-fg-muted border-line',
        accent: 'bg-accent/10 text-accent border-accent/30',
        win: 'bg-win/10 text-win border-win/30',
        loss: 'bg-loss/10 text-loss border-loss/30',
        be: 'bg-be/10 text-be border-be/30',
        outline: 'bg-transparent text-fg-muted border-line',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}
