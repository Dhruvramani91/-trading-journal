import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border bg-bg-2 px-3 text-sm text-fg placeholder:text-fg-dim shadow-input',
        'transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
        invalid ? 'border-loss/60 focus:ring-loss/30' : 'border-line hover:border-line-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
