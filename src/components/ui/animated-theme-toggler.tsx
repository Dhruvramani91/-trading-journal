import { flushSync } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useThemeStore } from '@/store/themeStore';

type AnimatedThemeTogglerProps = {
  className?: string;
  showLabel?: boolean;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function AnimatedThemeToggler({ className, showLabel = false }: AnimatedThemeTogglerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggle);
  const prefersReducedMotion = useReducedMotion();
  const isDark = theme === 'dark';

  const onToggle = useCallback(async () => {
    const viewTransitionDocument = document as ViewTransitionDocument;
    if (!buttonRef.current || prefersReducedMotion || !viewTransitionDocument.startViewTransition) {
      toggle();
      return;
    }

    let themeChanged = false;
    try {
      const transition = viewTransitionDocument.startViewTransition(() => {
        flushSync(() => {
          toggle();
          themeChanged = true;
        });
      });
      await transition.ready;

      const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const maxDistance = Math.hypot(
        Math.max(centerX, window.innerWidth - centerX),
        Math.max(centerY, window.innerHeight - centerY),
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${centerX}px ${centerY}px)`,
            `circle(${maxDistance}px at ${centerX}px ${centerY}px)`,
          ],
        },
        {
          duration: 700,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        } as KeyframeAnimationOptions,
      );
    } catch {
      // If the browser starts but cannot animate the transition, keep the theme change.
      if (!themeChanged) toggle();
    }
  }, [prefersReducedMotion, toggle]);

  const nextThemeLabel = isDark ? 'light' : 'dark';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => void onToggle()}
      title={`Switch to ${nextThemeLabel} mode`}
      aria-label={`Switch to ${nextThemeLabel} mode`}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-bg-2 text-fg-muted transition-colors hover:bg-bg-4 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60',
        showLabel && 'w-auto px-3 text-sm',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          aria-hidden="true"
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.6, rotate: isDark ? 25 : -25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24 }}
          className="inline-flex shrink-0"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
      {showLabel && <span>{`Switch to ${nextThemeLabel} mode`}</span>}
    </button>
  );
}
