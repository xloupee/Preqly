create table if not exists public.node_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  map_key text not null,
  node_id text not null,
  done_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, map_key, node_id)
);

create index if not exists node_progress_user_id_map_key_idx
  on public.node_progress (user_id, map_key, updated_at desc);

drop trigger if exists node_progress_set_updated_at on public.node_progress;
create trigger node_progress_set_updated_at
before update on public.node_progress
for each row
execute function public.set_updated_at();

alter table public.node_progress enable row level security;

drop policy if exists "Users can view their own node progress" on public.node_progress;
create policy "Users can view their own node progress"
on public.node_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own node progress" on public.node_progress;
create policy "Users can insert their own node progress"
on public.node_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own node progress" on public.node_progress;
create policy "Users can update their own node progress"
on public.node_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own node progress" on public.node_progress;
create policy "Users can delete their own node progress"
on public.node_progress
for delete
to authenticated
using (auth.uid() = user_id);
