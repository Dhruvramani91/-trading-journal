import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider',
  {
    variants: {
      tone: {
        neutral: 'bg-bg-4 text-fg-muted',
        accent: 'bg-accent/10 text-accent',
        win: 'bg-win/10 text-win',
        loss: 'bg-loss/10 text-loss',
        be: 'bg-be/10 text-be',
        outline: 'bg-transparent text-fg-muted border border-line-strong',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}
