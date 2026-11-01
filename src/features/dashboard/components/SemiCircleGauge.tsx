import { motion } from 'framer-motion';
import { motionTokens, popIn } from '@/lib/motion';

interface SemiCircleGaugeProps {
  value: number; // 0 to 100
  wins?: number;
  bes?: number;
  losses?: number;
  className?: string;
}

export function SemiCircleGauge({
  value,
  wins,
  bes,
  losses,
  className = '',
}: SemiCircleGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const strokeWidth = 8;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative w-28 h-16 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 56" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="currentColor"
            className="text-line-strong/30 dark:text-[#262b34]"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Colored Arc */}
          <motion.path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: clamped / 100 }}
            transition={{
              duration: motionTokens.duration.slow,
              ease: motionTokens.ease,
            }}
          />
        </svg>
      </div>

      {(wins !== undefined || losses !== undefined || bes !== undefined) && (
        <motion.div
          variants={popIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
          className="flex items-center gap-1.5 mt-1 text-[11px] font-medium tracking-tight"
        >
          <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {wins ?? 0}
          </span>
          <span className="flex items-center gap-0.5 text-fg-muted bg-bg-3 px-1.5 py-0.5 rounded">
            {bes ?? 0}
          </span>
          <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
            {losses ?? 0}
          </span>
        </motion.div>
      )}
    </div>
  );
}
