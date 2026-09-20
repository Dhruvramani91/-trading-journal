import { cn } from '@/lib/cn';

/** Tiny SVG ring that shows a percentage 0..1 with semantic color. */
export function WinRateRing({
  rate,
  size = 56,
  className,
}: {
  rate: number | null;
  size?: number;
  className?: string;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = rate == null ? 0 : Math.max(0, Math.min(1, rate));
  const offset = c * (1 - pct);
  const label = rate == null ? '—' : `${(pct * 100).toFixed(0)}%`;
  const color =
    rate == null
      ? 'text-fg-dim'
      : pct >= 0.5
        ? 'text-win'
        : pct >= 0.3
          ? 'text-accent'
          : 'text-loss';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-bg-3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={color}
        />
      </svg>
      <span className={cn('absolute text-xs font-semibold num', color)}>{label}</span>
    </div>
  );
}
