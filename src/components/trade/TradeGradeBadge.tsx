import { Badge } from '@/components/ui/Badge';
import type { TradeGrade } from '@/domain/models/trade';

const gradeTone: Record<TradeGrade, 'accent' | 'win' | 'be' | 'loss'> = {
  'A+': 'accent',
  A: 'win',
  B: 'be',
  C: 'loss',
};

export function TradeGradeBadge({ grade }: { grade?: TradeGrade | null }) {
  if (!grade) return <span className="text-xs text-fg-dim">—</span>;
  return <Badge tone={gradeTone[grade]} aria-label={`Trade grade ${grade}`}>{grade}</Badge>;
}
