import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: {
    ring: 'h-14 w-14',
    title: 'text-xs font-medium',
    subtitle: 'text-[11px]',
    spacing: 'gap-1.5',
    width: 'max-w-48',
  },
  md: {
    ring: 'h-24 w-24',
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
    spacing: 'gap-2',
    width: 'max-w-56',
  },
  lg: {
    ring: 'h-32 w-32',
    title: 'text-base font-semibold',
    subtitle: 'text-sm',
    spacing: 'gap-3',
    width: 'max-w-64',
  },
} satisfies Record<NonNullable<LoaderProps['size']>, Record<string, string>>;

export function Loader({
  title = 'Loading…',
  subtitle,
  size = 'md',
  className,
  ...props
}: LoaderProps) {
  const config = sizes[size];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-5 p-6 text-fg',
        className,
      )}
      {...props}
    >
      <div className={cn('loader-rings relative shrink-0', config.ring)} aria-hidden="true">
        <span className="loader-ring loader-ring-outer" />
        <span className="loader-ring loader-ring-primary" />
        <span className="loader-ring loader-ring-secondary" />
        <span className="loader-ring loader-ring-particle" />
      </div>
      <div className={cn('flex flex-col text-center', config.spacing, config.width)}>
        <p className={cn('loader-text-in text-fg', config.title)}>{title}</p>
        {subtitle ? (
          <p className={cn('loader-text-in text-fg-muted', config.subtitle)}>{subtitle}</p>
        ) : null}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
