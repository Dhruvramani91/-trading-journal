/** Format a signed R value as a string like "+2.50R" / "-1.00R" / "0.00R". */
export function formatR(r: number, digits = 2): string {
  const sign = r > 0 ? '+' : r < 0 ? '' : '';
  return `${sign}${r.toFixed(digits)}R`;
}

/** Format a percent (0..1) like "66.67%". */
export function formatPct(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Compact currency-style — used later for $ P&L display. */
export function formatMoney(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Short duration like "2h 30m" / "45m" / "12s". */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Format an ISO date as a human-friendly short date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format an ISO date as "Feb 2, 2026". */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
