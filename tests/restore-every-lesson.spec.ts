import { describe, expect, it } from "vitest";
import { LessonRun } from "../src/engine/lesson-run";
import { LESSONS } from "../src/lessons";
import type { DoStep, Lesson, QuizStep, TypeStep } from "../src/engine/types";

/** Один правильный ответ на текущем шаге — так же, как это делает autoplay. */
function answerCurrentStep(run: LessonRun): void {
  const s = run.step;
  if (s.kind === "say") run.ackAndAdvance();
  else if (s.kind === "watch") {
    run.runWatch();
    run.ackAndAdvance();
  } else if (s.kind === "type") run.submitType((s as TypeStep).cmd);
  else if (s.kind === "quiz") run.submitQuiz((s as QuizStep).answer);
  else {
    const d = s as DoStep;
    if (d.editFile) run.applyEdit(d.editFile, d.answer);
    else {
      const at = run.stepIx;
      // шаг может зачесться раньше последней строки ответа — дальше слать нельзя, там уже другой шаг
      for (const line of d.answer.split("\n")) {
        if (run.finished || run.stepIx !== at) break;
        run.submitDo(line);
      }
    }
  }
}

/**
 * Главная гарантия против «прохожу урок заново»: с какого бы места ни случилась
 * перезагрузка или синхронизация, восстановление обязано вернуть игрока ровно туда же.
 * Проверяем это не на паре уроков, а на каждом шаге каждого урока курса.
 */
describe("восстановление урока с любого шага — весь курс", () => {
  const playable = LESSONS.filter((l: Lesson) => !l.replay);

  it("в курсе есть чему ломаться: уроков больше двухсот", () => {
    expect(playable.length).toBeGreaterThan(200);
  });

  for (const lesson of playable) {
    it(`урок ${lesson.id} восстанавливается на каждом шаге`, () => {
      const run = new LessonRun(lesson);
      let guard = 0;
      while (!run.finished && guard++ < 400) {
        const snap = run.snapshot();
        const restored = LessonRun.fromState(lesson, snap);

        expect(restored.stepIx, `урок ${lesson.id}, шаг ${snap.stepIx}`).toBe(run.stepIx);
        expect(restored.world.cwd, `урок ${lesson.id}, шаг ${snap.stepIx}`).toBe(run.world.cwd);
        expect(restored.world.log.map((l) => l.cmd)).toEqual(run.world.log.map((l) => l.cmd));

        // восстановленный урок обязан принимать тот же правильный ответ, что и исходный
        const before = restored.stepIx;
        answerCurrentStep(restored);
        answerCurrentStep(run);
        expect(restored.stepIx, `урок ${lesson.id}: после ответа на шаге ${before}`).toBe(run.stepIx);
      }
      expect(run.finished, `урок ${lesson.id} не доигрался за 400 шагов`).toBe(true);
    });
  }
});
