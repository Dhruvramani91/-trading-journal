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
  // Find maximum value to proportionally scale heights
  const maxVal = Math.max(
    ...items.map((it) => {
      if (variant === 'winRate') return it.winRate ?? 0;
      return it.avgMetric ?? 0;
    }),
    1,
  );

  // Best item summary pill
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
      {/* Header with Title and Best Performer Pill */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-semibold text-fg tracking-tight">{title}</h3>
        {topItem && (
          <span className="text-[10px] font-semibold text-fg-dim px-2 py-0.5 rounded-full bg-bg-2 dark:bg-[#181b20] border border-line/60">
            {topItem.label}:{' '}
            <span className="text-fg font-mono">
              {variant === 'winRate'
                ? `${Math.round(topItem.winRate ?? 0)}%`
                : topItem.displayMetric || `${topItem.avgMetric?.toFixed(1)}`}
            </span>
          </span>
        )}
      </div>

      {/* Modern Segmented Column Matrix */}
      <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-3 items-end min-h-[156px] pt-3 pb-1 border-b border-line/40">
        {items.map((item, idx) => {
          let heightPct = 0;
          let labelText = '';

          if (variant === 'winRate') {
            const wr = Math.round(item.winRate ?? 0);
            heightPct = item.count ? Math.max(12, wr) : 4;
            labelText = `${wr}%`;
          } else if (variant === 'duration') {
            const dur = item.avgMetric ?? 0;
            heightPct = item.count ? Math.max(12, (dur / maxVal) * 100) : 4;
            labelText = item.displayMetric || `${dur}m`;
          } else {
            const val = item.avgMetric ?? 0;
            heightPct = item.count ? Math.max(12, (val / maxVal) * 100) : 4;
            labelText = item.displayMetric || (item.count ? val.toFixed(2) : '—');
          }

          const hasTrades = (item.count ?? 0) > 0;
          const isPositive = (item.winRate ?? 0) >= 50;

          return (
            <div key={idx} className="flex flex-col items-center justify-end h-full group">
              {/* Value Pill Tag on top */}
              <div
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md mb-2 transition-all duration-200 ${
                  hasTrades
                    ? variant === 'winRate'
                      ? isPositive
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                      : 'text-sky-600 dark:text-sky-400 bg-sky-500/10'
                    : 'text-fg-dim/60 bg-transparent'
                }`}
              >
                {labelText}
              </div>

              {/* Column Track & Gradient Fill */}
              <div className="w-full max-w-[48px] h-24 bg-bg-2/70 dark:bg-[#181b20]/80 rounded-t-xl p-1 flex flex-col justify-end relative overflow-hidden border-x border-t border-line/40 group-hover:border-line-strong transition-colors">
                {/* Active Metric Fill */}
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 relative ${
                    variant === 'winRate'
                      ? isPositive
                        ? 'bg-gradient-to-t from-emerald-500/70 to-teal-400/90 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-gradient-to-t from-rose-500/70 to-red-400/90 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                      : 'bg-gradient-to-t from-sky-500/70 to-indigo-400/90 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    opacity: hasTrades ? 1 : 0.25,
                  }}
                >
                  {/* Subtle top cap reflection highlight */}
                  <span className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-t-lg" />
                </div>
              </div>

              {/* Bottom Label and Trade Count */}
              <div className="flex flex-col items-center mt-2.5 text-center">
                <span className="text-xs font-semibold text-fg tracking-tight truncate max-w-full group-hover:text-sky-500 transition-colors">
                  {item.label}
                </span>
                {item.count != null && (
                  <span className="text-[10px] text-fg-dim font-mono mt-0.5">
                    {item.count} {item.count === 1 ? 'trade' : 'trades'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
