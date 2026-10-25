import { Badge } from '@/components/ui/Badge';
import type { TradeGrade } from '@/domain/models/trade';

const gradeColor: Record<TradeGrade, string> = {
  'A+': '--grade-a-plus',
  A: '--grade-a',
  B: '--grade-b',
  C: '--grade-c',
};

export function TradeGradeBadge({ grade }: { grade?: TradeGrade | null }) {
  if (!grade) return <span className="text-xs text-fg-dim">—</span>;
  const color = gradeColor[grade];
  return (
    <Badge
      tone="neutral"
      className="border font-semibold"
      style={{
        backgroundColor: `rgb(var(${color}) / 0.12)`,
        borderColor: `rgb(var(${color}) / 0.3)`,
        color: `rgb(var(${color}))`,
      }}
      aria-label={`Trade grade ${grade}`}
    >
      {grade}
    </Badge>
  );
}
