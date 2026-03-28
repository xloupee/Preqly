create table if not exists public.courses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  slug              text not null,
  title             text not null check (char_length(trim(title)) > 0),
  summary           text not null default '',
  source            text not null default 'uploaded'
                      check (source in ('seed', 'uploaded')),
  syllabus_filename text,
  nodes             jsonb not null default '[]'::jsonb,
  edges             jsonb not null default '[]'::jsonb,
  lessons           jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),

  unique (user_id, slug)
);

create index if not exists courses_user_id_created_at_idx
  on public.courses (user_id, created_at desc);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

alter table public.courses enable row level security;

drop policy if exists "Users can view their own courses" on public.courses;
create policy "Users can view their own courses"
on public.courses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own courses" on public.courses;
create policy "Users can insert their own courses"
on public.courses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own courses" on public.courses;
create policy "Users can update their own courses"
on public.courses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own courses" on public.courses;
create policy "Users can delete their own courses"
on public.courses
for delete
to authenticated
using (auth.uid() = user_id);
