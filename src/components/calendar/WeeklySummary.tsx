import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatR } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface CalendarWeekSummary {
  count: number;
  wins: number;
  losses: number;
  bes: number;
  totalR: number;
}

export function WeeklySummary({ weeks }: { weeks: CalendarWeekSummary[] }) {
  return <Card className="flex h-full min-h-0 flex-col overflow-hidden">
    <CardHeader className="min-h-[38px] shrink-0 px-3 py-2"><CardTitle className="text-sm">Week</CardTitle></CardHeader>
    <CardBody className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2 sm:grid-cols-3 xl:grid-cols-1 xl:[grid-template-rows:repeat(var(--week-count),minmax(0,1fr))]" style={{ '--week-count': weeks.length } as React.CSSProperties}>
      {weeks.map((week, index) => {
        const winRate = week.count ? Math.round(week.wins / week.count * 100) : null;
        const tone = week.totalR > 0 ? 'text-win' : week.totalR < 0 ? 'text-loss' : 'text-fg';
        return <div key={index} className="flex min-h-0 min-w-0 flex-col justify-center rounded-lg border border-line bg-bg-0 px-2.5 py-2 text-xs">
          <p className="text-fg-muted">Week {index + 1}</p>
          <p className={cn('mt-0.5 font-semibold tabular-nums', tone)}>{formatR(week.totalR)}</p>
          <p className="mt-1 text-[10px] leading-snug text-fg-dim">Win rate {winRate == null ? '—' : `${winRate}%`} · {week.count} trade{week.count === 1 ? '' : 's'}</p>
        </div>;
      })}
    </CardBody>
  </Card>;
}
