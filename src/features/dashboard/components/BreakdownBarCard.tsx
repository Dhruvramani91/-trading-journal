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
    1
  );

  return (
    <div className={`bg-[#121417] border border-[#1f242c] rounded-2xl p-5 flex flex-col justify-between ${className}`}>
      <h3 className="text-xs font-medium text-[#8c94a0] mb-4 tracking-tight">{title}</h3>

      {/* Vertical Bar Comparison Area */}
      <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-3 items-end h-28 pt-2">
        {items.map((item, idx) => {
          let heightPct = 0;
          let labelText = '';

          if (variant === 'winRate') {
            const wr = Math.round(item.winRate ?? 0);
            heightPct = Math.max(12, wr);
            labelText = `${wr}%`;
          } else if (variant === 'duration') {
            const dur = item.avgMetric ?? 0;
            heightPct = Math.max(12, (dur / maxVal) * 100);
            labelText = item.displayMetric || `${dur}m`;
          } else {
            const val = item.avgMetric ?? 0;
            heightPct = Math.max(12, (val / maxVal) * 100);
            labelText = item.displayMetric || val.toFixed(2);
          }

          const isPositive = (item.winRate ?? 0) >= 50;

          return (
            <div key={idx} className="flex flex-col items-center justify-end h-full group">
              {/* Value on top of bar */}
              <span className="text-[11px] font-mono font-medium text-white mb-1.5 transition-transform group-hover:-translate-y-0.5">
                {labelText}
              </span>

              {/* Bar Fill */}
              <div className="w-full max-w-[64px] bg-[#181b20] rounded-lg p-1 h-full flex flex-col justify-end">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    variant === 'winRate'
                      ? isPositive
                        ? 'bg-emerald-500/20 border border-emerald-500/40 group-hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 border border-rose-500/40 group-hover:bg-rose-500/30'
                      : 'bg-zinc-700/40 border border-zinc-600/40 group-hover:bg-zinc-600/50'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              {/* Category label */}
              <span className="text-[11px] text-[#8c94a0] font-medium mt-2 truncate max-w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

