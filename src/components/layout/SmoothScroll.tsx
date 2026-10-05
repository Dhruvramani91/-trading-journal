import { useEffect, useRef, type ReactNode } from 'react';
import { ReactLenis, type LenisRef } from 'lenis/react';
import { useReducedMotion } from 'framer-motion';

export function SmoothScroll({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    let stoppedForModal = false;
    const syncModalScroll = () => {
      const lenis = lenisRef.current?.lenis;
      if (!lenis) return;

      const hasModal = document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
      if (hasModal && !stoppedForModal) {
        lenis.stop();
        stoppedForModal = true;
      } else if (!hasModal && stoppedForModal) {
        lenis.start();
        stoppedForModal = false;
      }
    };

    const observer = new MutationObserver(syncModalScroll);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    });
    syncModalScroll();

    return () => {
      observer.disconnect();
      if (stoppedForModal) lenisRef.current?.lenis?.start();
    };
  }, []);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: !prefersReducedMotion,
        syncTouch: false,
        autoRaf: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
