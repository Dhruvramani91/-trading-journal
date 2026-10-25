-- Account-owned FigCraft source documents. Files stay private and are scoped to
-- the authenticated user's UUID in both metadata and Storage.
create table if not exists public.figcraft_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  storage_path text not null unique,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint figcraft_documents_owner_path check (
    storage_path = user_id::text || '/' || id::text || '.figcraft'
  )
);

create index if not exists figcraft_documents_user_updated_idx
  on public.figcraft_documents (user_id, updated_at desc);

alter table public.figcraft_documents enable row level security;

create policy "Users manage their own FigCraft documents"
  on public.figcraft_documents for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('figcraft-documents', 'figcraft-documents', false, 104857600)
on conflict (id) do nothing;

create policy "Users can view their FigCraft documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'figcraft-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload their FigCraft documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'figcraft-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update their FigCraft documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'figcraft-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'figcraft-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their FigCraft documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'figcraft-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
