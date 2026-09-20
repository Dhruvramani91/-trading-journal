import type { TemplateDefinition } from '@/domain/models/trade';
import { DEFAULT_TEMPLATE } from './default';

/**
 * Registry of all known templates. Adding a new strategy = new file + a new entry here.
 * The active template is selected in a future phase; for now, the default is the only one.
 */
export const TEMPLATES: Record<string, TemplateDefinition> = {
  [DEFAULT_TEMPLATE.id]: DEFAULT_TEMPLATE,
};

export const ACTIVE_TEMPLATE_ID = DEFAULT_TEMPLATE.id;

export function getTemplate(id: string = ACTIVE_TEMPLATE_ID): TemplateDefinition {
  const tpl = TEMPLATES[id];
  if (!tpl) throw new Error(`Unknown template id: ${id}`);
  return tpl;
}

export function listTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATES);
}
