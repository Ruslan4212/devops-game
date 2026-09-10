import { describe, expect, it } from "vitest";
import { EXAMS } from "../src/lessons/exams";
import { LESSONS } from "../src/lessons";
import { LessonRun } from "../src/engine/lesson-run";

describe("экзамены актов", () => {
  it("есть ровно один экзамен на каждый акт курса", () => {
    const acts = EXAMS.map((e) => e.act).sort((a, b) => a - b);
    expect(acts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it("экзамен стоит сразу после последнего урока своего акта", () => {
    for (const exam of EXAMS) {
      const ix = LESSONS.indexOf(exam);
      expect(ix, exam.id).toBeGreaterThan(0);
      expect(LESSONS[ix - 1].act, exam.id).toBe(exam.act);
      const after = LESSONS[ix + 1];
      if (after) expect(after.act, exam.id).toBe(exam.act + 1);
    }
  });

  for (const exam of EXAMS) {
    describe(exam.id, () => {
      const quizzes = exam.steps.filter((s) => s.kind === "quiz") as Extract<
        (typeof exam.steps)[number],
        { kind: "quiz" }
      >[];

      it("состоит из вопросов, обрамлённых пояснениями", () => {
        expect(quizzes.length).toBeGreaterThanOrEqual(5);
        expect(exam.steps[0].kind).toBe("say");
        expect(exam.steps[exam.steps.length - 1].kind).toBe("say");
      });

      it("сложность задана, лежит в 1..7 и не убывает", () => {
        const ds = quizzes.map((q) => q.d as number);
        for (const d of ds) {
          expect(typeof d).toBe("number");
          expect(d).toBeGreaterThanOrEqual(1);
          expect(d).toBeLessThanOrEqual(7);
        }
        expect(ds).toEqual([...ds].sort((a, b) => a - b));
      });

      it("покрывает весь диапазон сложности 1..7", () => {
        expect(new Set(quizzes.map((q) => q.d))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
      });

      it("у каждого вопроса корректный индекс ответа и непустой разбор", () => {
        for (const q of quizzes) {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          expect(q.explain.length).toBeGreaterThan(3);
        }
      });

      it("проходится автопрогоном до конца", () => {
        const run = new LessonRun(exam);
        run.autoplay();
        expect(run.finished).toBe(true);
      });
    });
  }
});
