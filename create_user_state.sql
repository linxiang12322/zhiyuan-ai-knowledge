-- ============================================================
--  知渊 · 仅补建 user_state 表（records 表已存在，无需重复）
-- ------------------------------------------------------------
--  使用方法：
--    1. 打开 Supabase 控制台 → 左侧 SQL Editor → New query
--    2. 整段复制粘贴本文件内容，点击 Run
--    3. 回到知渊，登录云端账号，云同步即可正常工作
--
--  本脚本是幂等的：可重复执行，不会破坏已有数据。
--  注意：必须用「service_role 权限」或在 SQL Editor（项目所有者）
--  下执行；匿名/发布版 key 没有建表权限。
-- ============================================================


-- 自动维护 updated_at 的函数（user_state 触发器会用到）
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- 表 1：user_state —— 通用用户状态表（同步 4 类数据：kc / inbox / proj / recall）
create table if not exists public.user_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists user_state_user_idx on public.user_state (user_id);

alter table public.user_state enable row level security;

-- 行级安全：每个用户只能读写自己的数据
drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own" on public.user_state
  for delete using (auth.uid() = user_id);

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before update on public.user_state
  for each row execute function public.touch_updated_at();


-- 校验：执行完成后运行下面这句，应能看到两张表
-- select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in ('user_state','records');
