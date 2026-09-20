import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-lg text-sm transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-fg text-fg-inverse hover:opacity-90 shadow-sm',
        secondary: 'bg-bg-2 text-fg border border-line hover:bg-bg-4 hover:border-line-strong shadow-sm',
        ghost: 'text-fg-muted hover:text-fg hover:bg-bg-4',
        outline: 'border border-line-strong text-fg hover:bg-bg-4',
        danger: 'bg-loss/10 text-loss hover:bg-loss/20',
        link: 'text-accent underline-offset-4 hover:underline px-0',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-5 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, leftIcon, rightIcon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonStyles({ variant, size }), className)} {...props}>
        {leftIcon}
        <Slottable>{children}</Slottable>
        {rightIcon}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
