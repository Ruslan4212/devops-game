import type { DrillItem, DrillUnit } from "../data/drills";
import { MAX_BOX, isDue as reviewDue, mergeReviewStats, type ReviewStat, type ReviewStats } from "./review";

/**
 * Ежедневная практика команд: короткие упражнения, станции на карте, коробки Лейтнера.
 * Чем увереннее команда (выше коробка), тем сложнее упражнение: выбрать → собрать → набрать.
 * Модуль чистый: время и случайность — параметры, никакого DOM и localStorage.
 */

export interface DrillState {
  /** история по каждой команде — ключ «станция:номер» */
  stats: ReviewStats;
  /** сколько упражнений выполнено в каждый день (ключ — локальная дата) */
  days: Record<string, number>;
}

export type ExerciseKind = "pick" | "explain" | "build" | "type";

export interface Exercise {
  key: string;
  kind: ExerciseKind;
  /** задание по-русски */
  ask: string;
  /** эталонная команда */
  cmd: string;
  /** подсказка «что делает» — показывается после ответа */
  teach: string;
  /** pick / explain: варианты и номер верного */
  options?: string[];
  answer?: number;
  /** build: фишки в перемешанном порядке */
  tokens?: string[];
}

export type Rand = () => number;

const DAY = 86_400_000;
/** Сколько команд станции должно быть «знакомы» (коробка ≥ 2), чтобы открылась следующая. */
export const UNLOCK_SHARE = 0.6;
/** Коробка, с которой команда считается выученной. */
export const LEARNED_BOX = 3;
export const DEFAULT_GOAL = 20;
export const GOALS = [10, 20, 40, 60] as const;

export const emptyDrill = (): DrillState => ({ stats: {}, days: {} });

export const itemKey = (unitId: string, i: number): string => `${unitId}:${i}`;

/** Локальная дата «ГГГГ-ММ-ДД»: день сменяется в полночь игрока, а не по UTC. */
export function dayKey(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ───────── проверка ответа ───────── */

/** Приводит запись команды к виду, в котором эквивалентные записи совпадают. */
export function normalizeCmd(s: string): string {
  let t = s.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  t = t.replace(/\s*(&&|\|\||\||>>|>)\s*/g, " $1 ").replace(/(\d)\s*>\s*&\s*(\d)/g, "$1>&$2");
  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const q = w.replace(/^'(.*)'$/, '"$1"');
      // -la и -al — одно и то же
      return /^-[A-Za-z]{2,}$/.test(q) ? "-" + q.slice(1).split("").sort().join("") : q;
    })
    .join(" ");
}

export function isCorrect(item: Pick<DrillItem, "cmd" | "alts">, input: string): boolean {
  const got = normalizeCmd(input);
  if (!got) return false;
  return [item.cmd, ...(item.alts ?? [])].some((c) => normalizeCmd(c) === got);
}

/* ───────── карта ───────── */

export const stat = (s: DrillState, key: string): ReviewStat | undefined => s.stats[key];

export type UnitStatus = "locked" | "open" | "learned";

export interface UnitView {
  unit: DrillUnit;
  status: UnitStatus;
  /** сколько команд станции выучено / всего */
  learned: number;
  total: number;
  /** сколько команд уже встречалось */
  seen: number;
  /** сколько команд ждут повторения сегодня */
  due: number;
}

function share(unit: DrillUnit, s: DrillState, minBox: number): number {
  let n = 0;
  unit.items.forEach((_, i) => {
    const st = s.stats[itemKey(unit.id, i)];
    if (st && st.box >= minBox) n++;
  });
  return n;
}

/** Команда уже встречалась, и срок её коробки вышел. */
const isDue = (st: ReviewStat | undefined, now: number): boolean => !!st && reviewDue(st, now);

export function unitViews(units: readonly DrillUnit[], s: DrillState, now: number): UnitView[] {
  let prevOpen = true;
  return units.map((unit) => {
    const total = unit.items.length;
    const learned = share(unit, s, LEARNED_BOX);
    const familiar = share(unit, s, 2);
    const unlocked = prevOpen;
    prevOpen = unlocked && familiar >= Math.ceil(total * UNLOCK_SHARE);
    let seen = 0;
    let due = 0;
    unit.items.forEach((_, i) => {
      const st = s.stats[itemKey(unit.id, i)];
      if (st) seen++;
      if (isDue(st, now)) due++;
    });
    const status: UnitStatus = !unlocked ? "locked" : learned === total ? "learned" : "open";
    return { unit, status, learned, total, seen, due };
  });
}

/** Станция, с которой стоит продолжить: первая открытая, не выученная до конца. */
export function currentUnit(views: readonly UnitView[]): UnitView | undefined {
  return views.find((v) => v.status === "open") ?? views[views.length - 1];
}

/* ───────── сессия ───────── */

function shuffle<T>(a: readonly T[], rand: Rand): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const tokenize = (cmd: string): string[] => cmd.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];

/** Какое упражнение даём для команды: чем выше коробка, тем меньше подсказок. */
export function kindFor(st: ReviewStat | undefined, tokenCount: number, rand: Rand): ExerciseKind {
  const box = st?.box ?? 0;
  if (!st) return rand() < 0.5 ? "explain" : "pick";
  if (box <= 1) return "pick";
  if (box === 2) return tokenCount >= 2 ? "build" : "pick";
  if (box === 3) return rand() < 0.5 && tokenCount >= 2 ? "build" : "type";
  return "type";
}

export function makeExercise(
  units: readonly DrillUnit[],
  unit: DrillUnit,
  index: number,
  s: DrillState,
  rand: Rand,
): Exercise {
  const item = unit.items[index];
  const key = itemKey(unit.id, index);
  const tokens = tokenize(item.cmd);
  const kind = kindFor(s.stats[key], tokens.length, rand);
  const base = { key, ask: item.ask, cmd: item.cmd, teach: item.teach };

  if (kind === "explain") {
    const others = units.flatMap((u) => u.items).filter((it) => it.teach !== item.teach);
    const opts = shuffle(
      [
        item.teach,
        ...shuffle(others, rand)
          .slice(0, 3)
          .map((it) => it.teach),
      ],
      rand,
    );
    return { ...base, kind, options: opts, answer: opts.indexOf(item.teach) };
  }
  if (kind === "pick") {
    const pool = (item.wrong ?? []).filter((w) => !isCorrect(item, w));
    const fill = unit.items.filter((it) => it !== item).map((it) => it.cmd);
    const wrong = [...new Set([...shuffle(pool, rand), ...shuffle(fill, rand)])].slice(0, 3);
    const opts = shuffle([item.cmd, ...wrong], rand);
    return { ...base, kind, options: opts, answer: opts.indexOf(item.cmd) };
  }
  if (kind === "build") {
    const extra = (item.wrong ?? [])
      .flatMap(tokenize)
      .filter((t, i, a) => !tokens.includes(t) && a.indexOf(t) === i);
    return { ...base, kind, tokens: shuffle([...tokens, ...shuffle(extra, rand).slice(0, 2)], rand) };
  }
  return { ...base, kind: "type" };
}

/**
 * Собирает сессию из n упражнений. Приоритет: команды, ждущие повторения и ошибочные →
 * новые команды открытых станций (по две-три за раз, чтобы не заваливать) → всё остальное.
 */
export function buildSession(
  units: readonly DrillUnit[],
  s: DrillState,
  n: number,
  now: number,
  rand: Rand,
  focus?: string,
): Exercise[] {
  const views = unitViews(units, s, now);
  const open = views.filter((v) => v.status !== "locked" && (!focus || v.unit.id === focus));
  type Cand = { unit: DrillUnit; i: number; tier: number };
  const cands: Cand[] = [];
  let fresh = 0;
  const freshCap = focus ? 4 : 3;
  for (const v of open) {
    v.unit.items.forEach((_, i) => {
      const st = s.stats[itemKey(v.unit.id, i)];
      let tier: number;
      if (!st) {
        if (fresh >= freshCap) return;
        fresh++;
        tier = 1;
      } else if (isDue(st, now)) tier = st.box <= 2 ? 0 : 2;
      else tier = 3;
      cands.push({ unit: v.unit, i, tier });
    });
  }
  const sorted = shuffle(cands, rand).sort((a, b) => a.tier - b.tier);
  const picked = sorted.slice(0, n);
  // сессия длиннее набора кандидатов — повторяем круг (с другим видом упражнения)
  for (let k = 0; picked.length < n && sorted.length; k++) picked.push(sorted[k % sorted.length]);
  return shuffle(picked, rand).map((c) => makeExercise(units, c.unit, c.i, s, rand));
}

/* ───────── итоги ответа ───────── */

export function applyAnswer(s: DrillState, key: string, ok: boolean, now: number): void {
  const prev = s.stats[key];
  const box = prev?.box ?? 1;
  s.stats[key] = {
    seen: (prev?.seen ?? 0) + 1,
    wrong: (prev?.wrong ?? 0) + (ok ? 0 : 1),
    last: now,
    box: ok ? Math.min(MAX_BOX, box + 1) : 1,
  };
}

export function countToday(s: DrillState, now: number): number {
  return s.days[dayKey(now)] ?? 0;
}

export function addToday(s: DrillState, now: number, n = 1): void {
  const k = dayKey(now);
  s.days[k] = (s.days[k] ?? 0) + n;
}

/** Серия: сколько дней подряд были упражнения. Пока сегодня ещё пусто, серия вчерашнего дня не сгорает. */
export function streak(days: Record<string, number>, now: number): number {
  let n = 0;
  let t = now;
  if (!days[dayKey(t)]) t -= DAY;
  while (days[dayKey(t)]) {
    n++;
    t -= DAY;
  }
  return n;
}

/** Слияние двух устройств: коробки — как у повторения, счётчики дней — максимум. */
export function mergeDrill(a: DrillState | undefined, b: DrillState | undefined): DrillState | undefined {
  if (!a && !b) return undefined;
  const days: Record<string, number> = { ...(a?.days ?? {}) };
  for (const [k, v] of Object.entries(b?.days ?? {})) days[k] = Math.max(days[k] ?? 0, v);
  return { stats: mergeReviewStats(a?.stats, b?.stats), days };
}

/** Общее число выученных команд и всего команд. */
export function totals(units: readonly DrillUnit[], s: DrillState): { learned: number; total: number } {
  let learned = 0;
  let total = 0;
  for (const u of units) {
    total += u.items.length;
    learned += share(u, s, LEARNED_BOX);
  }
  return { learned, total };
}
