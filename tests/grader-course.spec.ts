import { describe, expect, it } from "vitest";
import { localGrade } from "../src/engine/grader";
import { LESSONS } from "../src/lessons";
import type { QuizStep } from "../src/engine/types";

interface Question {
  lesson: string;
  text: string;
  options: string[];
  answer: number;
  explain: string;
}

const QUESTIONS: Question[] = LESSONS.flatMap((l) =>
  l.steps
    .filter((s): s is QuizStep => s.kind === "quiz")
    .map((s) => ({ lesson: l.id, text: s.text, options: s.options, answer: s.answer, explain: s.explain })),
);

const grade = (q: Question, userAnswer: string): boolean =>
  localGrade({ question: q.text, options: q.options, answerIx: q.answer, explain: q.explain, userAnswer })
    .correct;

/**
 * Проверка на всём материале курса, а не на выдуманных примерах: у каждого
 * вопроса есть верная формулировка и готовые заблуждения. Если проверка не
 * узнаёт верную мысль или принимает заблуждение — это видно сразу и на цифрах.
 */
describe("проверка ответов на всех вопросах курса", () => {
  it("вопросов в курсе действительно много", () => {
    expect(QUESTIONS.length).toBeGreaterThan(100);
  });

  it("верная формулировка засчитывается почти всегда", () => {
    const failed = QUESTIONS.filter((q) => !grade(q, q.options[q.answer]));
    const rate = 1 - failed.length / QUESTIONS.length;
    expect(rate, `не узнаны верные ответы: ${failed.slice(0, 5).map((q) => q.lesson)}`).toBeGreaterThan(0.97);
  });

  it("заблуждение из неверного варианта почти всегда отвергается", () => {
    let total = 0;
    let wrongly = 0;
    for (const q of QUESTIONS) {
      for (let i = 0; i < q.options.length; i++) {
        if (i === q.answer) continue;
        total++;
        if (grade(q, q.options[i])) wrongly++;
      }
    }
    expect(1 - wrongly / total, `принято заблуждений: ${wrongly} из ${total}`).toBeGreaterThan(0.9);
  });

  it("ответ не по теме не проходит ни на одном вопросе", () => {
    const junk = QUESTIONS.filter((q) => grade(q, "не знаю, наверное что-то там такое бывает"));
    expect(junk.length, `принят пустой ответ в: ${junk.slice(0, 5).map((q) => q.lesson)}`).toBe(0);
  });

  it("пустой ответ не проходит нигде", () => {
    expect(QUESTIONS.filter((q) => grade(q, "")).length).toBe(0);
  });
});
