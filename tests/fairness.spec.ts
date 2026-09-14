import { describe, expect, it } from "vitest";
import { ACT_TO_TOPIC, JOBS, SOFT_QUESTIONS, jobTopics, pickQuestions } from "../src/data/careers";
import { TECH_TOPICS, pickTechQuestions } from "../src/data/interview";
import { LESSONS } from "../src/lessons";
import { localGrade } from "../src/engine/grader";
import type { QuizStep } from "../src/engine/types";

/**
 * Игра не имеет права спрашивать то, чему ещё не учила, и не имеет права
 * показывать человеку внутренние огрызки слов вместо нормального русского.
 * Оба правила проверяем на всём проекте сразу, а не на отдельных примерах.
 */
describe("спрашиваем только то, чему уже научили", () => {
  it("каждый технический вопрос привязан к существующему акту курса", () => {
    const acts = new Set(LESSONS.map((l) => l.act));
    for (const topic of TECH_TOPICS) {
      for (const q of topic.questions) {
        expect(Number.isInteger(q.act), `${topic.id}: «${q.q}» без акта`).toBe(true);
        expect(acts.has(q.act), `${topic.id}: акт ${q.act} не существует`).toBe(true);
      }
    }
  });

  it("каждый поведенческий вопрос тоже привязан к акту", () => {
    for (const q of SOFT_QUESTIONS) expect(Number.isInteger(q.act), `«${q.q}» без акта`).toBe(true);
  });

  it("вакансия не спрашивает ничего выше своего уровня", () => {
    for (const job of JOBS) {
      const maxAct = Math.max(...job.reqActs);
      for (const q of pickTechQuestions(jobTopics(job), 99, Math.random, maxAct)) {
        expect(q.act, `${job.name}: «${q.q}»`).toBeLessThanOrEqual(maxAct);
      }
      for (const q of pickQuestions(99, Math.random, maxAct)) {
        expect(q.act, `${job.name}: «${q.q}»`).toBeLessThanOrEqual(maxAct);
      }
    }
  });

  it("на каждой вакансии остаётся из чего собрать собеседование", () => {
    for (const job of JOBS) {
      const maxAct = Math.max(...job.reqActs);
      const available =
        pickTechQuestions(jobTopics(job), 99, Math.random, maxAct).length +
        pickQuestions(99, Math.random, maxAct).length;
      expect(available, `${job.name}: вопросов не хватает`).toBeGreaterThanOrEqual(job.questions);
    }
  });

  it("у стажёрской вакансии есть свои технические вопросы, а не только поведенческие", () => {
    const intern = JOBS.find((j) => Math.max(...j.reqActs) === 1)!;
    expect(
      pickTechQuestions(jobTopics(intern), 99, Math.random, 1).length,
      "для Акта 1 нет ни одного технического вопроса",
    ).toBeGreaterThan(0);
  });
});

describe("каждый экран с вопросами уважает прогресс игрока", () => {
  const ACTS = [...new Set(LESSONS.map((l) => l.act))].sort((a, b) => a - b);

  it("экран самопроверки на любом уровне показывает только пройденные темы", () => {
    for (const reached of ACTS) {
      for (const topic of TECH_TOPICS) {
        const shown = topic.questions.filter((q) => q.act <= reached);
        for (const q of shown) {
          expect(
            q.act,
            `акт ${reached}: показан вопрос акта ${q.act} — «${q.q.slice(0, 40)}»`,
          ).toBeLessThanOrEqual(reached);
        }
      }
    }
  });

  it("экзамен на выживание не спрашивает дальше пройденного", () => {
    for (const reached of ACTS) {
      const doneActs = ACTS.filter((a) => a <= reached);
      const topics = [...new Set(doneActs.map((a) => ACT_TO_TOPIC[a]).filter((t): t is string => !!t))];
      for (const q of pickTechQuestions(topics, 99, Math.random, reached)) {
        expect(q.act, `пройден акт ${reached}, спросили про акт ${q.act}`).toBeLessThanOrEqual(reached);
      }
    }
  });

  it("на первом же акте есть о чём спросить на всех экранах", () => {
    expect(TECH_TOPICS.flatMap((t) => t.questions).filter((q) => q.act === 1).length).toBeGreaterThan(0);
    expect(SOFT_QUESTIONS.filter((q) => q.act === 1).length).toBeGreaterThan(0);
  });
});

describe("разбор ответа написан по-человечески", () => {
  const QUIZ = LESSONS.flatMap((l) => l.steps.filter((s): s is QuizStep => s.kind === "quiz"));

  /** Слова, которые разбор перечисляет игроку — в скобках или после тире. */
  const listedWords = (feedback: string): string[] =>
    [
      /не хватает главного — ([^.]+)\./.exec(feedback)?.[1],
      /Начало верное \(([^)]+)\)/.exec(feedback)?.[1],
      /стоило упомянуть ещё: ([^.]+)\./.exec(feedback)?.[1],
      /утверждаешь наоборот — «([^»]+)»/.exec(feedback)?.[1],
    ]
      .filter((x): x is string => !!x)
      .flatMap((x) => x.split(",").map((s) => s.trim()))
      .filter(Boolean);

  it("каждое названное в разборе слово есть в тексте вопроса — обрубков не бывает", () => {
    const broken: string[] = [];
    for (const s of QUIZ) {
      const source = (s.options[s.answer] + " " + s.explain).toLowerCase().replace(/ё/g, "е");
      const r = localGrade({
        question: s.text,
        options: s.options,
        answerIx: s.answer,
        explain: s.explain,
        userAnswer: "что-то делаю руками и смотрю",
      });
      for (const word of listedWords(r.feedback)) {
        if (!source.includes(word.toLowerCase())) broken.push(`«${word}» ← ${s.text.slice(0, 45)}`);
      }
    }
    expect(broken.length, `обрубки в разборе: ${broken.slice(0, 5).join(" | ")}`).toBe(0);
  });
});
