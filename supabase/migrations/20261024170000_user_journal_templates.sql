create table if not exists public.journal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_template_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_template_id text not null default 'default-ict-2026',
  updated_at timestamptz not null default now()
);

alter table public.journal_templates enable row level security;
alter table public.journal_template_preferences enable row level security;

create policy "Users manage their own journal templates"
  on public.journal_templates for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their template preference"
  on public.journal_template_preferences for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.trades add column if not exists template_snapshot jsonb;
