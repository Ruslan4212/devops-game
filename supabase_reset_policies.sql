-- =====================================================================
-- Разовая очистка: снимает ВСЕ политики со всех трёх таблиц, чтобы
-- дальнейший запуск supabase_schema.sql прошёл без "already exists"
-- независимо от того, какая версия схемы уже была применена раньше.
-- Выполнить ОДИН раз в Supabase Dashboard → SQL Editor → New query → Run,
-- затем запустить supabase_schema.sql целиком.
-- =====================================================================

drop policy if exists "profiles: select own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

drop policy if exists "public_stats: select all" on public.public_stats;
drop policy if exists "public_stats: insert own" on public.public_stats;
drop policy if exists "public_stats: update own" on public.public_stats;

drop policy if exists "comments: select all" on public.comments;
drop policy if exists "comments: insert own" on public.comments;
drop policy if exists "comments: delete own" on public.comments;
