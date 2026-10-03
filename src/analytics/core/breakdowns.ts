import type { Trade } from '@/domain/models/trade';
import type { CategoryBreakdown, CategoryBucket } from './types';
import type { DashboardMetric } from './metrics';
import { getTemplate } from '@/domain/templates/registry';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';

/**
 * Format a single field value as a stable string key.
 * Booleans → "YES" / "NO", nulls / undefined → "—", others → String(v).
 */
function bucketKey(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'YES' : 'NO';
  return String(value);
}

/** Display label for a bucket. Mirrors `bucketKey` for now; reserved for future i18n. */
function bucketLabel(key: string): string {
  return key;
}

function buildBucket(group: Trade[]): CategoryBucket {
  const count = group.length;
  let wins = 0;
  let losses = 0;
  let bes = 0;
  let totalR = 0;
  let totalPnl = 0;
  let rrSum = 0;
  let rrCount = 0;
  for (const t of group) {
    if (t.result === 'win') wins++;
    else if (t.result === 'loss') losses++;
    else bes++;
    totalR += t.r;

    // Missing / invalid P&L is skipped entirely — never counted as $0.
    if (typeof t.pnl === 'number' && Number.isFinite(t.pnl)) {
      totalPnl += t.pnl;
    }

    if (t.plannedRR != null && Number.isFinite(t.plannedRR)) {
      rrSum += t.plannedRR;
      rrCount++;
    }
  }
  return {
    key: '',
    label: '',
    count,
    wins,
    losses,
    bes,
    winRate: count > 0 ? wins / count : null,
    avgR: count > 0 ? totalR / count : 0,
    avgRR: rrCount > 0 ? rrSum / rrCount : null,
    totalR,
    totalPnl,
  };
}

/**
 * Group trades by a template field and return a CategoryBreakdown.
 *
 * Buckets are sorted by the selected metric desc (R by default — unchanged for
 * existing Statistics / Mistakes callers), ties broken by count desc. Pass
 * `metric: 'pnl'` (the Dashboard's P&L mode) to rank by Journal Trade P&L.
 */
export function byCategory(
  trades: readonly Trade[],
  fieldKey: string,
  templateId: string = ACTIVE_TEMPLATE_ID,
  metric: DashboardMetric = 'r',
): CategoryBreakdown {
  const tpl = getTemplate(templateId);
  const field = tpl.fields.find((f) => f.key === fieldKey);
  const fieldLabel = field?.label ?? fieldKey;

  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const v = t.templateData[fieldKey];
    const k = bucketKey(v);
    let arr = groups.get(k);
    if (!arr) {
      arr = [];
      groups.set(k, arr);
    }
    arr.push(t);
  }

  const buckets: CategoryBucket[] = [];
  for (const [k, group] of groups) {
    const b = buildBucket(group);
    b.key = k;
    b.label = bucketLabel(k);
    buckets.push(b);
  }
  // Metric-aware ordering: R (default) keeps existing behaviour byte-for-byte;
  // P&L ranks by Journal Trade P&L (never account attachment values).
  const sortValue = (b: CategoryBucket): number =>
    metric === 'pnl' ? b.totalPnl : b.totalR;

  buckets.sort((a, b) => {
    const diff = sortValue(b) - sortValue(a);
    if (diff !== 0) return diff;
    return b.count - a.count;
  });

  return { fieldKey, fieldLabel, buckets };
}

/**
 * Run `byCategory` for every field that the template marks as `inStats: true`.
 * Returns a list of breakdowns in the order the template declares the fields.
 */
export function allBreakdowns(
  trades: readonly Trade[],
  templateId: string = ACTIVE_TEMPLATE_ID,
): CategoryBreakdown[] {
  const tpl = getTemplate(templateId);
  return tpl.fields.filter((f) => f.inStats).map((f) => byCategory(trades, f.key, templateId));
}
