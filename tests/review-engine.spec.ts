import { describe, expect, it } from "vitest";
import { LESSONS } from "../src/lessons";
import { TECH_TOPICS } from "../src/data/interview";
import {
  buildReviewPool,
  ensureMarathon,
  filterScope,
  isDue,
  marathonSlice,
  mergeReviewStats,
  pickSmartSession,
  recordAnswer,
  seededRng,
  shuffleOptions,
  tierOf,
  weakTopics,
  type ReviewItem,
  type ReviewStats,
} from "../src/engine/review";
import { migrateProgress, type Progress } from "../src/engine/progress";
import { mergeProgress } from "../src/sync/merge";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const doneUpTo = (n: number): Record<string, boolean> =>
  Object.fromEntries(LESSONS.slice(0, n).map((l) => [l.id, true]));
const fakePool = (n: number): ReviewItem[] =>
  Array.from({ length: n }, (_, i) => ({
    key: `k${i}`,
    q: `q${i}`,
    options: ["a", "b", "c", "d"],
    answer: 0,
    why: "",
    act: 1,
    lessonId: `l${i % 3}`,
    topic: `T${i % 3}`,
  }));

describe("пул повторения", () => {
  it("берёт вопросы только из пройденных уроков", () => {
    const done = doneUpTo(5);
    const pool = buildReviewPool(LESSONS, TECH_TOPICS, done);
    const lessonItems = pool.filter((it) => it.lessonId);
    expect(lessonItems.length).toBeGreaterThan(0);
    for (const it of lessonItems) expect(done[it.lessonId!]).toBe(true);
  });

  it("банк собеседования — не выше достигнутого акта", () => {
    const pool = buildReviewPool(LESSONS, TECH_TOPICS, doneUpTo(3));
    const maxAct = Math.max(...LESSONS.slice(0, 3).map((l) => l.act));
    const iv = pool.filter((it) => !it.lessonId);
    expect(iv.length).toBeGreaterThan(0);
    for (const it of iv) expect(it.act).toBeLessThanOrEqual(maxAct);
  });

  it("пустой прогресс — пустой пул и пустая сессия", () => {
    const pool = buildReviewPool(LESSONS, TECH_TOPICS, {});
    expect(pool).toEqual([]);
    expect(pickSmartSession(pool, {}, 10, NOW, seededRng(1))).toEqual([]);
  });

  it("ключи пула уникальны", () => {
    const pool = buildReviewPool(LESSONS, TECH_TOPICS, doneUpTo(LESSONS.length));
    expect(new Set(pool.map((p) => p.key)).size).toBe(pool.length);
  });
});

describe("случайность и отбор", () => {
  const pool = fakePool(60);

  it("в сессии нет дублей", () => {
    const s = pickSmartSession(pool, {}, 50, NOW, seededRng(7));
    expect(s).toHaveLength(50);
    expect(new Set(s.map((x) => x.key)).size).toBe(50);
  });

  it("разные зёрна дают разные сессии", () => {
    const a = pickSmartSession(pool, {}, 10, NOW, seededRng(1)).map((x) => x.key);
    const b = pickSmartSession(pool, {}, 10, NOW, seededRng(2)).map((x) => x.key);
    expect(a).not.toEqual(b);
  });

  it("перемешивание вариантов сохраняет верный ответ", () => {
    const item: ReviewItem = { ...pool[0], options: ["A", "B", "C", "D"], answer: 2 };
    let moved = false;
    for (let seed = 1; seed < 20; seed++) {
      const sh = shuffleOptions(item, seededRng(seed));
      expect(sh.options[sh.answer]).toBe("C");
      expect([...sh.options].sort()).toEqual(["A", "B", "C", "D"]);
      if (sh.answer !== 2) moved = true;
    }
    expect(moved).toBe(true);
  });

  it("маленький пул: просим больше, чем есть — отдаём всё без повторов", () => {
    const s = pickSmartSession(fakePool(3), {}, 25, NOW, seededRng(3));
    expect(s.map((x) => x.key).sort()).toEqual(["k0", "k1", "k2"]);
  });

  it("ошибочные и просроченные — впереди новых, новые — впереди ещё не созревших", () => {
    let st: ReviewStats = {};
    for (let i = 0; i < 30; i++) st = recordAnswer(st, `k${i}`, true, NOW);
    st = { ...st, k5: { seen: 2, wrong: 1, last: NOW - 2 * DAY, box: 1 } }; // ошибка, срок вышел
    const s = pickSmartSession(pool, st, 31, NOW, seededRng(4)).map((x) => x.key);
    expect(s[0]).toBe("k5");
    // новые k30..k59 идут до ещё не созревших k0..k29 (кроме k5)
    expect(s.slice(1, 31).every((k) => Number(k.slice(1)) >= 30)).toBe(true);
  });

  it("никого не морит голодом: при полном пуле в сессию попадают и не созревшие", () => {
    let st: ReviewStats = {};
    for (const it of pool) st = recordAnswer(st, it.key, true, NOW);
    const s = pickSmartSession(pool, st, 60, NOW, seededRng(5));
    expect(s).toHaveLength(60);
  });

  it("область: по уроку, по акту, только ошибки", () => {
    let st: ReviewStats = {};
    st = recordAnswer(st, "k1", false, NOW);
    expect(filterScope(pool, { kind: "lesson", id: "l0" }, st).every((x) => x.lessonId === "l0")).toBe(true);
    expect(filterScope(pool, { kind: "act", act: 1 }, st)).toHaveLength(60);
    expect(filterScope(pool, { kind: "act", act: 2 }, st)).toHaveLength(0);
    expect(filterScope(pool, { kind: "wrong" }, st).map((x) => x.key)).toEqual(["k1"]);
  });

  it("«повторить всё» проходит весь пул порциями и продолжает с места", () => {
    const rng = seededRng(9);
    let m = ensureMarathon(undefined, pool, { kind: "all" }, rng);
    const seen: string[] = [];
    while (m.pos < m.order.length) {
      const part = marathonSlice(m, pool, 25, rng);
      seen.push(...part.map((x) => x.key));
      m = { ...m, pos: m.pos + part.length };
      // продолжение незаконченного круга сохраняет порядок и позицию
      if (m.pos < m.order.length) expect(ensureMarathon(m, pool, { kind: "all" }, rng)).toEqual(m);
    }
    expect(seen).toHaveLength(60);
    expect(new Set(seen).size).toBe(60);
    // законченный круг — новый порядок
    const again = ensureMarathon(m, pool, { kind: "all" }, rng);
    expect(again.pos).toBe(0);
  });
});

describe("круг по сужающейся области", () => {
  it("исправленные вопросы выпадают, а непоказанные не пропускаются", () => {
    const pool = fakePool(6);
    const rng = seededRng(11);
    const m0 = ensureMarathon(undefined, pool, { kind: "wrong" }, rng);
    // показаны два первых, и они ушли из области «только ошибки»
    const shown = m0.order.slice(0, 2);
    const rest = pool.filter((it) => !shown.includes(it.key));
    const m1 = ensureMarathon({ ...m0, pos: 2 }, rest, { kind: "wrong" }, rng);
    expect(m1.pos).toBe(0);
    expect(m1.order).toEqual(m0.order.slice(2));
  });
});

describe("история повторения", () => {
  it("верный ответ поднимает коробку, ошибка — в первую, счётчики растут", () => {
    let st: ReviewStats = {};
    st = recordAnswer(st, "x", true, NOW);
    st = recordAnswer(st, "x", true, NOW + 1);
    expect(st.x).toEqual({ seen: 2, wrong: 0, last: NOW + 1, box: 3 });
    st = recordAnswer(st, "x", false, NOW + 2);
    expect(st.x).toEqual({ seen: 3, wrong: 1, last: NOW + 2, box: 1 });
    for (let i = 0; i < 9; i++) st = recordAnswer(st, "x", true, NOW + 3 + i);
    expect(st.x.box).toBe(5);
  });

  it("срок повторения зависит от коробки", () => {
    const st = { seen: 3, wrong: 0, last: NOW, box: 3 };
    expect(isDue(st, NOW + DAY)).toBe(false);
    expect(isDue(st, NOW + 3 * DAY)).toBe(true);
    expect(tierOf(undefined, NOW)).toBe(1);
  });

  it("слияние монотонно, коммутативно и идемпотентно", () => {
    const a: ReviewStats = {
      x: { seen: 3, wrong: 1, last: NOW, box: 2 },
      y: { seen: 1, wrong: 0, last: 5, box: 2 },
    };
    const b: ReviewStats = {
      x: { seen: 2, wrong: 2, last: NOW + 10, box: 1 },
      z: { seen: 1, wrong: 1, last: 7, box: 1 },
    };
    const m = mergeReviewStats(a, b);
    expect(m.x).toEqual({ seen: 3, wrong: 2, last: NOW + 10, box: 1 });
    expect(Object.keys(m).sort()).toEqual(["x", "y", "z"]);
    expect(mergeReviewStats(b, a)).toEqual(m);
    expect(mergeReviewStats(m, a)).toEqual(m);
    expect(mergeReviewStats(m, m)).toEqual(m);
  });

  it("mergeProgress сохраняет историю повторения и повторное слияние ничего не меняет", () => {
    const base: Progress = { xp: 0, done: {}, cur: null, hints: {}, updatedAt: 1 };
    const a = { ...base, reviewStats: { x: { seen: 1, wrong: 1, last: 1, box: 1 } } };
    const b = { ...base, updatedAt: 2, reviewStats: { x: { seen: 2, wrong: 1, last: 2, box: 2 } } };
    const m = mergeProgress(a, b);
    expect(m.reviewStats!.x).toEqual({ seen: 2, wrong: 1, last: 2, box: 2 });
    expect(mergeProgress(m, b).reviewStats).toEqual(m.reviewStats);
  });

  it("старое сохранение без истории получает пустую историю", () => {
    const old = migrateProgress({ xp: 50, done: { a: true }, cur: "a", hints: {} });
    expect(old.reviewStats).toEqual({});
    expect(old.xp).toBe(50);
    expect(migrateProgress(null)).toMatchObject({ xp: 0, done: {}, reviewStats: {} });
  });

  it("слабые темы — по числу ошибок", () => {
    const p = fakePool(6);
    const res = [
      { item: p[0], correct: false },
      { item: p[3], correct: false },
      { item: p[1], correct: false },
      { item: p[2], correct: true },
    ];
    expect(weakTopics(res)).toEqual(["T0", "T1"]);
  });
});
