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

-- Индекс для быстрой сортировки лидерборда по XP
create index if not exists public_stats_xp_idx on public.public_stats (xp desc);

-- =====================================================================
-- ДОБАВЛЕНО ПОЗЖЕ: public_stats больше не пишется клиентом напрямую.
-- Раньше клиент мог отправить в public_stats любое xp/missions_done через
-- прямой REST-запрос со своим же валидным токеном (RLS проверяла только
-- auth.uid() = id, не сами значения) — таблица лидеров была тривиально
-- подделываемой. Теперь public_stats — производная от profiles.state,
-- пересчитывается триггером на сервере; клиентских insert/update-политик
-- на неё больше нет (см. drop policy ниже, если применяешь поверх старой
-- установленной схемы).
-- =====================================================================
drop policy if exists "public_stats: insert own" on public.public_stats;
drop policy if exists "public_stats: update own" on public.public_stats;

-- разумный потолок правдоподобия — реальный максимум XP по курсу сильно
-- ниже; это не замена триггеру, а защита на случай, если он когда-то
-- будет изменён с ошибкой
alter table public.public_stats
  drop constraint if exists public_stats_xp_range;
alter table public.public_stats
  add constraint public_stats_xp_range check (xp >= 0 and xp <= 20000);

create or replace function public.rank_of(p_xp integer)
returns text
language sql
immutable
as $$
  select case
    when p_xp >= 1380 then 'Крепкий Middle'
    when p_xp >= 1000 then 'Middle'
    when p_xp >= 650 then 'Middle−'
    when p_xp >= 350 then 'Junior+'
    when p_xp >= 120 then 'Junior'
    else 'Стажёр'
  end;
$$;

-- Пересчитывает public_stats из profiles.state при каждой записи профиля.
-- SECURITY DEFINER — выполняется с правами владельца функции, поэтому
-- обходит RLS на public_stats (её и не должен писать никто, кроме этого
-- триггера).
create or replace function public.sync_public_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp integer;
  v_missions integer;
begin
  v_xp := greatest(0, least(20000, coalesce((new.state->>'xp')::integer, 0)));
  select count(*) into v_missions
    from jsonb_each(coalesce(new.state->'done', '{}'::jsonb)) as d(k, v)
    where v::text = 'true';

  insert into public.public_stats (id, username, xp, rank_name, missions_done, updated_at)
  values (new.id, new.username, v_xp, public.rank_of(v_xp), v_missions, now())
  on conflict (id) do update set
    username = excluded.username,
    xp = excluded.xp,
    rank_name = excluded.rank_name,
    missions_done = excluded.missions_done,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists profiles_sync_public_stats on public.profiles;
create trigger profiles_sync_public_stats
  after insert or update on public.profiles
  for each row execute function public.sync_public_stats();

-- =====================================================================
-- ДОБАВЛЕНО ПОЗЖЕ: комментарии/вопросы к миссиям (комьюнити внутри игры)
-- Если основная схема выше уже выполнена — можно выполнить только этот
-- блок отдельно, он не пересекается с уже созданными таблицами.
-- =====================================================================
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  mission_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  username text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;

create policy "comments: select all" on public.comments
  for select using (true);
create policy "comments: insert own" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "comments: delete own" on public.comments
  for delete using (auth.uid() = user_id);

create index if not exists comments_mission_idx on public.comments (mission_id, created_at desc);
