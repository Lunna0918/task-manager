-- 任务管理系统 · 数据库初始化脚本
-- 在 Supabase 控制台的 SQL Editor 中整段执行

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  priority   text not null default '中' check (priority in ('高', '中', '低')),
  completed  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- 开启行级安全，并放行匿名读写（后端使用 publishable / anon key）
alter table public.tasks enable row level security;

drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks
  for select to anon, authenticated using (true);

create policy "tasks_insert" on public.tasks
  for insert to anon, authenticated with check (true);

create policy "tasks_update" on public.tasks
  for update to anon, authenticated using (true) with check (true);

create policy "tasks_delete" on public.tasks
  for delete to anon, authenticated using (true);
