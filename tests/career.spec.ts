import { describe, expect, it } from "vitest";
import { JOBS, SOFT_QUESTIONS, STORY, pickQuestions } from "../src/data/careers";
import { mergeProgress } from "../src/sync/merge";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({ xp: 0, done: {}, cur: null, hints: {}, ...o });

describe("карьерный слой — данные", () => {
  it("9 вакансий, у каждой валидные требования и порог", () => {
    expect(JOBS).toHaveLength(9);
    for (const j of JOBS) {
      expect(j.reqActs.length).toBeGreaterThan(0);
      for (const a of j.reqActs) {
        expect(a).toBeGreaterThanOrEqual(1);
        expect(a).toBeLessThanOrEqual(14);
      }
      expect(j.questions).toBeGreaterThanOrEqual(3);
      expect(j.pass).toBeGreaterThan(0);
      expect(j.pass).toBeLessThanOrEqual(1);
      expect(j.intro.length).toBeGreaterThan(10);
    }
  });

  it("вакансии идут по возрастанию грейда", () => {
    const order = ["intern", "junior", "junior+", "middle-", "middle"];
    const idx = JOBS.map((j) => order.indexOf(j.grade));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it("middle-вакансии требуют капстоун", () => {
    for (const j of JOBS.filter((x) => x.grade === "middle")) expect(j.reqCapstone).toBe(true);
  });

  it("12 поведенческих вопросов с корректным индексом ответа", () => {
    expect(SOFT_QUESTIONS).toHaveLength(12);
    for (const q of SOFT_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.why.length).toBeGreaterThan(10);
    }
  });

  it("сюжетные вехи упорядочены по числу нужных уроков", () => {
    const need = STORY.map((s) => s.needLessons);
    expect(need).toEqual([...need].sort((a, b) => a - b));
    expect(STORY[0].needLessons).toBe(0);
  });

  it("pickQuestions даёт запрошенное число разных вопросов", () => {
    let seed = 42;
    const rnd = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const got = pickQuestions(7, rnd);
    expect(got).toHaveLength(7);
    expect(new Set(got.map((q) => q.q)).size).toBe(7);
    expect(pickQuestions(99, rnd)).toHaveLength(SOFT_QUESTIONS.length);
  });
});

describe("карьерный слой — слияние офферов", () => {
  it("офферы объединяются и не теряются между устройствами", () => {
    const m = mergeProgress(P({ jobs: { pelmeni: true } }), P({ jobs: { bait: true } }));
    expect(m.jobs).toEqual({ pelmeni: true, bait: true });
    expect(mergeProgress(P(), P()).jobs).toEqual({});
    const once = mergeProgress(P({ jobs: { granit: true } }), P());
    expect(mergeProgress(once, P()).jobs).toEqual({ granit: true });
  });
});
