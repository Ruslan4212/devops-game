import type { SupabaseClient } from "@supabase/supabase-js";
import type { Progress } from "../engine/progress";

/**
 * Тонкая типизированная обёртка над Supabase.
 *
 * Принципы:
 *  - никаких настоящих секретов: используется только publishable (anon) ключ.
 *    Он по дизайну Supabase ездит в браузер вместе со страницей, а защита
 *    держится на RLS-политиках из supabase_schema.sql (каждый видит только
 *    свой profiles.state; public_stats открыт на чтение и содержит лишь
 *    имя, ранг и XP). Служебного service_role ключа здесь нет;
 *  - конфигурация ищется по порядку: env при сборке (VITE_*) → настройки,
 *    сохранённые игроком → значения по умолчанию;
 *  - graceful degradation: если конфигурации нет вообще, слой сообщает
 *    isConfigured === false, и приложение работает на одном localStorage;
 *  - ленивая загрузка: сам клиент подтягивается динамическим import()
 *    только когда действительно нужен — не утяжеляет основной бандл;
 *  - ошибки не бросаются наружу, а возвращаются как Result со строкой,
 *    пригодной для показа пользователю.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const isPlaceholder = (v: string | undefined): boolean =>
  !v || v.length < 12 || /вставь|placeholder|your[-_ ]/i.test(v);

/**
 * Публичный проект Supabase, который уже отдаёт прежняя версия игры.
 * Это publishable (anon) ключ — он по дизайну ездит в браузер вместе со
 * страницей, и защита строится не на его секретности, а на RLS-политиках
 * из supabase_schema.sql. Служебного service_role ключа здесь нет и быть не должно.
 * Нужен другой проект — задай VITE_* при сборке или сохрани настройки в интерфейсе.
 */
const DEFAULT_URL = "https://eotzgzaeuzvreidwkltf.supabase.co";
const DEFAULT_KEY = "sb_publishable_mRzT0lXHpvXgfQiO8o--Jw_9ii-wJ39";

const CFG_KEY = "devops_cloud_cfg";

export interface CloudConfig {
  url: string;
  key: string;
}

/** Настройки, сохранённые игроком в интерфейсе (перекрывают значения по умолчанию). */
function savedConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CloudConfig>;
    if (isPlaceholder(o.url) || isPlaceholder(o.key)) return null;
    return { url: o.url!, key: o.key! };
  } catch {
    return null;
  }
}

/** Итоговая конфигурация: env при сборке → настройки игрока → значения по умолчанию. */
export function cloudConfig(): CloudConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!isPlaceholder(envUrl) && !isPlaceholder(envKey)) return { url: envUrl!, key: envKey! };
  const saved = savedConfig();
  if (saved) return saved;
  if (!isPlaceholder(DEFAULT_URL) && !isPlaceholder(DEFAULT_KEY))
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  return null;
}

export const isConfigured = cloudConfig() !== null;

let clientPromise: Promise<SupabaseClient> | null = null;

/** Сохранить свои URL и anon-ключ. Пустые значения сбрасывают настройку. */
export function saveConfig(cfg: CloudConfig | null): void {
  try {
    if (!cfg || isPlaceholder(cfg.url) || isPlaceholder(cfg.key)) localStorage.removeItem(CFG_KEY);
    else localStorage.setItem(CFG_KEY, JSON.stringify({ url: cfg.url.trim(), key: cfg.key.trim() }));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
  clientPromise = null;
}

async function client(): Promise<SupabaseClient> {
  const cfg = cloudConfig();
  if (!cfg) throw new Error("Облако не настроено");
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      }),
    );
  }
  return clientPromise;
}

const msg = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "неизвестная ошибка";

export interface Account {
  id: string;
  email: string;
}

export interface RemoteProfile {
  username: string;
  state: Progress;
}

/** Текущая сессия, если пользователь вошёл. */
export async function currentAccount(): Promise<Account | null> {
  if (!isConfigured) return null;
  try {
    const sb = await client();
    const { data } = await sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  } catch {
    return null;
  }
}

/** Подписка на вход/выход. Возвращает функцию отписки. */
export async function onAuthChange(cb: (acc: Account | null) => void): Promise<() => void> {
  if (!isConfigured) return () => {};
  const sb = await client();
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signUp(email: string, password: string): Promise<Result<Account | null>> {
  try {
    const sb = await client();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, value: data.user ? { id: data.user.id, email } : null };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function signIn(email: string, password: string): Promise<Result<Account>> {
  try {
    const sb = await client();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, value: { id: data.user.id, email: data.user.email ?? email } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function signOut(): Promise<void> {
  try {
    const sb = await client();
    await sb.auth.signOut();
  } catch {
    /* локальный выход всё равно произойдёт через onAuthChange */
  }
}

/** Забрать облачный профиль текущего пользователя. */
export async function pullProfile(): Promise<Result<RemoteProfile | null>> {
  try {
    const sb = await client();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return { ok: false, error: "не выполнен вход" };
    const { data, error } = await sb
      .from("profiles")
      .select("username, state")
      .eq("id", u.user.id)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, value: null };
    return { ok: true, value: { username: data.username, state: data.state as Progress } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export interface LeaderRow {
  id: string;
  username: string;
  xp: number;
  rank_name: string;
  missions_done: number;
}

/**
 * Таблица лидеров. Читает публичную витрину public_stats — по RLS она
 * доступна на чтение всем, и в ней нет ничего личного: имя, XP и ранг.
 * Возвращает строки и идентификатор текущего игрока, чтобы подсветить его.
 */
export async function fetchLeaderboard(
  limit = 50,
): Promise<Result<{ rows: LeaderRow[]; meId: string | null }>> {
  try {
    const sb = await client();
    const { data, error } = await sb
      .from("public_stats")
      .select("id, username, xp, rank_name, missions_done")
      .order("xp", { ascending: false })
      .limit(Math.max(1, Math.min(200, limit)));
    if (error) return { ok: false, error: error.message };
    const { data: u } = await sb.auth.getUser();
    return { ok: true, value: { rows: (data ?? []) as LeaderRow[], meId: u.user?.id ?? null } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/**
 * Записать облачный профиль. Публичная витрина (public_stats) для лидерборда
 * больше не пишется отсюда напрямую — её пересчитывает серверный триггер
 * (см. supabase_schema.sql, sync_public_stats) из только что записанного
 * profiles.state. Так клиент не может отправить в лидерборд xp/ранг, не
 * совпадающий с тем, что реально сохранено в его собственном профиле.
 */
export async function pushProfile(username: string, state: Progress): Promise<Result<void>> {
  try {
    const sb = await client();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return { ok: false, error: "не выполнен вход" };
    const id = u.user.id;
    const now = new Date().toISOString();

    const p1 = await sb.from("profiles").upsert({ id, username, state, updated_at: now });
    if (p1.error) return { ok: false, error: p1.error.message };

    return { ok: true, value: undefined };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Access-токен текущей сессии — нужен sandbox-серверу для проверки входа. */
export async function accessToken(): Promise<string | null> {
  if (!isConfigured) return null;
  try {
    const sb = await client();
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
