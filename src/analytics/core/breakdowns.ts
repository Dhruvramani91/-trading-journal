import type { Trade } from '@/domain/models/trade';
import type { CategoryBreakdown, CategoryBucket } from './types';
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
  let rrSum = 0;
  let rrCount = 0;
  for (const t of group) {
    if (t.result === 'win') wins++;
    else if (t.result === 'loss') losses++;
    else bes++;
    totalR += t.r;
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
  };
}

/**
 * Group trades by a template field and return a CategoryBreakdown.
 * Buckets are sorted by totalR desc, with ties broken by count desc.
 */
export function byCategory(
  trades: readonly Trade[],
  fieldKey: string,
  templateId: string = ACTIVE_TEMPLATE_ID,
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
  buckets.sort((a, b) => {
    if (b.totalR !== a.totalR) return b.totalR - a.totalR;
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
