import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;

/**
 * Portal-rendered tooltip content.
 *
 * Rendered through a Radix Portal so it is never clipped by — and never widens
 * the scrollable overflow of — any ancestor such as a modal body, a form
 * section, or a grid container. Collision handling is delegated to Radix, which
 * automatically flips the tooltip between top/right/bottom/left to remain
 * inside the viewport.
 */
const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, collisionPadding = 12, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      avoidCollisions
      className={cn(
        'z-[70] w-max max-w-[300px] whitespace-normal break-words',
        'rounded-lg border border-line bg-bg-3 px-3 py-2.5',
        'text-left text-xs font-normal leading-relaxed text-fg-muted',
        'shadow-pop animate-fade-in',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));

TooltipContent.displayName = 'TooltipContent';

interface TooltipProps {
  /** Tooltip body. */
  content: ReactNode;
  /** The element that opens the tooltip — rendered as the Radix trigger. */
  children: ReactNode;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>['side'];
  align?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>['align'];
  sideOffset?: number;
  collisionPadding?: number;
  delayDuration?: number;
  contentClassName?: string;
}

/**
 * Convenience tooltip used across the app. Bundles Radix'
 * Root/Trigger/Portal/Content into a single component (with its own Provider)
 * so callers do not need to mount a global provider.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 8,
  collisionPadding = 12,
  delayDuration = 150,
  contentClassName,
}: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={contentClassName}
        >
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export { TooltipProvider, TooltipRoot, TooltipContent };