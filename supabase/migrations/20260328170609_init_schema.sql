create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  syllabus_path text not null,
  syllabus_filename text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'error')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists classes_user_id_created_at_idx
  on public.classes (user_id, created_at desc);

drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at
before update on public.classes
for each row
execute function public.set_updated_at();

alter table public.classes enable row level security;

drop policy if exists "Users can view their own classes" on public.classes;
create policy "Users can view their own classes"
on public.classes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own classes" on public.classes;
create policy "Users can insert their own classes"
on public.classes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own classes" on public.classes;
create policy "Users can update their own classes"
on public.classes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own classes" on public.classes;
create policy "Users can delete their own classes"
on public.classes
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('syllabi', 'syllabi', false, 10485760, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own syllabi" on storage.objects;
create policy "Users can read their own syllabi"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their own syllabi" on storage.objects;
create policy "Users can upload their own syllabi"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own syllabi" on storage.objects;
create policy "Users can update their own syllabi"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own syllabi" on storage.objects;
create policy "Users can delete their own syllabi"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);
