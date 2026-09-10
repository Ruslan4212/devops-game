import { describe, expect, it } from "vitest";
import { MISSIONS, TOTAL_XP } from "../src/missions";
import { RANKS, rankOf } from "../src/engine/progress";
import { MissionRun } from "../src/engine/runner";

describe("каждое задание проходимо эталонным решением", () => {
  for (const m of MISSIONS) {
    it(`${m.id} — ${m.title}`, () => {
      const run = new MissionRun(m);
      run.playSolution();
      expect(run.pending).toEqual([]);
    });
  }
});

describe("подсказки ведут к цели", () => {
  it("ни одно задание нельзя закрыть, ничего не сделав", () => {
    // если задача выполнена сразу после setup, значит она ничему не учит
    for (const m of MISSIONS) {
      const run = new MissionRun(m);
      run.check();
      expect(run.complete, `${m.id} закрывается без единого действия`).toBe(false);
    }
  });
});

describe("целостность программы", () => {
  it("идентификаторы заданий уникальны", () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у каждого задания есть брифинг, шпаргалка, подсказки и решение", () => {
    for (const m of MISSIONS) {
      expect(m.why.length, m.id).toBeGreaterThan(40);
      expect(m.cheat.length, m.id).toBeGreaterThan(0);
      expect(m.hints.length, m.id).toBeGreaterThan(0);
      expect(m.objs.length, m.id).toBeGreaterThan(0);
      expect(m.solution.length, m.id).toBeGreaterThan(0);
    }
  });

  it("пройдя всё, игрок достигает верхнего ранга", () => {
    const top = RANKS[RANKS.length - 1];
    expect(TOTAL_XP).toBeGreaterThanOrEqual(top[0]);
    expect(rankOf(TOTAL_XP)).toBe(top[1]);
  });

  it("задания идут по возрастанию актов", () => {
    const acts = MISSIONS.map((m) => m.act);
    expect(acts).toEqual([...acts].sort((a, b) => a - b));
  });
});
