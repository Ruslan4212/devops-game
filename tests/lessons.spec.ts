import { describe, expect, it } from "vitest";
import { LESSONS, TOTAL_XP } from "../src/lessons";
import { act01 } from "../src/lessons/act01";
import { act02 } from "../src/lessons/act02";
import { act03 } from "../src/lessons/act03";
import { act04 } from "../src/lessons/act04";
import { act05 } from "../src/lessons/act05";
import { act06 } from "../src/lessons/act06";
import { act07 } from "../src/lessons/act07";
import { act08 } from "../src/lessons/act08";
import { act09 } from "../src/lessons/act09";
import { act10 } from "../src/lessons/act10";
import { act11 } from "../src/lessons/act11";
import { RANKS, rankOf } from "../src/engine/progress";
import { LessonRun } from "../src/engine/lesson-run";

describe("каждый урок проходится до конца", () => {
  for (const lesson of LESSONS) {
    it(`${lesson.id} — ${lesson.title}`, () => {
      const run = new LessonRun(lesson);
      run.autoplay();
      expect(run.finished, `остановился на шаге ${run.position.i}/${run.position.n}`).toBe(true);
    });
  }
});

describe("переписанные вручную акты действительно ведут за руку", () => {
  for (const lesson of [
    ...act01,
    ...act02,
    ...act03,
    ...act04,
    ...act05,
    ...act06,
    ...act07,
    ...act08,
    ...act09,
    ...act10,
    ...act11,
  ]) {
    it(`${lesson.id}: есть демонстрация и повтор`, () => {
      const kinds = lesson.steps.map((s) => s.kind);
      // урок не должен быть «стеной текста»: где-то игрок обязан что-то сделать —
      // набрать команду, решить задачу или хотя бы ответить на вопрос
      const hasInteraction = kinds.includes("type") || kinds.includes("do") || kinds.includes("quiz");
      expect(hasInteraction, lesson.id).toBe(true);
      expect(kinds.includes("say") || kinds.includes("watch"), lesson.id).toBe(true);
    });

    it(`${lesson.id}: варианты в вопросах корректны`, () => {
      for (const s of lesson.steps) {
        if (s.kind === "quiz") {
          expect(s.options.length).toBeGreaterThanOrEqual(2);
          expect(s.answer).toBeGreaterThanOrEqual(0);
          expect(s.answer).toBeLessThan(s.options.length);
        }
      }
    });
  }
});

describe("целостность программы", () => {
  it("идентификаторы уроков уникальны", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("уроки идут по возрастанию актов", () => {
    const acts = LESSONS.map((l) => l.act);
    expect(acts).toEqual([...acts].sort((a, b) => a - b));
  });

  it("у каждого урока есть intro и хотя бы один шаг", () => {
    for (const l of LESSONS) {
      expect(l.intro.length, l.id).toBeGreaterThan(3);
      expect(l.steps.length, l.id).toBeGreaterThan(0);
    }
  });

  it("пройдя всё, игрок достигает верхнего ранга", () => {
    const top = RANKS[RANKS.length - 1];
    expect(TOTAL_XP).toBeGreaterThanOrEqual(top[0]);
    expect(rankOf(TOTAL_XP)).toBe(top[1]);
  });

  it("первый шаг урока никогда не «уже пройден»", () => {
    for (const l of LESSONS) {
      const run = new LessonRun(l);
      expect(run.finished, l.id).toBe(false);
    }
  });
});
