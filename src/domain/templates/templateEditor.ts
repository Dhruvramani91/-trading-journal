import type { TemplateField, TemplateFieldType } from '@/domain/models/trade';

export type TemplateIssue = { fieldKey?: string; message: string };

export function moveField<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return [...items];
  next.splice(to, 0, item);
  return next;
}

export function optionListFromPaste(current: readonly string[], pasted: string): string[] {
  const additions = pasted.split(',').map((option) => option.trim()).filter(Boolean);
  const seen = new Set(current.map((option) => option.trim().toLocaleLowerCase()));
  return [...current, ...additions.filter((option) => {
    const normalized = option.toLocaleLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  })];
}

export function newFieldKey(existing: readonly TemplateField[], label: string): string {
  const slug = label.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
  const used = new Set(existing.map((field) => field.key));
  let key = `custom_${slug}`;
  let suffix = 2;
  while (used.has(key)) key = `custom_${slug}_${suffix++}`;
  return key;
}

export function createTemplateField(type: TemplateFieldType, existing: readonly TemplateField[], label = 'New field'): TemplateField {
  const field: TemplateField = { key: newFieldKey(existing, label), label, group: 'Strategy details', type, inTable: true, inStats: true };
  if (type === 'enum') field.options = [];
  return field;
}

export function duplicateTemplateField(field: TemplateField, existing: readonly TemplateField[]): TemplateField {
  const label = `Copy of ${field.label}`;
  return { ...field, key: newFieldKey(existing, label), label, options: field.options ? [...field.options] : undefined, inTable: true, inStats: true };
}

/** Labels are presentation; a field key is stored on trades and must remain stable. */
export function renameTemplateField(field: TemplateField, label: string): TemplateField {
  return { ...field, label };
}

export function validateTemplate(name: string, fields: readonly TemplateField[]): TemplateIssue[] {
  const issues: TemplateIssue[] = [];
  if (!name.trim()) issues.push({ message: 'Template name is required.' });
  const labels = new Map<string, string>();
  const ids = new Set<string>();
  fields.forEach((field) => {
    const label = field.label.trim();
    if (!label) issues.push({ fieldKey: field.key, message: 'Field label is required.' });
    else {
      const normalized = label.toLocaleLowerCase();
      const previous = labels.get(normalized);
      if (previous) issues.push({ fieldKey: field.key, message: `“${label}” duplicates ${previous}.` });
      else labels.set(normalized, label);
    }
    if (!field.key.trim() || ids.has(field.key)) issues.push({ fieldKey: field.key, message: 'Field ID must be present and unique.' });
    ids.add(field.key);
    if (field.type === 'enum' && (field.options ?? []).map((option) => option.trim()).filter(Boolean).length < 2) {
      issues.push({ fieldKey: field.key, message: 'Choice fields need at least 2 options.' });
    }
  });
  return issues;
}

// TODO: Add per-field required only alongside a model change, migration, trade-save validation, and coverage.
