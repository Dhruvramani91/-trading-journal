import type { Trade } from '@/domain/models/trade';

/** Stable, sortable comparator: open time asc, with id as tiebreaker. */
export function byChronologicalOrder(a: Trade, b: Trade): number {
  const ta = new Date(a.openedAt).getTime();
  const tb = new Date(b.openedAt).getTime();
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

/**
 * Local-date bucket for a trade's open time, formatted as 'YYYY-MM-DD'.
 * Uses the browser's local timezone; this matches the calendar view
 * users see in their own timezone.
 */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
