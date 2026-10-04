import { useRef } from 'react';
import { motion, MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';

type WordPullUpSegment = {
  text: string;
  className?: string;
};

export function WordPullUp({
  segments,
  className,
}: {
  segments: WordPullUpSegment[];
  className?: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: headingRef,
    offset: ['start 85%', 'start 45%'],
  });
  const prefersReducedMotion = useReducedMotion();
  const words = segments.flatMap((segment) =>
    (segment.text.match(/\S+\s*/g) ?? []).map((word) => ({
      word,
      className: segment.className,
    })),
  );
  const label = segments.map((segment) => segment.text).join('');

  return (
    <motion.h2
      ref={headingRef}
      className={className}
      aria-label={label}
    >
      <span aria-hidden="true">
        {words.map(({ word, className: wordClass }, index) => (
          <ScrollWord
            key={`${index}-${word}`}
            word={word}
            className={wordClass}
            progress={scrollYProgress}
            index={index}
            count={words.length}
            reducedMotion={!!prefersReducedMotion}
          />
        ))}
      </span>
    </motion.h2>
  );
}

function ScrollWord({
  word,
  className,
  progress,
  index,
  count,
  reducedMotion,
}: {
  word: string;
  className?: string;
  progress: MotionValue<number>;
  index: number;
  count: number;
  reducedMotion: boolean;
}) {
  const start = index / count;
  const end = (index + 1) / count;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [22, 0]);

  return (
    <motion.span
      className={className}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre',
        opacity: reducedMotion ? 1 : opacity,
        y: reducedMotion ? 0 : y,
      }}
    >
      {word}
    </motion.span>
  );
}
