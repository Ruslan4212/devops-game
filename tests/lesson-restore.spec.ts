import { describe, expect, it } from "vitest";
import { LessonRun } from "../src/engine/lesson-run";
import { LESSONS } from "../src/lessons";

describe("LessonRun.fromState — восстановление незаконченного урока", () => {
  it("воссоздаёт мир и позицию точно там, где игрок остановился", () => {
    const lesson = LESSONS.find((l) => l.id === "1.3")!; // "Что лежит в папке" — есть setup и do-шаг
    const original = new LessonRun(lesson);
    // проходим пару шагов вручную, как это делал бы игрок
    while (original.step.kind === "say" || original.step.kind === "watch") original.ackAndAdvance();
    if (original.step.kind === "type") original.submitType(original.step.cmd);

    const snap = original.snapshot();
    expect(snap.id).toBe("1.3");
    expect(snap.actions.length).toBeGreaterThan(0);

    const restored = LessonRun.fromState(lesson, snap);
    expect(restored.stepIx).toBe(original.stepIx);
    expect(restored.attempts).toBe(original.attempts);
    expect(restored.world.log.map((l) => l.cmd)).toEqual(original.world.log.map((l) => l.cmd));
    expect(restored.world.cwd).toBe(original.world.cwd);
  });

  it("восстановленный урок можно доиграть до конца автоплеем ответов дальше по шагам", () => {
    const lesson = LESSONS.find((l) => l.id === "1.1")!;
    const original = new LessonRun(lesson);
    original.ackAndAdvance(); // say
    original.ackAndAdvance(); // say

    const restored = LessonRun.fromState(lesson, original.snapshot());
    let guard = 0;
    while (!restored.finished && guard++ < 200) {
      const s = restored.step;
      if (s.kind === "say" || s.kind === "watch") restored.ackAndAdvance();
      else if (s.kind === "type") restored.submitType(s.cmd);
      else if (s.kind === "quiz") restored.submitQuiz(s.answer);
      else if (s.kind === "do") restored.submitDo(s.answer.split("\n").pop()!);
    }
    expect(restored.finished).toBe(true);
  });
});
