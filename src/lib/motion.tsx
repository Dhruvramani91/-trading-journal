import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { motion, type Variants, type Transition } from 'framer-motion';

/**
 * Shared Motion Tokens for unified timing across the application
 */
export const motionTokens = {
  duration: {
    fast: 0.3,
    base: 0.6,
    slow: 1.0,
  },
  ease: [0.22, 1, 0.36, 1] as const,
  stagger: 0.07,
  distance: 20,
};

const defaultTransition: Transition = {
  duration: motionTokens.duration.base,
  ease: motionTokens.ease,
};

/**
 * Reusable Motion Variants
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: motionTokens.distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: motionTokens.distance },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: defaultTransition,
  },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: motionTokens.duration.fast + 0.1,
      ease: motionTokens.ease,
    },
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.75 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 24,
    },
  },
};

export const drawPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: motionTokens.duration.slow,
      ease: motionTokens.ease,
    },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: (custom?: { stagger?: number; delay?: number }) => ({
    transition: {
      staggerChildren: custom?.stagger ?? motionTokens.stagger,
      delayChildren: custom?.delay ?? 0.04,
    },
  }),
};

/**
 * Thin scroll-reveal wrapper component
 * Triggers entrance animation once when element enters ~20% of viewport
 */
export interface RevealProps extends ComponentPropsWithoutRef<typeof motion.div> {
  amount?: number;
  once?: boolean;
}

export const Reveal = forwardRef<HTMLDivElement, RevealProps>(
  ({ children, variants = fadeUp, amount = 0.2, once = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, amount }}
        variants={variants}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

Reveal.displayName = 'Reveal';

