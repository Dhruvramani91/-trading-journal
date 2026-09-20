import type { Trade, TemplateField } from '@/domain/models/trade';
import { getTemplate } from './registry';

/**
 * Read a value from a trade by its template key, with a sensible default.
 * Centralizing this means analytics code can stay generic and a future template
 * can rename or restructure fields without touching every call site.
 */
export function readField(
  trade: Trade,
  fieldKey: string,
  fallback: string | number | boolean | null = null,
): string | number | boolean | null {
  const v = trade.templateData[fieldKey];
  return v === undefined || v === null ? fallback : v;
}

/** Read a field and format it for display in tables / chips. */
export function readFieldLabel(trade: Trade, fieldKey: string, fallback = '—'): string {
  const v = readField(trade, fieldKey, null);
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'boolean') return v ? 'YES' : 'NO';
  return String(v);
}

/** Iterate over fields of a given group (e.g. "Setup", "Context"). */
export function fieldsInGroup(
  templateId: string,
  group: string,
): TemplateField[] {
  return getTemplate(templateId).fields.filter((f) => f.group === group);
}

/** Convenience — all fields for the active template. */
export function activeTemplateFields(): TemplateField[] {
  return [...getTemplate().fields];
}
