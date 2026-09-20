import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-lg border bg-bg-2 pl-3 pr-8 text-sm text-fg shadow-input',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
          invalid ? 'border-loss/60' : 'border-line hover:border-line-strong',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
    </div>
  ),
);
Select.displayName = 'Select';

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string; tone?: 'default' | 'win' | 'loss' | 'neutral' }>;
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  fullWidth,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-line bg-bg-3 p-0.5',
        size === 'sm' ? 'h-7' : 'h-9',
        fullWidth && 'w-full',
        className,
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeTone =
          opt.tone === 'win'
            ? 'bg-win/15 text-win font-semibold'
            : opt.tone === 'loss'
              ? 'bg-loss/15 text-loss font-semibold'
              : 'bg-bg-2 text-fg shadow-sm font-semibold';
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1 rounded-md text-xs transition-all',
              size === 'sm' ? 'h-6 px-2' : 'h-8 px-3',
              isActive ? activeTone : 'text-fg-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FormField({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold text-fg">
        {label}
        {required ? <span className="text-loss"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-2xs text-fg-dim">{hint}</span> : null}
    </label>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-sm font-bold text-fg tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
        ) : null}
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
