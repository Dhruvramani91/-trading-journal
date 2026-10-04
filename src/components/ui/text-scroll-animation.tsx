import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

type TextSegment = {
  text: string;
  className?: string;
};

function ScrollCharacter({
  char,
  index,
  centerIndex,
  scrollYProgress,
  className,
  reducedMotion,
}: {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'];
  className?: string;
  reducedMotion: boolean;
}) {
  const distance = index - centerIndex;
  const x = useTransform(scrollYProgress, [0, 0.72], [distance * 8, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.72], [distance * 2.2, 0]);

  return (
    <motion.span
      className={className}
      style={{
        display: 'inline-block',
        x: reducedMotion ? 0 : x,
        rotateX: reducedMotion ? 0 : rotateX,
        transformOrigin: 'center center',
        willChange: reducedMotion ? 'auto' : 'transform',
      }}
    >
      {char}
    </motion.span>
  );
}

export function TextScrollAnimation({
  segments,
  className,
}: {
  segments: TextSegment[];
  className?: string;
}) {
  const targetRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start 90%', 'start 45%'],
  });
  const characters = segments.flatMap((segment) =>
    Array.from(segment.text, (char) => ({ char, className: segment.className })),
  );
  const centerIndex = Math.floor(characters.length / 2);

  return (
    <motion.h2 ref={targetRef} className={className} style={{ perspective: 500 }} aria-label={segments.map((segment) => segment.text).join('')}>
      <span aria-hidden="true" style={{ whiteSpace: 'pre-wrap' }}>
        {characters.map(({ char, className: segmentClass }, index) => (
          <ScrollCharacter
            key={`${index}-${char}`}
            char={char}
            index={index}
            centerIndex={centerIndex}
            scrollYProgress={scrollYProgress}
            className={segmentClass}
            reducedMotion={Boolean(reducedMotion)}
          />
        ))}
      </span>
    </motion.h2>
  );
}
