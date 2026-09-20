/** Public analytics surface — every consumer should import from here. */
export { summary } from './summary';
export { equityCurve } from './equity';
export { byCategory, allBreakdowns } from './breakdowns';
export { byDay } from './calendar';
export { dayKey, byChronologicalOrder } from './date';
export type { TradeSummary, CategoryBreakdown, CategoryBucket, EquityPoint, DayPerformance } from './types';
