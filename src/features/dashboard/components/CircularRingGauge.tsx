interface CircularRingGaugeProps {
  value: number; // e.g. 7.18
  benchmark?: number; // target benchmark, default 3.0
  className?: string;
}

export function CircularRingGauge({
  value,
  benchmark = 3.0,
  className = '',
}: CircularRingGaugeProps) {
  // Normalize ratio to 0-100% based on benchmark
  const pct = Math.min(100, Math.max(0, (value / benchmark) * 100));
  const radius = 22;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className={`relative w-14 h-14 flex items-center justify-center ${className}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#262b34"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={value >= 1 ? '#22c55e' : '#ef4444'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
}

