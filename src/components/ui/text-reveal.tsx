import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

type TextRevealSegment = {
  text: string;
  className?: string;
};

function RevealWord({
  word,
  className,
  index,
  total,
  progress,
  ghostOpacity,
}: {
  word: string;
  className?: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  ghostOpacity: number;
}) {
  const start = index / total;
  const end = start + 1 / total;
  const opacity = useTransform(progress, [start, end], [0, 1]);

  return (
    <span className="relative mx-1 inline-block whitespace-pre">
      <span aria-hidden="true" className="absolute" style={{ opacity: ghostOpacity }}>{word}</span>
      <motion.span className={className} style={{ opacity }}>{word}</motion.span>
    </span>
  );
}

export function TextRevealByWord({
  segments,
  className,
  ghostOpacity = 0.3,
}: {
  segments: TextRevealSegment[];
  className?: string;
  ghostOpacity?: number;
}) {
  const targetRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start 85%', 'start 45%'],
  });
  const words = segments.flatMap((segment) =>
    (segment.text.match(/\S+\s*/g) ?? []).map((word) => ({
      word,
      className: segment.className,
    })),
  );
  const label = segments.map((segment) => segment.text).join('');

  return (
    <h2 ref={targetRef} className={className} aria-label={label}>
      <span aria-hidden="true">
        {words.map(({ word, className: wordClass }, index) => (
          <RevealWord
            key={`${index}-${word}`}
            word={word}
            className={wordClass}
            index={index}
            total={words.length}
            progress={scrollYProgress}
            ghostOpacity={ghostOpacity}
          />
        ))}
      </span>
    </h2>
  );
}
