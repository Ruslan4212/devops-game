import { describe, expect, it } from "vitest";
import { DRILL_UNITS } from "../src/data/drills";
import {
  addToday,
  applyAnswer,
  buildSession,
  dayKey,
  emptyDrill,
  isCorrect,
  mergeDrill,
  normalizeCmd,
  streak,
  unitViews,
} from "../src/engine/drill";
import { mergeProgress } from "../src/sync/merge";

const NOW = new Date(2026, 5, 10, 12).getTime();
const DAY = 86_400_000;
const rand = () => 0.42;

describe("проверка команды", () => {
  it("прощает пробелы, кавычки и порядок слитных флагов", () => {
    expect(normalizeCmd("ls|wc  -l")).toBe(normalizeCmd("ls | wc -l"));
    expect(normalizeCmd("ls -al")).toBe(normalizeCmd("ls -la"));
    expect(normalizeCmd("echo 'a'")).toBe(normalizeCmd('echo "a"'));
    expect(normalizeCmd("a>>b")).toBe("a >> b");
    expect(normalizeCmd("x 2>&1")).toBe("x 2>&1");
  });
  it("различает разные команды", () => {
    expect(isCorrect({ cmd: "ls -l" }, "ls -a")).toBe(false);
    expect(isCorrect({ cmd: "tail -n 5 f" }, "tail 5 f")).toBe(false);
    expect(isCorrect({ cmd: "echo ok > f" }, "echo ok >> f")).toBe(false);
    expect(isCorrect({ cmd: "ls -l", alts: ["ls -l ."] }, "ls -l .")).toBe(true);
    expect(isCorrect({ cmd: "ls" }, "")).toBe(false);
  });
});

describe("данные практики", () => {
  it("эталон и альтернативы принимаются, неверные варианты — нет", () => {
    for (const u of DRILL_UNITS)
      for (const it of u.items) {
        expect(isCorrect(it, it.cmd), it.cmd).toBe(true);
        for (const a of it.alts ?? []) expect(isCorrect(it, a), a).toBe(true);
        for (const w of it.wrong ?? []) expect(isCorrect(it, w), `${it.cmd} vs ${w}`).toBe(false);
        expect(it.teach.length, it.cmd).toBeLessThanOrEqual(110);
      }
  });
  it("id станций уникальны, в каждой хватает команд", () => {
    expect(new Set(DRILL_UNITS.map((u) => u.id)).size).toBe(DRILL_UNITS.length);
    for (const u of DRILL_UNITS) expect(u.items.length).toBeGreaterThanOrEqual(6);
  });
});

describe("карта и сессия", () => {
  it("открыта только первая станция, следующая открывается после освоения", () => {
    const s = emptyDrill();
    expect(
      unitViews(DRILL_UNITS, s, NOW)
        .map((v) => v.status)
        .slice(0, 2),
    ).toEqual(["open", "locked"]);
    DRILL_UNITS[0].items.forEach((_, i) => applyAnswer(s, `${DRILL_UNITS[0].id}:${i}`, true, NOW));
    expect(unitViews(DRILL_UNITS, s, NOW)[1].status).toBe("open");
  });
  it("новая сессия — только из открытых станций и нужной длины", () => {
    const q = buildSession(DRILL_UNITS, emptyDrill(), 10, NOW, rand);
    expect(q).toHaveLength(10);
    expect(q.every((e) => e.key.startsWith(DRILL_UNITS[0].id + ":"))).toBe(true);
  });
  it("варианты содержат верный ответ на указанном месте", () => {
    for (let k = 0; k < 20; k++)
      for (const e of buildSession(DRILL_UNITS, emptyDrill(), 10, NOW, Math.random))
        if (e.options) expect(e.kind === "explain" ? e.teach : e.cmd).toBe(e.options[e.answer!]);
  });
  it("ошибка роняет в первую коробку, верный ответ поднимает", () => {
    const s = emptyDrill();
    applyAnswer(s, "orient:0", true, NOW);
    applyAnswer(s, "orient:0", true, NOW);
    expect(s.stats["orient:0"].box).toBe(3);
    applyAnswer(s, "orient:0", false, NOW);
    expect(s.stats["orient:0"]).toMatchObject({ box: 1, seen: 3, wrong: 1 });
  });
});

describe("серия", () => {
  it("считает дни подряд и не сгорает, пока сегодня пусто", () => {
    const s = emptyDrill();
    addToday(s, NOW - 2 * DAY);
    addToday(s, NOW - DAY);
    expect(streak(s.days, NOW)).toBe(2);
    addToday(s, NOW);
    expect(streak(s.days, NOW)).toBe(3);
    expect(streak(s.days, NOW + 3 * DAY)).toBe(0);
  });
  it("ключ дня — локальная дата", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe("2026-01-05");
  });
});

describe("синхронизация практики", () => {
  const a = { stats: { "orient:0": { seen: 3, wrong: 1, last: NOW, box: 3 } }, days: { "2026-06-10": 5 } };
  const b = {
    stats: { "orient:1": { seen: 1, wrong: 0, last: NOW, box: 2 } },
    days: { "2026-06-10": 8, "2026-06-09": 2 },
  };
  it("объединяет команды и берёт максимум упражнений за день", () => {
    const m = mergeDrill(a, b)!;
    expect(Object.keys(m.stats).sort()).toEqual(["orient:0", "orient:1"]);
    expect(m.days).toEqual({ "2026-06-10": 8, "2026-06-09": 2 });
  });
  it("коммутативно и идемпотентно", () => {
    expect(mergeDrill(a, b)).toEqual(mergeDrill(b, a));
    expect(mergeDrill(mergeDrill(a, b), b)).toEqual(mergeDrill(a, b));
    expect(mergeDrill(undefined, undefined)).toBeUndefined();
  });
  it("mergeProgress переносит практику и цель", () => {
    const base = { xp: 0, done: {}, cur: null, hints: {} };
    const m = mergeProgress(
      { ...base, updatedAt: 1, drill: a },
      { ...base, updatedAt: 2, drill: b, drillGoal: 40 },
    );
    expect(Object.keys(m.drill!.stats)).toHaveLength(2);
    expect(m.drillGoal).toBe(40);
  });
});
