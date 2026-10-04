import { forwardRef, useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';
import './inputOverlay.tokens.css';

const EVENT_NAME = 'precision-ui-popover-open';

/** Closes any other shared popover when a new one is opened. */
export function useExclusivePopover(
  id: string,
  open: boolean,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    document.addEventListener(EVENT_NAME, closeOther);
    return () => document.removeEventListener(EVENT_NAME, closeOther);
  }, [id, setOpen]);

  useEffect(() => {
    if (open) document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
  }, [id, open]);
}

interface AnimatedPopoverContentProps extends ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  children: ReactNode;
  panelClassName?: string;
}

export const AnimatedPopoverContent = forwardRef<HTMLDivElement, AnimatedPopoverContentProps>(
  ({ children, className, panelClassName, sideOffset = 8, collisionPadding = 12, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        avoidCollisions
        className={cn('ui-popover-motion z-50 w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-24px)]', className)}
        {...props}
      >
        <div className={cn('ui-popover-inner rounded-[var(--input-overlay-radius)] border border-[rgb(var(--input-overlay-border))] bg-[rgb(var(--input-overlay-panel))] text-[rgb(var(--input-overlay-text))] shadow-[var(--input-overlay-shadow)]', panelClassName)}>
          {children}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  ),
);
AnimatedPopoverContent.displayName = 'AnimatedPopoverContent';

export { PopoverPrimitive };
