import { describe, expect, it } from 'vitest';
import type { TemplateField } from '@/domain/models/trade';
import { createTemplateField, duplicateTemplateField, moveField, optionListFromPaste, renameTemplateField, validateTemplate } from './templateEditor';

const field = (overrides: Partial<TemplateField> = {}): TemplateField => ({ key: 'session', label: 'Session', group: 'Context', type: 'enum', options: ['London', 'New York'], inTable: false, inStats: false, ...overrides });

describe('template editor field operations', () => {
  it('reorders fields in response to a pointer drop target', () => {
    expect(moveField(['A', 'B', 'C'], 0, 2)).toEqual(['B', 'C', 'A']);
  });

  it('adds single and pasted choice values without empty or duplicate chips', () => {
    expect(optionListFromPaste(['London'], 'New York, London, , Asia')).toEqual(['London', 'New York', 'Asia']);
    expect(optionListFromPaste(['London'], 'New York')).toEqual(['London', 'New York']);
  });

  it('duplicates with a new stable key and copied options', () => {
    const original = field();
    const duplicate = duplicateTemplateField(original, [original]);
    expect(duplicate.key).not.toBe(original.key);
    expect(duplicate.label).toBe('Copy of Session');
    expect(duplicate.options).toEqual(original.options);
    expect(duplicate.options).not.toBe(original.options);
    expect(duplicate.inTable).toBe(true);
    expect(duplicate.inStats).toBe(true);
  });

  it('keeps the field ID when the user renames a label', () => {
    const original = field();
    expect(renameTemplateField(original, 'Market session').key).toBe('session');
  });

  it('validates template name, duplicate labels, IDs, and enum option count', () => {
    const issues = validateTemplate(' ', [field({ label: 'Bias', options: ['Long'] }), field({ key: 'bias', label: ' bias ' })]);
    expect(issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
      'Template name is required.', 'Choice fields need at least 2 options.', '“bias” duplicates Bias.',
    ]));
  });

  it('creates fields visible in table and statistics', () => {
    const created = createTemplateField('text', [], 'Plan note');
    expect(created.inTable).toBe(true);
    expect(created.inStats).toBe(true);
  });
});
