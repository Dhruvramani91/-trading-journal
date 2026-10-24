import type { TemplateDefinition } from '@/domain/models/trade';
import { DEFAULT_TEMPLATE } from './default';
import { AM_TRADES_TEMPLATE } from './amTrades';
import { IFVG_TEMPLATE } from './ifvg';
import { ICT_2022_TEMPLATE } from './ict2022';

/**
 * Registry of all known templates. Adding a new strategy = new file + a new entry here.
 * The user's selected template controls future trades; historical trades keep their snapshots.
 */
export const TEMPLATES: Record<string, TemplateDefinition> = {
  [DEFAULT_TEMPLATE.id]: DEFAULT_TEMPLATE,
  [AM_TRADES_TEMPLATE.id]: AM_TRADES_TEMPLATE,
  [IFVG_TEMPLATE.id]: IFVG_TEMPLATE,
  [ICT_2022_TEMPLATE.id]: ICT_2022_TEMPLATE,
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
