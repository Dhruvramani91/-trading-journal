import { cn } from '@/lib/cn';

/** One horizontal data row used inside breakdown cards and stat tables. */
export function MetricRow({
  label,
  value,
  tone = 'default',
  align = 'right',
  hint,
  bar,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'win' | 'loss' | 'be' | 'accent';
  align?: 'left' | 'right';
  hint?: string;
  bar?: { pct: number; tone?: 'win' | 'loss' | 'accent' | 'neutral' };
}) {
  const valueColor =
    tone === 'win'
      ? 'text-win'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'be'
          ? 'text-be'
          : tone === 'accent'
            ? 'text-accent'
            : 'text-fg';
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 text-sm">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-fg">{label}</span>
          {hint ? <span className="text-2xs text-fg-dim">{hint}</span> : null}
        </div>
        {bar ? <Bar pct={bar.pct} tone={bar.tone ?? 'neutral'} /> : null}
      </div>
      <div
        className={cn(
          'text-sm font-semibold num whitespace-nowrap',
          valueColor,
          align === 'left' && 'text-left',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Bar({ pct, tone }: { pct: number; tone: 'win' | 'loss' | 'accent' | 'neutral' }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    tone === 'win'
      ? 'bg-win'
      : tone === 'loss'
        ? 'bg-loss'
        : tone === 'accent'
          ? 'bg-accent'
          : 'bg-fg-dim';
  return (
    <div className="h-1 w-full rounded-full bg-bg-1 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${clamped}%` }}
        aria-hidden
      />
    </div>
  );
}
