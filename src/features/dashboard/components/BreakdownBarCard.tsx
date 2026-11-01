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
      className={`bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card hover:border-line-strong transition-all duration-200 ${className}`}
    >
      {/* Header with Title, Top Performer Pill, and optional headerRight controls */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-fg tracking-tight">{title}</h3>
          {topItem && (
            <span className="text-[10px] font-semibold text-fg-dim px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] border border-line/60">
              {topItem.label}:{' '}
              <span className="text-sky-500 font-mono font-bold">
                {variant === 'winRate'
                  ? `${Math.round(topItem.winRate ?? 0)}%`
                  : topItem.displayMetric || `${topItem.avgMetric?.toFixed(1)}`}
              </span>
            </span>
          )}
        </div>
        {headerRight && <div className="flex items-center">{headerRight}</div>}
      </div>

      {/* Modern High-End Vertical Bar Columns Matrix */}
      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 items-end min-h-[170px] pt-2 pb-2">
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
          // Every item with activity (> 0 count, or winRate > 0, or avgMetric > 0) gets the full vivid glowing sky blue color
          const isGlowing = hasTrades && !isNegative && (val > 0 || (item.winRate ?? 0) > 0);
          const isTop = topItem && topItem.label === item.label && hasTrades;

          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-end h-full group cursor-pointer transition-transform duration-150 hover:-translate-y-1"
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
                className={`text-[10px] sm:text-[11px] font-mono font-semibold mb-2 transition-all duration-200 truncate ${
                  isGlowing || isTop
                    ? 'text-sky-500 font-bold group-hover:text-sky-400'
                    : isNegative
                      ? 'text-rose-500 font-semibold group-hover:text-rose-400'
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

              {/* Column Track & Glowing Rounded Bar */}
              <div className="w-full flex justify-center items-end h-28">
                <motion.div
                  initial={{ height: hasTrades ? 0 : '10%', opacity: 0 }}
                  whileInView={{ height: `${heightPct}%`, opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.65,
                    delay: idx * 0.07,
                    ease: [0.16, 1, 0.3, 1], // Smooth snappy cubic-bezier spring feel
                  }}
                  className={`w-full max-w-[42px] rounded-t-2xl sm:rounded-t-[20px] relative overflow-hidden flex flex-col justify-start items-center ${
                    isGlowing || isTop
                      ? 'bg-gradient-to-t from-sky-600 via-sky-500 to-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.45)] ring-1 ring-sky-300/40 group-hover:shadow-[0_0_25px_rgba(56,189,248,0.65)] group-hover:from-sky-500 group-hover:to-sky-300'
                      : isNegative
                        ? 'bg-gradient-to-t from-rose-800/80 via-rose-700/70 to-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] group-hover:to-rose-400'
                        : hasTrades
                          ? 'bg-gradient-to-t from-zinc-700/60 via-zinc-600/70 to-zinc-400/80 dark:from-zinc-800/80 dark:via-zinc-700/80 dark:to-zinc-500/90 group-hover:from-zinc-600 group-hover:to-zinc-300'
                          : 'bg-zinc-800/20 dark:bg-zinc-800/30 group-hover:bg-zinc-800/40'
                  }`}
                />
              </div>

              {/* Bottom Label and Trade Count */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="flex flex-col items-center mt-3 text-center"
              >
                <span
                  className={`text-xs font-semibold tracking-tight truncate max-w-full transition-colors ${
                    isGlowing || isTop
                      ? 'text-sky-500 font-bold group-hover:text-sky-400'
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
