create table if not exists public.personal_graphs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  map_key    text not null,
  nodes      jsonb not null default '[]'::jsonb,
  edges      jsonb not null default '[]'::jsonb,
  lessons    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, map_key)
);

create index if not exists personal_graphs_user_id_updated_at_idx
  on public.personal_graphs (user_id, updated_at desc);

drop trigger if exists personal_graphs_set_updated_at on public.personal_graphs;
create trigger personal_graphs_set_updated_at
before update on public.personal_graphs
for each row
execute function public.set_updated_at();

alter table public.personal_graphs enable row level security;

drop policy if exists "Users can view their own personal graphs" on public.personal_graphs;
create policy "Users can view their own personal graphs"
on public.personal_graphs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own personal graphs" on public.personal_graphs;
create policy "Users can insert their own personal graphs"
on public.personal_graphs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own personal graphs" on public.personal_graphs;
create policy "Users can update their own personal graphs"
on public.personal_graphs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own personal graphs" on public.personal_graphs;
create policy "Users can delete their own personal graphs"
on public.personal_graphs
for delete
to authenticated
using (auth.uid() = user_id);
