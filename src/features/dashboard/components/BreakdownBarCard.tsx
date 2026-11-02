import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { motionTokens } from '@/lib/motion';

interface BreakdownBarCardProps {
  title: string;
  items: Array<{
    label: string;
    count?: number;
    winRate?: number; // 0-100
    avgMetric?: number;
    displayMetric?: string;
  }>;
  variant?: 'winRate' | 'metric' | 'duration';
  metricMode?: 'r' | 'pnl';
  headerRight?: ReactNode;
  className?: string;
}

export function BreakdownBarCard({
  title,
  items,
  variant = 'winRate',
  headerRight,
  className = '',
}: BreakdownBarCardProps) {
  // Find maximum metric/win rate to scale heights accurately
  const maxVal = Math.max(
    ...items.map((it) => {
      if (variant === 'winRate') return it.winRate ?? 0;
      return Math.abs(it.avgMetric ?? 0);
    }),
    1,
  );

  // Highest performing item in the set
  const activeItems = items.filter((it) => (it.count ?? 0) > 0);
  const topItem = activeItems.length > 0
    ? [...activeItems].sort((a, b) => {
      if (variant === 'winRate') return (b.winRate ?? 0) - (a.winRate ?? 0);
      return (b.avgMetric ?? 0) - (a.avgMetric ?? 0);
    })[0]
    : null;

  return (
    <div
      className={`bg-bg-1 border border-line rounded-xl p-5 flex flex-col justify-between shadow-card transition-colors duration-200 ${className}`}
    >
      {/* Header with Title, Top Performer Pill, and optional headerRight controls */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-fg tracking-normal">{title}</h3>
          {topItem && (
            <span className="text-[11px] font-medium text-fg-muted px-2 py-0.5 rounded-md bg-bg-2 border border-line">
              {topItem.label}:{' '}
              <span className="text-fg font-mono font-semibold">
                {variant === 'winRate'
                  ? `${Math.round(topItem.winRate ?? 0)}%`
                  : topItem.displayMetric || `${topItem.avgMetric?.toFixed(1)}`}
              </span>
            </span>
          )}
        </div>
        {headerRight && <div className="flex items-center">{headerRight}</div>}
      </div>

      {/* Vertical Bar Columns Matrix */}
      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 items-end h-44 pt-2 pb-2">
        {items.map((item, idx) => {
          let heightPct = 0;
          const hasTrades = (item.count ?? 0) > 0;
          const val = item.avgMetric ?? 0;

          if (variant === 'winRate') {
            const wr = Math.round(item.winRate ?? 0);
            heightPct = hasTrades ? Math.max(14, wr) : 10;
          } else if (variant === 'duration') {
            const dur = Math.max(0, val);
            heightPct = hasTrades ? Math.max(14, Math.min(100, (dur / maxVal) * 100)) : 10;
          } else {
            // Metric variant: scale by absolute value relative to maxVal
            const absVal = Math.abs(val);
            heightPct = hasTrades ? Math.max(14, Math.min(100, (absVal / maxVal) * 100)) : 10;
          }

          const isNegative = hasTrades && val < 0;
          const isTop = topItem && topItem.label === item.label && hasTrades;

          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-end h-full group cursor-pointer transition-colors"
            >
              {/* Value Indicator Above Bar */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.4,
                  delay: hasTrades ? 0.3 + idx * 0.07 : 0.1,
                  ease: motionTokens.ease,
                }}
                className={`text-[10px] sm:text-[11px] font-mono mb-2 transition-colors duration-150 truncate ${
                  isTop
                    ? 'text-sky-500 dark:text-sky-400 font-semibold'
                    : isNegative
                      ? 'text-rose-500 font-medium'
                      : hasTrades
                        ? 'text-fg-muted group-hover:text-fg'
                        : 'text-fg-dim/40'
                }`}
              >
                {!hasTrades ? (
                  '—'
                ) : item.displayMetric ? (
                  item.displayMetric
                ) : variant === 'winRate' ? (
                  <NumberFlow value={Math.round(item.winRate ?? 0)} suffix="%" />
                ) : variant === 'duration' ? (
                  <NumberFlow value={Math.max(0, val)} suffix="m" />
                ) : (
                  <NumberFlow
                    value={val}
                    format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    suffix="R"
                  />
                )}
              </motion.div>

              {/* Column Track & Refined Bar */}
              <div className="w-full flex justify-center items-end h-28">
                <motion.div
                  initial={{ height: hasTrades ? 0 : '10%', opacity: 0 }}
                  whileInView={{ height: `${heightPct}%`, opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.07,
                    ease: motionTokens.ease,
                  }}
                  className={`w-full max-w-[36px] rounded-t-md relative overflow-hidden transition-colors ${
                    isTop
                      ? 'bg-sky-500 dark:bg-sky-400/90 group-hover:bg-sky-400'
                      : isNegative
                        ? 'bg-rose-500/80 group-hover:bg-rose-500'
                        : hasTrades
                          ? 'bg-fg-muted/30 group-hover:bg-fg-muted/50'
                          : 'bg-bg-3/50'
                  }`}
                />
              </div>

              {/* Bottom Label and Trade Count */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="flex flex-col items-center mt-2.5 text-center"
              >
                <span
                  className={`text-xs font-medium tracking-normal truncate max-w-full transition-colors ${
                    isTop
                      ? 'text-fg font-semibold'
                      : 'text-fg-muted group-hover:text-fg'
                  }`}
                >
                  {item.label}
                </span>
                {item.count != null && (
                  <span className="text-[10px] text-fg-dim font-mono mt-0.5 group-hover:text-fg-muted transition-colors">
                    {item.count} {item.count === 1 ? 'trade' : 'trades'}
                  </span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
