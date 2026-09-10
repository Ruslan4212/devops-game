import { describe, expect, it } from "vitest";
import { LessonRun } from "../src/engine/lesson-run";
import type { Lesson } from "../src/engine/types";

/** Минимальный урок с одним «сделай»-шагом: цель — набрать ровно "pwd". */
const lesson: Lesson = {
  id: "t.1",
  act: 1,
  title: "строгий режим",
  intro: "проверка порогов подсказки и ответа",
  xp: 10,
  steps: [
    {
      kind: "do",
      text: "Набери pwd",
      check: (w) => w.log.some((l) => l.cmd === "pwd"),
      answer: "pwd",
      hint: "это компас",
    },
  ],
};

describe("обычный режим", () => {
  it("подсказка после 1 промаха, ответ после 2", () => {
    const run = new LessonRun(lesson);
    const r1 = run.submitDo("ls");
    expect(r1.status).toBe("retry");
    if (r1.status === "retry") expect(r1.feedback).toContain("Подсказка");
    expect(run.answerRevealed).toBe(false);

    const r2 = run.submitDo("ls");
    if (r2.status === "retry") expect(r2.reveal).toBe("pwd");
    expect(run.answerRevealed).toBe(true);
    expect(run.canReveal).toBe(true);
  });
});

describe("строгий режим", () => {
  it("подсказка только после 2 промахов, ответ — после 4", () => {
    const run = new LessonRun(lesson, { strict: true });
    expect(run.revealAt).toBe(4);

    const r1 = run.submitDo("ls");
    if (r1.status === "retry") expect(r1.feedback).not.toContain("Подсказка");
    expect(run.canReveal).toBe(false);

    const r2 = run.submitDo("ls");
    if (r2.status === "retry") expect(r2.feedback).toContain("Подсказка");
    expect(run.canReveal).toBe(true);
    expect(run.answerRevealed).toBe(false);

    run.submitDo("ls");
    const r4 = run.submitDo("ls");
    if (r4.status === "retry") expect(r4.reveal).toBe("pwd");
    expect(run.answerRevealed).toBe(true);
  });

  it("правильный ответ засчитывается в любом режиме", () => {
    const run = new LessonRun(lesson, { strict: true });
    const r = run.submitDo("pwd");
    expect(r.status).toBe("advance");
    expect(run.finished).toBe(true);
  });

  it("forceReveal в строгом режиме сразу поднимает счётчик до порога", () => {
    const run = new LessonRun(lesson, { strict: true });
    expect(run.forceReveal()).toBe("pwd");
    expect(run.answerRevealed).toBe(true);
  });
});
