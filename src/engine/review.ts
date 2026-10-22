import type { Lesson } from "./types";
import type { TechTopic } from "../data/interview";

/**
 * Движок повторения: интервальное повторение по коробкам Лейтнера.
 *
 * Пул — ТОЛЬКО то, что игрок прошёл: шаги quiz пройденных уроков и вопросы
 * банка собеседования с актом не выше достигнутого. Каждый вопрос живёт в одной
 * из коробок 1–5: верный ответ двигает его в следующую коробку (реже спрашиваем),
 * ошибка — обратно в первую. Сессия собирается так:
 *   1) «пора повторить» и ошибочные (коробки 1–2, срок вышел),
 *   2) новые — ещё ни разу не показанные,
 *   3) остальные просроченные,
 *   4) ещё не просроченные — от самых «созревших» к свежим.
 * Внутри уровня порядок случайный, поэтому две сессии подряд различаются,
 * а ступень 4 гарантирует, что ни один вопрос не «умирает с голоду»:
 * если пул исчерпан приоритетными, добираем из всех остальных.
 *
 * Модуль чистый: никакого DOM и localStorage, случайность и время — параметры.
 */

export interface ReviewItem {
  /** стабильный ключ вопроса — по нему хранится история */
  key: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
  act: number;
  /** урок, откуда вопрос (для банка собеседования — отсутствует) */
  lessonId?: string;
  /** название темы для разбора слабых мест: урок или тема собеседования */
  topic: string;
}

/** История одного вопроса. Все поля, кроме box, только растут — это делает слияние монотонным. */
export interface ReviewStat {
  /** сколько раз показан */
  seen: number;
  /** сколько раз отвечен неверно */
  wrong: number;
  /** когда показан в последний раз, мс эпохи */
  last: number;
  /** коробка Лейтнера 1–5 по итогам последнего ответа */
  box: number;
}

export type ReviewStats = Record<string, ReviewStat>;

export type ReviewScope =
  { kind: "all" } | { kind: "act"; act: number } | { kind: "lesson"; id: string } | { kind: "wrong" };

export type ReviewCount = 10 | 25 | 50 | "all";

/** Через сколько дней вопрос из коробки снова «пора повторить». */
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16] as const;
export const MAX_BOX = 5;
const DAY = 24 * 60 * 60 * 1000;

/* ------------------------------- пул ------------------------------- */

/** Ключ вопроса урока: id урока + номер шага — тексты уроков не меняются, порядок тоже. */
export const lessonKey = (lessonId: string, stepIx: number): string => `L:${lessonId}:${stepIx}`;
export const interviewKey = (topicId: string, ix: number): string => `I:${topicId}:${ix}`;

/** Самый поздний акт среди пройденных уроков (минимум 1). */
export function reachedActOf(lessons: readonly Lesson[], done: Record<string, boolean>): number {
  return Math.max(1, ...lessons.filter((l) => done[l.id]).map((l) => l.act));
}

/** Все вопросы, которые честно задавать: только из пройденного. */
export function buildReviewPool(
  lessons: readonly Lesson[],
  topics: readonly TechTopic[],
  done: Record<string, boolean>,
): ReviewItem[] {
  const pool: ReviewItem[] = [];
  let anyDone = false;
  for (const l of lessons) {
    if (!done[l.id]) continue;
    anyDone = true;
    l.steps.forEach((s, ix) => {
      if (s.kind !== "quiz") return;
      pool.push({
        key: lessonKey(l.id, ix),
        q: s.text,
        options: s.options,
        answer: s.answer,
        why: s.explain,
        act: l.act,
        lessonId: l.id,
        topic: l.title,
      });
    });
  }
  // банк собеседования — только когда пройден хоть один урок, и не дальше достигнутого акта
  if (!anyDone) return pool;
  const maxAct = reachedActOf(lessons, done);
  for (const t of topics) {
    t.questions.forEach((q, ix) => {
      if (q.act > maxAct) return;
      pool.push({
        key: interviewKey(t.id, ix),
        q: q.q,
        options: q.options,
        answer: q.answer,
        why: q.why,
        act: q.act,
        topic: t.name,
      });
    });
  }
  return pool;
}

export const isWrongItem = (st: ReviewStat | undefined): boolean => !!st && st.wrong > 0 && st.box <= 2;

export function filterScope(
  pool: readonly ReviewItem[],
  scope: ReviewScope,
  stats: ReviewStats,
): ReviewItem[] {
  switch (scope.kind) {
    case "all":
      return [...pool];
    case "act":
      return pool.filter((it) => it.act === scope.act && it.lessonId !== undefined);
    case "lesson":
      return pool.filter((it) => it.lessonId === scope.id);
    case "wrong":
      return pool.filter((it) => isWrongItem(stats[it.key]));
  }
}

/* --------------------------- случайность --------------------------- */

/** Детерминированный генератор для тестов (mulberry32). В приложении — Math.random. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: readonly T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Перемешивает варианты ответа, сохраняя указатель на верный. */
export function shuffleOptions(item: ReviewItem, rng: () => number): ReviewItem {
  const order = shuffle(
    item.options.map((_, i) => i),
    rng,
  );
  return { ...item, options: order.map((i) => item.options[i]), answer: order.indexOf(item.answer) };
}

/* ----------------------------- выбор ----------------------------- */

export function isDue(st: ReviewStat | undefined, now: number): boolean {
  if (!st) return true;
  const box = Math.min(MAX_BOX, Math.max(1, st.box));
  return now - st.last >= BOX_INTERVAL_DAYS[box] * DAY;
}

/** Насколько вопрос «созрел»: доля прошедшего интервала (≥1 — пора). */
function ripeness(st: ReviewStat, now: number): number {
  const box = Math.min(MAX_BOX, Math.max(1, st.box));
  const span = BOX_INTERVAL_DAYS[box] * DAY;
  return span ? (now - st.last) / span : Infinity;
}

/** Ступень приоритета: 0 — ошибочные и пора, 1 — новые, 2 — просроченные, 3 — ещё рано. */
export function tierOf(st: ReviewStat | undefined, now: number): number {
  if (!st) return 1;
  if (!isDue(st, now)) return 3;
  return st.box <= 2 ? 0 : 2;
}

/**
 * Умная сессия: n вопросов без повторов, по ступеням приоритета,
 * внутри ступени — случайно; варианты ответа перемешаны.
 */
export function pickSmartSession(
  pool: readonly ReviewItem[],
  stats: ReviewStats,
  n: number,
  now: number,
  rng: () => number,
): ReviewItem[] {
  const tiers: ReviewItem[][] = [[], [], [], []];
  for (const it of pool) tiers[tierOf(stats[it.key], now)].push(it);
  const ordered = [
    ...shuffle(tiers[0], rng),
    ...shuffle(tiers[1], rng),
    ...shuffle(tiers[2], rng),
    // ещё не созревшие: сначала те, что ближе к сроку, с небольшим случайным разбросом
    ...tiers[3]
      .map((it) => ({ it, w: ripeness(stats[it.key], now) + rng() * 0.25 }))
      .sort((a, b) => b.w - a.w)
      .map((x) => x.it),
  ];
  return ordered.slice(0, Math.max(0, n)).map((it) => shuffleOptions(it, rng));
}

export const countToNumber = (c: ReviewCount, poolSize: number): number => (c === "all" ? poolSize : c);

/* ------------------------- «повторить всё» ------------------------- */

/** Проход по всему пулу в случайном порядке порциями: хранится порядок и позиция. */
export interface ReviewMarathon {
  /** область, по которой идёт проход — чтобы смена области начинала новый круг */
  scope: string;
  order: string[];
  pos: number;
}

export const scopeId = (s: ReviewScope): string =>
  s.kind === "act" ? `act:${s.act}` : s.kind === "lesson" ? `lesson:${s.id}` : s.kind;

/** Начинает новый круг или продолжает текущий, если область та же и круг не закончен. */
export function ensureMarathon(
  current: ReviewMarathon | undefined,
  pool: readonly ReviewItem[],
  scope: ReviewScope,
  rng: () => number,
): ReviewMarathon {
  const sid = scopeId(scope);
  const keys = new Set(pool.map((it) => it.key));
  if (current && current.scope === sid && current.pos < current.order.length) {
    // новые пройденные уроки дописываем в конец круга — в случайном порядке
    const known = new Set(current.order);
    const fresh = shuffle(
      pool.map((it) => it.key).filter((k) => !known.has(k)),
      rng,
    );
    return { scope: sid, order: [...current.order.filter((k) => keys.has(k)), ...fresh], pos: current.pos };
  }
  return {
    scope: sid,
    order: shuffle(
      pool.map((it) => it.key),
      rng,
    ),
    pos: 0,
  };
}

/** Следующая порция круга. Позицию двигает вызывающий — по мере ответов. */
export function marathonSlice(
  m: ReviewMarathon,
  pool: readonly ReviewItem[],
  n: number,
  rng: () => number,
): ReviewItem[] {
  const byKey = new Map(pool.map((it) => [it.key, it]));
  return m.order
    .slice(m.pos, m.pos + n)
    .map((k) => byKey.get(k))
    .filter((it): it is ReviewItem => !!it)
    .map((it) => shuffleOptions(it, rng));
}

/* ----------------------------- история ----------------------------- */

/** Записывает ответ: верно — на коробку выше (минимум во вторую), ошибка — в первую. Не мутирует вход. */
export function recordAnswer(stats: ReviewStats, key: string, correct: boolean, now: number): ReviewStats {
  const prev = stats[key];
  // первый же верный ответ — сразу во вторую коробку: первая только для ошибок
  const box = correct ? Math.min(MAX_BOX, Math.max(1, prev?.box ?? 1) + 1) : 1;
  return {
    ...stats,
    [key]: {
      seen: (prev?.seen ?? 0) + 1,
      wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
      last: Math.max(now, prev?.last ?? 0),
      box,
    },
  };
}

/**
 * Слияние истории с двух устройств. Счётчики и время — максимум (только растут);
 * коробка — от «самой поздней» записи по (last, seen, wrong, box). Выбор максимума
 * в полном порядке ассоциативен, коммутативен и идемпотентен, поэтому повторное
 * слияние ничего не меняет.
 */
export function mergeReviewStats(a: ReviewStats | undefined, b: ReviewStats | undefined): ReviewStats {
  const out: ReviewStats = {};
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const x = a?.[k];
    const y = b?.[k];
    if (!x || !y) {
      out[k] = { ...(x ?? y)! };
      continue;
    }
    const later =
      x.last !== y.last
        ? x.last > y.last
        : x.seen !== y.seen
          ? x.seen > y.seen
          : x.wrong !== y.wrong
            ? x.wrong > y.wrong
            : x.box >= y.box;
    out[k] = {
      seen: Math.max(x.seen, y.seen),
      wrong: Math.max(x.wrong, y.wrong),
      last: Math.max(x.last, y.last),
      box: (later ? x : y).box,
    };
  }
  return out;
}

/** Слабые темы сессии: названия уроков/тем, где были ошибки, по числу ошибок. */
export function weakTopics(results: readonly { item: ReviewItem; correct: boolean }[]): string[] {
  const cnt = new Map<string, number>();
  for (const r of results) if (!r.correct) cnt.set(r.item.topic, (cnt.get(r.item.topic) ?? 0) + 1);
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
