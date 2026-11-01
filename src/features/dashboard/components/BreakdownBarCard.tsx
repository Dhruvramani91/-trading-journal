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
  className?: string;
}

export function BreakdownBarCard({
  title,
  items,
  variant = 'winRate',
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
      {/* Header with Title and Top Performer Pill */}
      <div className="flex items-center justify-between gap-2 mb-4">
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

      {/* Modern High-End Vertical Bar Columns Matrix */}
      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 items-end min-h-[170px] pt-2 pb-2">
        {items.map((item, idx) => {
          let heightPct = 0;
          let labelText = '';
          const hasTrades = (item.count ?? 0) > 0;
          const val = item.avgMetric ?? 0;

          if (variant === 'winRate') {
            const wr = Math.round(item.winRate ?? 0);
            heightPct = hasTrades ? Math.max(14, wr) : 10;
            labelText = `${wr}%`;
          } else if (variant === 'duration') {
            const dur = Math.max(0, val);
            heightPct = hasTrades ? Math.max(14, Math.min(100, (dur / maxVal) * 100)) : 10;
            labelText = item.displayMetric || `${dur}m`;
          } else {
            // Metric variant: scale by absolute value relative to maxVal
            const absVal = Math.abs(val);
            heightPct = hasTrades ? Math.max(14, Math.min(100, (absVal / maxVal) * 100)) : 10;
            labelText = item.displayMetric || (hasTrades ? val.toFixed(1) : '—');
          }

          const isTop = topItem && topItem.label === item.label && hasTrades;
          const isNegative = hasTrades && val < 0;

          return (
            <div key={idx} className="flex flex-col items-center justify-end h-full group">
              {/* Value Indicator Above Bar */}
              <div
                className={`text-[10px] sm:text-[11px] font-mono font-semibold mb-2 transition-all duration-200 truncate ${
                  isTop
                    ? 'text-sky-500 font-bold'
                    : isNegative
                      ? 'text-rose-500 font-semibold'
                      : hasTrades
                        ? 'text-fg-muted group-hover:text-fg'
                        : 'text-fg-dim/40'
                }`}
              >
                {hasTrades ? (item.displayMetric || labelText) : '—'}
              </div>

              {/* Column Track & Glowing Rounded Bar */}
              <div className="w-full flex justify-center items-end h-28">
                <div
                  className={`w-full max-w-[42px] rounded-t-2xl sm:rounded-t-[20px] transition-all duration-500 relative overflow-hidden flex flex-col justify-start items-center ${
                    isTop
                      ? 'bg-gradient-to-t from-sky-600 via-sky-500 to-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.45)] ring-1 ring-sky-300/40'
                      : isNegative
                        ? 'bg-gradient-to-t from-rose-800/80 via-rose-700/70 to-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30'
                        : hasTrades
                          ? 'bg-gradient-to-t from-zinc-700/60 via-zinc-600/70 to-zinc-400/80 dark:from-zinc-800/80 dark:via-zinc-700/80 dark:to-zinc-500/90 hover:from-zinc-600 hover:to-zinc-400'
                          : 'bg-zinc-800/20 dark:bg-zinc-800/30'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                  }}
                >
                  {/* Subtle Top Cap Glass Glaze */}
                  <span
                    className={`absolute inset-x-0 top-0 h-1.5 rounded-t-2xl sm:rounded-t-[20px] ${
                      isTop ? 'bg-white/70' : hasTrades ? 'bg-white/20' : 'bg-transparent'
                    }`}
                  />
                </div>
              </div>

              {/* Bottom Label and Trade Count */}
              <div className="flex flex-col items-center mt-3 text-center">
                <span
                  className={`text-xs font-semibold tracking-tight truncate max-w-full transition-colors ${
                    isTop ? 'text-sky-500 font-bold' : 'text-fg-muted group-hover:text-fg'
                  }`}
                >
                  {item.label}
                </span>
                {item.count != null && (
                  <span className="text-[10px] text-fg-dim font-mono mt-0.5">
                    {item.count} tr
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
