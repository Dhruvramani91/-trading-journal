import type { Trade, TradeGrade } from '@/domain/models/trade';

export interface GradePerformance {
  grade: TradeGrade;
  count: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number | null;
  averageR: number;
  totalR: number;
}

const GRADE_ORDER: readonly TradeGrade[] = ['A+', 'A', 'B', 'C'];

/** Compare results by the trader-assigned execution grade. */
export function gradePerformance(trades: readonly Trade[]): GradePerformance[] {
  const groups = new Map<TradeGrade, Trade[]>();
  for (const grade of GRADE_ORDER) groups.set(grade, []);

  for (const trade of trades) {
    if (trade.grade) groups.get(trade.grade)!.push(trade);
  }

  return [...groups.entries()].map(([grade, group]) => {
    const wins = group.filter((trade) => trade.result === 'win').length;
    const losses = group.filter((trade) => trade.result === 'loss').length;
    const breakEvens = group.filter((trade) => trade.result === 'be').length;
    const totalR = group.reduce((sum, trade) => sum + trade.r, 0);
    return {
      grade,
      count: group.length,
      wins,
      losses,
      breakEvens,
      winRate: group.length > 0 ? wins / group.length : null,
      averageR: group.length > 0 ? totalR / group.length : 0,
      totalR,
    };
  });
}
