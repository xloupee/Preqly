create table if not exists public.course_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  syllabus_path text not null,
  syllabus_filename text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'error')),
  error_message text,
  course_slug text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists course_jobs_user_id_created_at_idx
  on public.course_jobs (user_id, created_at desc);

drop trigger if exists course_jobs_set_updated_at on public.course_jobs;
create trigger course_jobs_set_updated_at
before update on public.course_jobs
for each row
execute function public.set_updated_at();

alter table public.course_jobs enable row level security;

drop policy if exists "Users can view their own course jobs" on public.course_jobs;
create policy "Users can view their own course jobs"
on public.course_jobs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own course jobs" on public.course_jobs;
create policy "Users can insert their own course jobs"
on public.course_jobs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own course jobs" on public.course_jobs;
create policy "Users can update their own course jobs"
on public.course_jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own course jobs" on public.course_jobs;
create policy "Users can delete their own course jobs"
on public.course_jobs
for delete
to authenticated
using (auth.uid() = user_id);
