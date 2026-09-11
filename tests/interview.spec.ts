import { describe, expect, it } from "vitest";
import { TECH_TOPICS, pickTechQuestions } from "../src/data/interview";
import { JOBS, jobTopics } from "../src/data/careers";

describe("технический банк собеседования", () => {
  it("покрывает основные темы DevOps", () => {
    const ids = TECH_TOPICS.map((t) => t.id).sort();
    expect(ids).toEqual([
      "cicd",
      "docker",
      "git",
      "iac",
      "incidents",
      "k8s",
      "linux",
      "net",
      "obs",
      "python",
      "zabbix",
    ]);
  });

  it("в каждой теме минимум 5 вопросов, все валидны", () => {
    for (const t of TECH_TOPICS) {
      expect(t.questions.length).toBeGreaterThanOrEqual(5);
      for (const q of t.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(q.why.length).toBeGreaterThan(20);
        expect(q.q.length).toBeGreaterThan(15);
      }
    }
  });

  it("правильный ответ всегда первый в списке (соглашение банка)", () => {
    for (const t of TECH_TOPICS) {
      for (const q of t.questions) expect(q.answer).toBe(0);
    }
  });

  it("pickTechQuestions берёт из указанных тем нужное число и без дублей", () => {
    let seed = 7;
    const rnd = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const got = pickTechQuestions(["docker", "k8s"], 6, rnd);
    expect(got).toHaveLength(6);
    expect(new Set(got.map((q) => q.q)).size).toBe(6);
    const dockerK8s = new Set([
      ...(TECH_TOPICS.find((t) => t.id === "docker")?.questions ?? []),
      ...(TECH_TOPICS.find((t) => t.id === "k8s")?.questions ?? []),
    ]);
    for (const q of got) expect(dockerK8s.has(q)).toBe(true);
  });

  it("неизвестная тема просто игнорируется", () => {
    expect(pickTechQuestions(["nope"], 5)).toEqual([]);
  });
});

describe("вакансии -> темы собеседования", () => {
  it("у каждой вакансии есть релевантные темы и достаточно вопросов", () => {
    for (const job of JOBS) {
      const topics = jobTopics(job);
      expect(topics.length, job.id).toBeGreaterThan(0);
      const total = topics.reduce(
        (n, id) => n + (TECH_TOPICS.find((t) => t.id === id)?.questions.length ?? 0),
        0,
      );
      expect(total, job.id).toBeGreaterThanOrEqual(job.questions);
    }
  });
});
