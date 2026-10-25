import type { TemplateField } from '@/domain/models/trade';

export type TemplateFieldGroup = [string, TemplateField[]];

/** Keep field ordering consistent with the strategy sections rendered in the trade form. */
export function groupTemplateFields(fields: readonly TemplateField[]): TemplateFieldGroup[] {
  const groups = new Map<string, TemplateField[]>();

  for (const field of fields) {
    if (field.key === 'mistake') continue;
    const group = groups.get(field.group) ?? [];
    group.push(field);
    groups.set(field.group, group);
  }

  return Array.from(groups.entries());
}

/** Form order is group order first, then each group's fields, with mistakes last. */
export function orderTemplateFieldsForForm(fields: readonly TemplateField[]): TemplateField[] {
  return [
    ...groupTemplateFields(fields).flatMap(([, groupedFields]) => groupedFields),
    ...fields.filter((field) => field.key === 'mistake'),
  ];
}
