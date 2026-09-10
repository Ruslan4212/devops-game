import type { SupabaseClient } from "@supabase/supabase-js";
import type { Progress } from "../engine/progress";
import type { PublicStats } from "./merge";

/**
 * Тонкая типизированная обёртка над Supabase.
 *
 * Принципы:
 *  - никаких секретов в коде: URL и anon-ключ приходят из env (VITE_*).
 *    anon-ключ публичен по дизайну Supabase, вся защита — на RLS-политиках
 *    в supabase_schema.sql (каждый видит только свой profiles.state);
 *  - graceful degradation: без настроенного env весь слой сообщает
 *    isConfigured === false, и приложение работает как раньше на localStorage;
 *  - ленивая загрузка: сам клиент подтягивается динамическим import()
 *    только когда действительно нужен — не утяжеляет основной бандл;
 *  - ошибки не бросаются наружу, а возвращаются как Result со строкой,
 *    пригодной для показа пользователю.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const URL_ENV = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY_ENV = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isPlaceholder = (v: string | undefined): boolean =>
  !v || v.length < 12 || /вставь|placeholder|your[-_ ]/i.test(v);

export const isConfigured = !isPlaceholder(URL_ENV) && !isPlaceholder(KEY_ENV);

let clientPromise: Promise<SupabaseClient> | null = null;

async function client(): Promise<SupabaseClient> {
  if (!isConfigured) throw new Error("Облако не настроено");
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(URL_ENV!, KEY_ENV!, {
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

/** Записать облачный профиль и публичную витрину для лидерборда. */
export async function pushProfile(
  username: string,
  state: Progress,
  publicStats: PublicStats,
): Promise<Result<void>> {
  try {
    const sb = await client();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return { ok: false, error: "не выполнен вход" };
    const id = u.user.id;
    const now = new Date().toISOString();

    const p1 = await sb.from("profiles").upsert({ id, username, state, updated_at: now });
    if (p1.error) return { ok: false, error: p1.error.message };

    const p2 = await sb.from("public_stats").upsert({ id, username, ...publicStats, updated_at: now });
    if (p2.error) return { ok: false, error: p2.error.message };

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
