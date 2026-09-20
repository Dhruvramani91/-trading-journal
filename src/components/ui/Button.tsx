import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-md text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'bg-bg-3 text-fg border border-line hover:bg-bg-4 hover:border-line-strong',
        ghost: 'text-fg-muted hover:text-fg hover:bg-bg-3',
        outline: 'border border-line text-fg hover:bg-bg-3 hover:border-line-strong',
        danger: 'bg-loss/15 text-loss border border-loss/30 hover:bg-loss/20',
        link: 'text-accent underline-offset-4 hover:underline px-0',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-9 px-3.5',
        lg: 'h-10 px-4 text-base',
        icon: 'h-8 w-8 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, leftIcon, rightIcon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonStyles({ variant, size }), className)}
        {...props}
      >
        {leftIcon}
        <Slottable>{children}</Slottable>
        {rightIcon}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
