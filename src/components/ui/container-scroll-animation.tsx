"use client";
import React, { useRef } from 'react';
import { useScroll, useTransform, useSpring, motion, MotionValue } from 'framer-motion';

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Start when the preview reaches the lower part of the viewport (the first
    // reference frame), and finish as the section's bottom reaches the fold
    // (the straight, fully revealed reference frame).
    offset: ['start 70%', 'end 100%'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    // Follow the user's scroll promptly while smoothing small wheel/touch jumps.
    stiffness: 420,
    damping: 42,
    mass: 0.18,
    restDelta: 0.001,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1]);

  const rotate = useTransform(smoothProgress, [0, 1], [20, 0]);
  const scale = useTransform(smoothProgress, [0, 1], scaleDimensions());
  const translate = useTransform(smoothProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[42rem] md:h-[52rem] flex items-center justify-center relative p-2 md:p-10"
      ref={containerRef}
    >
      <div className="py-6 md:py-12 w-full relative" style={{ perspective: '1000px' }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => (
  <motion.div style={{ translateY: translate }} className="div max-w-5xl mx-auto text-center">
    {titleComponent}
  </motion.div>
);

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      boxShadow: 'var(--shadow-card)',
    }}
    className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border border-line-strong p-2 md:p-6 bg-bg-1 rounded-[30px] shadow-card"
  >
    <div className="container-scroll-content h-full w-full overflow-hidden rounded-2xl bg-bg-2 md:rounded-2xl md:p-4">
      {children}
    </div>
  </motion.div>
);
