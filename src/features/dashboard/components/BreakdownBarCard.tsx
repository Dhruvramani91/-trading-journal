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
  className?: string;
}

export function BreakdownBarCard({
  title,
  items,
  variant = 'winRate',
  className = '',
}: BreakdownBarCardProps) {
  // Find max value to normalize bar heights
  const maxVal = Math.max(
    ...items.map((it) => {
      if (variant === 'winRate') return it.winRate ?? 0;
      if (variant === 'duration') return it.avgMetric ?? 0;
      return it.avgMetric ?? 0;
    }),
    1,
  );

  return (
    <div className={`bg-bg-1 dark:bg-[#121417] border border-line rounded-2xl p-5 flex flex-col justify-between shadow-card ${className}`}>
      <h3 className="text-xs font-semibold text-fg-muted mb-3 tracking-tight">{title}</h3>

      {/* Vertical Bar Comparison Area */}
      <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-3 items-end min-h-[148px] pt-2 pb-1">
        {items.map((item, idx) => {
          let heightPct = 0;
          let labelText = '';

          if (variant === 'winRate') {
            const wr = Math.round(item.winRate ?? 0);
            heightPct = Math.max(14, wr);
            labelText = `${wr}%`;
          } else if (variant === 'duration') {
            const dur = item.avgMetric ?? 0;
            heightPct = Math.max(14, (dur / maxVal) * 100);
            labelText = item.displayMetric || `${dur}m`;
          } else {
            const val = item.avgMetric ?? 0;
            heightPct = Math.max(14, (val / maxVal) * 100);
            labelText = item.displayMetric || val.toFixed(2);
          }

          const isPositive = (item.winRate ?? 0) >= 50;

          return (
            <div key={idx} className="flex flex-col items-center justify-end h-full group">
              {/* Value on top of bar */}
              <span className="text-[11px] font-mono font-medium text-fg mb-2 transition-transform group-hover:-translate-y-0.5">
                {labelText}
              </span>

              {/* Bar Fill */}
              <div className="w-full max-w-[64px] bg-bg-2 dark:bg-[#181b20] border border-line/50 rounded-xl p-1 h-24 flex flex-col justify-end">
                <div
                  className={`w-full rounded-lg transition-all duration-500 ${
                    variant === 'winRate'
                      ? isPositive
                        ? 'bg-emerald-500/25 border border-emerald-500/50 group-hover:bg-emerald-500/35'
                        : 'bg-rose-500/25 border border-rose-500/50 group-hover:bg-rose-500/35'
                      : 'bg-zinc-500/20 dark:bg-zinc-700/40 border border-zinc-500/30 dark:border-zinc-600/40 group-hover:bg-zinc-500/30'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              {/* Category label */}
              <span className="text-xs text-fg-muted font-medium mt-3 shrink-0 truncate max-w-full text-center group-hover:text-fg transition-colors">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
