create table if not exists public.map_layouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  map_key text not null,
  positions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, map_key)
);

create index if not exists map_layouts_user_id_updated_at_idx
  on public.map_layouts (user_id, updated_at desc);

drop trigger if exists map_layouts_set_updated_at on public.map_layouts;
create trigger map_layouts_set_updated_at
before update on public.map_layouts
for each row
execute function public.set_updated_at();

alter table public.map_layouts enable row level security;

drop policy if exists "Users can view their own map layouts" on public.map_layouts;
create policy "Users can view their own map layouts"
on public.map_layouts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own map layouts" on public.map_layouts;
create policy "Users can insert their own map layouts"
on public.map_layouts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own map layouts" on public.map_layouts;
create policy "Users can update their own map layouts"
on public.map_layouts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own map layouts" on public.map_layouts;
create policy "Users can delete their own map layouts"
on public.map_layouts
for delete
to authenticated
using (auth.uid() = user_id);
