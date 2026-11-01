interface SplitBarGaugeProps {
  leftValue: number; // e.g. avg win
  rightValue: number; // e.g. avg loss (positive number)
  leftLabel: string;
  rightLabel: string;
  className?: string;
}

export function SplitBarGauge({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  className = '',
}: SplitBarGaugeProps) {
  const total = Math.max(0.001, leftValue + Math.abs(rightValue));
  const leftPct = Math.min(95, Math.max(5, (leftValue / total) * 100));
  const rightPct = 100 - leftPct;

  return (
    <div className={`w-full flex flex-col justify-center gap-1.5 ${className}`}>
      {/* Dual Progress Bar */}
      <div className="w-full h-2 rounded-full bg-bg-3 dark:bg-[#181b20] overflow-hidden flex items-center">
        <div
          className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
          style={{ width: `${leftPct}%` }}
        />
        <div
          className="h-full bg-rose-500 rounded-r-full transition-all duration-500"
          style={{ width: `${rightPct}%` }}
        />
      </div>

      {/* Metric Labels */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{leftLabel}</span>
        <span className="text-rose-600 dark:text-rose-400 font-medium">{rightLabel}</span>
      </div>
    </div>
  );
}
