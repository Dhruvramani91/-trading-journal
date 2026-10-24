alter table public.journal_templates
  add column if not exists photo_count integer not null default 3
  check (photo_count between 0 and 10);
