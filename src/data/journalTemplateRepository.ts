import type { TemplateDefinition } from '@/domain/models/trade';
import { listTemplates } from '@/domain/templates/registry';
import { supabase } from '@/lib/supabase';

const LOCAL_TEMPLATES = 'journal.custom-templates.v1';
const LOCAL_DEFAULT = 'journal.default-template.v1';

function localTemplates(): TemplateDefinition[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_TEMPLATES) ?? '[]') as TemplateDefinition[]; }
  catch { return []; }
}

export async function listJournalTemplates(): Promise<TemplateDefinition[]> {
  const builtIns = listTemplates();
  if (!supabase) return [...builtIns, ...localTemplates()];
  const { data, error } = await supabase.from('journal_templates').select('id,name,description,fields,photo_count').is('archived_at', null).order('created_at');
  if (error) throw new Error(`Could not load templates: ${error.message}`);
  const custom = (data ?? []).map((row) => ({ ...row, id: `custom:${row.id}`, photoCount: row.photo_count ?? 3, fields: row.fields as TemplateDefinition['fields'] })) as TemplateDefinition[];
  return [...builtIns, ...custom];
}

export async function getDefaultTemplateId(): Promise<string> {
  if (!supabase) return localStorage.getItem(LOCAL_DEFAULT) ?? listTemplates()[0]?.id ?? 'default-ict-2026';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to load your default template.');
  const { data, error } = await supabase.from('journal_template_preferences').select('default_template_id').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(`Could not load template preference: ${error.message}`);
  return data?.default_template_id ?? listTemplates()[0]?.id ?? 'default-ict-2026';
}

export async function saveDefaultTemplateId(templateId: string): Promise<void> {
  if (!supabase) { localStorage.setItem(LOCAL_DEFAULT, templateId); return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to save your default template.');
  const { error } = await supabase.from('journal_template_preferences').upsert({ user_id: user.id, default_template_id: templateId }, { onConflict: 'user_id' });
  if (error) throw new Error(`Could not save template preference: ${error.message}`);
}

export async function saveCustomTemplate(template: TemplateDefinition): Promise<TemplateDefinition> {
  if (!supabase) {
    const templates = localTemplates().filter((item) => item.id !== template.id);
    const saved = { ...template, id: template.id || `custom:${crypto.randomUUID()}` };
    localStorage.setItem(LOCAL_TEMPLATES, JSON.stringify([...templates, saved]));
    return saved;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to save a custom template.');
  const id = template.id.startsWith('custom:') ? template.id.slice(7) : crypto.randomUUID();
  const { data, error } = await supabase.from('journal_templates').upsert({ id, user_id: user.id, name: template.name, description: template.description ?? '', fields: template.fields, photo_count: template.photoCount ?? 3 }, { onConflict: 'id' }).select('id,name,description,fields,photo_count').single();
  if (error) throw new Error(`Could not save template: ${error.message}`);
  return { ...data, id: `custom:${data.id}`, photoCount: data.photo_count ?? 3, fields: data.fields as TemplateDefinition['fields'] } as TemplateDefinition;
}

export async function archiveCustomTemplate(templateId: string): Promise<void> {
  const id = templateId.replace(/^custom:/, '');
  if (!supabase) { localStorage.setItem(LOCAL_TEMPLATES, JSON.stringify(localTemplates().filter((item) => item.id !== templateId))); return; }
  const { error } = await supabase.from('journal_templates').update({ archived_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Could not archive template: ${error.message}`);
}
