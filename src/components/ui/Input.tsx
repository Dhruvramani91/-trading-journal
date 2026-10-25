import { forwardRef, type InputHTMLAttributes } from 'react';
import { guardNumberInputWheel } from '@/lib/numberInputWheel';
import { cn } from '@/lib/cn';
import { describedByIds, useFormFieldContext } from './FormFieldContext';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, onWheel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid, 'aria-required': ariaRequired, ...props }, ref) => {
    const field = useFormFieldContext();
    return (
      <input
        ref={ref}
        onWheel={(event) => {
          // Mouse wheel must never change a numeric input's value.
          guardNumberInputWheel(event);
          onWheel?.(event);
        }}
        aria-labelledby={ariaLabelledBy ?? field?.labelId}
        aria-describedby={describedByIds(ariaDescribedBy, field?.hintId, field?.errorId)}
        aria-invalid={ariaInvalid ?? (invalid || field?.invalid || undefined)}
        aria-required={ariaRequired ?? (props.required || field?.required || undefined)}
        className={cn(
          'h-9 w-full rounded-lg border bg-bg-2 px-3 text-sm text-fg placeholder:text-fg-dim shadow-input',
          'transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 motion-reduce:transition-none',
          invalid || field?.invalid ? 'border-loss-fill/60 focus:ring-loss-fill/30' : 'border-line hover:border-line-strong',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
