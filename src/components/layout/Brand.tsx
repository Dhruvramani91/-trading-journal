import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export const BRAND_NAME = 'PrecisionJournal';
export const BRAND_TAGLINE = 'Journal your trades';

export function BrandLogo({
  size = 'md',
  className,
  rounded = 'rounded-lg',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  rounded?: string;
}) {
  const box =
    size === 'lg'
      ? 'h-12 w-12'
      : size === 'sm'
        ? 'h-7 w-7'
        : 'h-8 w-8';

  const img =
    size === 'lg'
      ? 'h-8 w-8'
      : size === 'sm'
        ? 'h-4.5 w-4.5'
        : 'h-5 w-5';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-bg-2 border border-line shrink-0',
        box,
        rounded,
        className,
      )}
    >
      <img
        src="/logo.png"
        alt={BRAND_NAME}
        className={cn(
          img,
          'object-contain brand-logo-light',
        )}
      />

      <img
        src="/logo-white.png"
        alt={BRAND_NAME}
        className={cn(
          img,
          'object-contain brand-logo-dark',
        )}
      />
    </div>
  );
}

export function BrandMark({
  to = '/',
  size = 'md',
  showName = true,
  nameClassName,
}: {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  nameClassName?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 min-w-0"
    >
      <BrandLogo size={size} />

      {showName && (
        <span
          className={cn(
            'font-bold tracking-tight text-fg truncate',
            size === 'lg'
              ? 'text-lg'
              : size === 'sm'
                ? 'text-sm'
                : 'text-base',
            nameClassName,
          )}
        >
          {BRAND_NAME}
        </span>
      )}
    </Link>
  );
}