import { describe, expect, it } from "vitest";
import { applyDeathPenalty, EXAM_ATTEMPTS, type Progress } from "../src/engine/progress";
import { LESSONS } from "../src/lessons";

const LIST = LESSONS.map((l) => ({ id: l.id, act: l.act, xp: l.xp }));

/** Прогресс игрока, дошедшего до урока `cur`: всё до него пройдено. */
const upTo = (cur: string): Progress => {
  const ix = LIST.findIndex((l) => l.id === cur);
  const done: Record<string, boolean> = {};
  let xp = 0;
  for (let i = 0; i < ix; i++) {
    done[LIST[i].id] = true;
    xp += LIST[i].xp;
  }
  return { xp, done, cur, hints: {} };
};

describe("цена проваленного экзамена растёт с каждой смертью", () => {
  it("на экзамен даётся три попытки", () => {
    expect(EXAM_ATTEMPTS).toBe(3);
  });

  it("первая смерть — откат на предыдущий урок", () => {
    const { progress, message } = applyDeathPenalty(upTo(LIST[20].id), LIST, 1);
    expect(progress.cur).toBe(LIST[19].id);
    expect(progress.done[LIST[19].id]).toBeUndefined();
    expect(progress.done[LIST[18].id]).toBe(true);
    expect(message).toContain(LIST[19].id);
  });

  it("вторая смерть — в начало предыдущего акта", () => {
    const cur = LESSONS.find((l) => l.act === 3)!.id;
    const { progress } = applyDeathPenalty(upTo(cur), LIST, 2);
    const target = LIST.find((l) => l.id === progress.cur)!;
    expect(target.act).toBe(2);
    expect(target.id).toBe(LIST.find((l) => l.act === 2)!.id);
    for (const l of LIST.filter((x) => x.act >= 2)) expect(progress.done[l.id]).toBeUndefined();
  });

  it("третья смерть — курс с нуля", () => {
    const { progress } = applyDeathPenalty(upTo(LIST[30].id), LIST, 3);
    expect(progress.xp).toBe(0);
    expect(progress.cur).toBeNull();
    expect(Object.keys(progress.done)).toHaveLength(0);
  });

  it("XP за снятые уроки вычитается — повторная сдача не накручивает опыт", () => {
    const before = upTo(LIST[20].id);
    const { progress } = applyDeathPenalty(before, LIST, 1);
    expect(progress.xp).toBe(before.xp - LIST[19].xp);
    expect(progress.xp).toBeGreaterThan(0);
  });

  it("откат обнуляет счётчик попыток и снимает пометку смерти", () => {
    const p = { ...upTo(LIST[10].id), deathPending: true, examAttempts: 3 };
    const { progress } = applyDeathPenalty(p, LIST, 1);
    expect(progress.examAttempts).toBe(0);
    expect(progress.deathPending).toBe(false);
  });

  it("кошелёк и вещи переживают даже полный сброс курса", () => {
    const p = { ...upTo(LIST[10].id), life: { money: 42_000 } as Progress["life"] };
    expect(applyDeathPenalty(p, LIST, 3).progress.life?.money).toBe(42_000);
  });

  it("смерть на самом первом уроке не ломает откат", () => {
    const { progress } = applyDeathPenalty(upTo(LIST[0].id), LIST, 1);
    expect(progress.cur).toBe(LIST[0].id);
  });
});
