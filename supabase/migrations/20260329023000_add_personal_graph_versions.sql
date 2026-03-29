create table if not exists public.personal_graph_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  map_key text not null,
  edit_type text not null,
  summary text not null,
  snapshot jsonb not null,
  restored_from_version_id uuid null references public.personal_graph_versions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint personal_graph_versions_edit_type_check check (
    edit_type in (
      'insert_node',
      'delete_node',
      'create_bridge',
      'remove_bridge',
      'restore_version'
    )
  )
);

create index if not exists personal_graph_versions_user_map_created_at_idx
  on public.personal_graph_versions (user_id, map_key, created_at desc);

alter table public.personal_graph_versions enable row level security;

drop policy if exists "Users can view their own personal graph versions" on public.personal_graph_versions;
create policy "Users can view their own personal graph versions"
on public.personal_graph_versions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own personal graph versions" on public.personal_graph_versions;
create policy "Users can insert their own personal graph versions"
on public.personal_graph_versions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own personal graph versions" on public.personal_graph_versions;
create policy "Users can update their own personal graph versions"
on public.personal_graph_versions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own personal graph versions" on public.personal_graph_versions;
create policy "Users can delete their own personal graph versions"
on public.personal_graph_versions
for delete
to authenticated
using (auth.uid() = user_id);
