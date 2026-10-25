import type { TemplateField } from '@/domain/models/trade';

export type TemplateFieldGroup = [string, TemplateField[]];

/** Keep field ordering consistent with the strategy sections rendered in the trade form. */
export function groupTemplateFields(fields: readonly TemplateField[]): TemplateFieldGroup[] {
  const groups: TemplateFieldGroup[] = [];

  for (const field of fields) {
    if (field.key === 'mistake') continue;
    const lastGroup = groups.at(-1);
    if (lastGroup?.[0] === field.group) lastGroup[1].push(field);
    else groups.push([field.group, [field]]);
  }

  return groups;
}

/** Form order is group order first, then each group's fields, with mistakes last. */
export function orderTemplateFieldsForForm(fields: readonly TemplateField[]): TemplateField[] {
  return [
    ...groupTemplateFields(fields).flatMap(([, groupedFields]) => groupedFields),
    ...fields.filter((field) => field.key === 'mistake'),
  ];
}
