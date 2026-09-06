-- =====================================================================
-- Pipeline: путь до Middle DevOps — схема базы данных (Supabase/Postgres)
-- Выполнить целиком в Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- Приватный профиль: полный слепок игрового состояния (S), читает и
-- пишет только сам пользователь (через auth.uid()).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Публичная витрина: только то, что не жалко показать всем — лидерборд
-- и публичный профиль читают эту таблицу без авторизации.
create table if not exists public.public_stats (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  xp int not null default 0,
  rank_name text not null default '',
  streak int not null default 0,
  missions_done int not null default 0,
  labs_done int not null default 0,
  bosses_done int not null default 0,
  badges_count int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.public_stats enable row level security;

create policy "public_stats: select all" on public.public_stats
  for select using (true);
create policy "public_stats: insert own" on public.public_stats
  for insert with check (auth.uid() = id);
create policy "public_stats: update own" on public.public_stats
  for update using (auth.uid() = id);

-- Индекс для быстрой сортировки лидерборда по XP
create index if not exists public_stats_xp_idx on public.public_stats (xp desc);
